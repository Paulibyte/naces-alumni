'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { query, withTransaction, audit } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { reallocateMember } from '@/lib/finance';
import { saveSlip } from '@/lib/uploads';
import { money, periodLabel, round2 } from '@/lib/format';

const FIN = ['fin_sec', 'admin'];
const str = (v) => (v == null ? '' : String(v).trim());
const amountOf = (v) => {
  const n = round2(parseFloat(str(v).replace(/,/g, '')));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const today = () => new Date().toISOString().slice(0, 10);

function revalidateFinance() {
  ['/dashboard', '/payments', '/finance', '/finance/confirmations', '/finance/members', '/finance/bill', '/finance/types'].forEach(
    (p) => revalidatePath(p)
  );
}

/* ---------------- Payment types (Fin Sec) ---------------- */

export async function savePaymentType(_prev, formData) {
  const user = await requireUser(FIN);
  const id = Number(formData.get('id')) || null;
  const name = str(formData.get('name'));
  const category = str(formData.get('category'));
  const billing = str(formData.get('billing'));
  const description = str(formData.get('description')) || null;
  const rawAmt = str(formData.get('default_amount'));
  const default_amount = rawAmt ? amountOf(rawAmt) : null;
  const active = formData.get('active') !== 'false';

  if (name.length < 2) return { error: 'Give the payment type a name.' };
  if (!['monthly_due', 'levy', 'contribution', 'donation', 'other'].includes(category)) return { error: 'Choose a category.' };
  if (!['monthly', 'one_off', 'voluntary'].includes(billing)) return { error: 'Choose how it is billed.' };
  if (rawAmt && !default_amount) return { error: 'Default amount must be a positive number.' };
  if (billing === 'monthly' && !default_amount) return { error: 'Monthly payment types need a monthly amount.' };

  if (id) {
    await query(
      `UPDATE payment_types SET name=$1, category=$2, billing=$3, default_amount=$4, description=$5, active=$6 WHERE id=$7`,
      [name, category, billing, default_amount, description, active, id]
    );
  } else {
    await query(
      `INSERT INTO payment_types (name, category, billing, default_amount, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [name, category, billing, default_amount, description, user.id]
    );
  }
  await audit({ query }, user.id, id ? 'payment_type.update' : 'payment_type.create', { id, name, billing, default_amount });
  revalidateFinance();
  return { ok: id ? 'Payment type updated.' : 'Payment type added.' };
}

/* ---------------- Billing members (Fin Sec) ---------------- */

export async function billMembers(_prev, formData) {
  const user = await requireUser(FIN);
  const typeId = Number(formData.get('payment_type_id'));
  const amount = amountOf(formData.get('amount'));
  const period = str(formData.get('period')) || null; // YYYY-MM for monthly
  const dueDate = str(formData.get('due_date')) || null;
  const note = str(formData.get('title'));
  const scope = str(formData.get('scope')); // all | selected
  const selected = formData.getAll('members').map(Number).filter(Boolean);

  const { rows: [type] } = await query('SELECT * FROM payment_types WHERE id = $1 AND active', [typeId]);
  if (!type) return { error: 'Choose an active payment type.' };
  if (type.billing === 'voluntary') return { error: `${type.name} is voluntary — members pay it directly, it is not billed.` };
  if (!amount) return { error: 'Enter the amount each member owes.' };
  if (type.billing === 'monthly' && !/^\d{4}-\d{2}$/.test(period || '')) return { error: 'Choose the month being billed.' };
  if (scope === 'selected' && selected.length === 0) return { error: 'Tick at least one member, or bill all members.' };

  const title =
    type.billing === 'monthly' ? `${type.name} – ${periodLabel(period)}` : note ? `${type.name} – ${note}` : type.name;

  const result = await withTransaction(async (db) => {
    const { rows: members } = await db.query(
      scope === 'selected'
        ? `SELECT id FROM users WHERE status='approved' AND id = ANY($1::int[])`
        : `SELECT id FROM users WHERE status='approved'`,
      scope === 'selected' ? [selected] : []
    );
    const { rows: [batch] } = await db.query(
      `INSERT INTO billing_batches (payment_type_id, title, amount, period, due_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [type.id, title, amount, type.billing === 'monthly' ? period : null, dueDate, user.id]
    );
    let billed = 0;
    let skipped = 0;
    for (const m of members) {
      const r = await db.query(
        `INSERT INTO charges (user_id, payment_type_id, batch_id, amount, period, description, due_date, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (user_id, payment_type_id, period) WHERE period IS NOT NULL AND NOT voided DO NOTHING`,
        [m.id, type.id, batch.id, amount, type.billing === 'monthly' ? period : null, title, dueDate, user.id]
      );
      if (r.rowCount) {
        billed++;
        await reallocateMember(db, m.id); // existing credit covers the new charge automatically
      } else skipped++;
    }
    if (billed === 0) throw new Error(`NOTHING_BILLED:${skipped}`);
    await db.query('UPDATE billing_batches SET member_count = $1 WHERE id = $2', [billed, batch.id]);
    await audit(db, user.id, 'billing.create', { batch_id: batch.id, title, amount, billed, skipped });
    return { billed, skipped };
  }).catch((e) => {
    if (String(e.message).startsWith('NOTHING_BILLED')) return { none: true };
    throw e;
  });

  if (result.none) return { error: `Nobody was billed — every selected member has already been billed for ${title}.` };
  revalidateFinance();
  return {
    ok: `Billed ${result.billed} member${result.billed === 1 ? '' : 's'} ${money(amount)} for ${title}.${
      result.skipped ? ` ${result.skipped} already billed for this month were skipped.` : ''
    }`,
  };
}

export async function voidCharge(formData) {
  const user = await requireUser(FIN);
  const id = Number(formData.get('id'));
  const reason = str(formData.get('reason')) || 'Voided by Financial Secretary';
  await withTransaction(async (db) => {
    const { rows: [c] } = await db.query('UPDATE charges SET voided = true, void_reason = $1 WHERE id = $2 AND NOT voided RETURNING user_id', [
      reason,
      id,
    ]);
    if (!c) return;
    await reallocateMember(db, c.user_id);
    await audit(db, user.id, 'charge.void', { charge_id: id, reason });
  });
  revalidateFinance();
  revalidatePath('/finance/members/[id]', 'page');
}

/* ---------------- Member submits a payment with slip ---------------- */

export async function submitPayment(_prev, formData) {
  const user = await requireUser();
  const purpose = str(formData.get('purpose'));
  const amount = amountOf(formData.get('amount'));
  const paidOn = str(formData.get('paid_on'));
  const reference = str(formData.get('reference')) || null;
  const memberNote = str(formData.get('member_note')) || null;
  const method = str(formData.get('method')) || 'bank_transfer';
  const targets = formData.getAll('charges').map(Number).filter(Boolean);
  const typeId = Number(formData.get('payment_type_id')) || null;

  if (!['dues', 'voluntary'].includes(purpose)) return { error: 'Choose what you are paying for.' };
  if (!amount) return { error: 'Enter the amount you paid.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || paidOn > today()) return { error: 'Enter the date you paid (not in the future).' };
  if (!['bank_transfer', 'pos', 'other'].includes(method)) return { error: 'Choose how you paid.' };

  if (purpose === 'voluntary') {
    const { rows } = await query(`SELECT 1 FROM payment_types WHERE id=$1 AND active AND billing='voluntary'`, [typeId]);
    if (!rows.length) return { error: 'Choose the contribution or donation you are paying.' };
  }
  if (purpose === 'dues' && targets.length) {
    const { rows } = await query('SELECT COUNT(*)::int AS n FROM charges WHERE user_id=$1 AND id = ANY($2::int[]) AND NOT voided', [
      user.id,
      targets,
    ]);
    if (rows[0].n !== targets.length) return { error: 'One of the selected items is no longer valid. Refresh and try again.' };
  }

  let slipPath;
  try {
    slipPath = await saveSlip(formData.get('slip'), user.id);
  } catch (e) {
    return { error: e.message };
  }

  await withTransaction(async (db) => {
    const { rows: [p] } = await db.query(
      `INSERT INTO payments (user_id, purpose, payment_type_id, amount, paid_on, method, reference, slip_path, member_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [user.id, purpose, purpose === 'voluntary' ? typeId : null, amount, paidOn, method, reference, slipPath, memberNote]
    );
    for (const cid of purpose === 'dues' ? targets : []) {
      await db.query('INSERT INTO payment_targets (payment_id, charge_id) VALUES ($1,$2)', [p.id, cid]);
    }
    await audit(db, user.id, 'payment.submit', { payment_id: p.id, amount, purpose });
  });
  revalidateFinance();
  redirect('/payments?submitted=1');
}

/* ---------------- Fin Sec confirms / rejects ---------------- */

export async function reviewPayment(formData) {
  const user = await requireUser(FIN);
  const id = Number(formData.get('id'));
  const decision = str(formData.get('decision'));
  const note = str(formData.get('review_note')) || null;
  if (!['confirmed', 'rejected'].includes(decision)) return;
  if (decision === 'rejected' && !note) {
    redirect(`/finance/confirmations?error=${encodeURIComponent('Give the member a reason when rejecting a payment.')}`);
  }
  await withTransaction(async (db) => {
    const { rows: [p] } = await db.query(
      `UPDATE payments SET status=$1, review_note=$2, reviewed_by=$3, reviewed_at=now()
        WHERE id=$4 AND status='pending' RETURNING user_id, amount`,
      [decision, note, user.id, id]
    );
    if (!p) return; // already reviewed by someone else
    await reallocateMember(db, p.user_id);
    await audit(db, user.id, `payment.${decision}`, { payment_id: id, amount: p.amount, note });
  });
  revalidateFinance();
}

/** Fin Sec can reverse a confirmation made in error (goes back to pending). */
export async function reopenPayment(formData) {
  const user = await requireUser(FIN);
  const id = Number(formData.get('id'));
  await withTransaction(async (db) => {
    const { rows: [p] } = await db.query(
      `UPDATE payments SET status='pending', reviewed_by=NULL, reviewed_at=NULL, review_note=NULL
        WHERE id=$1 AND status <> 'pending' RETURNING user_id`,
      [id]
    );
    if (!p) return;
    await reallocateMember(db, p.user_id);
    await audit(db, user.id, 'payment.reopen', { payment_id: id });
  });
  revalidateFinance();
}

/** Fin Sec records a cash/POS payment received in person — confirmed immediately. */
export async function recordPayment(_prev, formData) {
  const user = await requireUser(FIN);
  const memberId = Number(formData.get('user_id'));
  const purpose = str(formData.get('purpose'));
  const amount = amountOf(formData.get('amount'));
  const paidOn = str(formData.get('paid_on'));
  const method = str(formData.get('method')) || 'cash';
  const typeId = Number(formData.get('payment_type_id')) || null;
  const note = str(formData.get('review_note')) || null;

  if (!['dues', 'voluntary'].includes(purpose)) return { error: 'Choose what the payment is for.' };
  if (!amount) return { error: 'Enter the amount received.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || paidOn > today()) return { error: 'Enter the date received.' };
  if (purpose === 'voluntary' && !typeId) return { error: 'Choose the contribution or donation type.' };

  await withTransaction(async (db) => {
    const { rows: [p] } = await db.query(
      `INSERT INTO payments (user_id, purpose, payment_type_id, amount, paid_on, method, status, reviewed_by, reviewed_at, review_note, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,'confirmed',$7,now(),$8,$7) RETURNING id`,
      [memberId, purpose, purpose === 'voluntary' ? typeId : null, amount, paidOn, method, user.id, note]
    );
    await reallocateMember(db, memberId);
    await audit(db, user.id, 'payment.record', { payment_id: p.id, member_id: memberId, amount, method });
  });
  revalidateFinance();
  revalidatePath(`/finance/members/${memberId}`);
  return { ok: `Recorded ${money(amount)} for this member.` };
}

// One action per button (a clicked button's value is not sent with the form)
export async function confirmPayment(fd) { fd.set('decision', 'confirmed'); return reviewPayment(fd); }
export async function rejectPayment(fd) { fd.set('decision', 'rejected'); return reviewPayment(fd); }
