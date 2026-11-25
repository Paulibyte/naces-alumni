import { query } from './db';
import { round2 } from './format';

/**
 * Recompute how a member's confirmed dues payments are applied to their charges.
 * Rules (deterministic, so the books can always be rebuilt):
 *   1. Payments are processed oldest first (paid_on, then id).
 *   2. Each payment first covers the charges the member ticked when paying.
 *   3. Anything left goes to the member's oldest unpaid charges.
 *   4. Money still left over stays as credit and covers future charges automatically.
 * Must be called inside a transaction (db = transaction client).
 */
export async function reallocateMember(db, userId) {
  await db.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
  await db.query(
    'DELETE FROM payment_allocations WHERE payment_id IN (SELECT id FROM payments WHERE user_id = $1)',
    [userId]
  );
  const { rows: charges } = await db.query(
    `SELECT id, amount FROM charges WHERE user_id = $1 AND NOT voided
      ORDER BY COALESCE(due_date, created_at::date), id`,
    [userId]
  );
  const { rows: payments } = await db.query(
    `SELECT p.id, p.amount, COALESCE(array_agg(t.charge_id) FILTER (WHERE t.charge_id IS NOT NULL), '{}') AS targets
       FROM payments p LEFT JOIN payment_targets t ON t.payment_id = p.id
      WHERE p.user_id = $1 AND p.purpose = 'dues' AND p.status = 'confirmed'
      GROUP BY p.id ORDER BY p.paid_on, p.id`,
    [userId]
  );
  const remaining = new Map(charges.map((c) => [c.id, c.amount]));
  const order = charges.map((c) => c.id);

  for (const p of payments) {
    let left = p.amount;
    const apply = (chargeId) => {
      const due = remaining.get(chargeId) || 0;
      if (left <= 0 || due <= 0) return null;
      const amt = round2(Math.min(due, left));
      remaining.set(chargeId, round2(due - amt));
      left = round2(left - amt);
      return amt;
    };
    const allocs = new Map();
    const add = (cid, amt) => amt && allocs.set(cid, round2((allocs.get(cid) || 0) + amt));
    for (const cid of p.targets) add(cid, apply(cid));
    for (const cid of order) add(cid, apply(cid));
    for (const [cid, amt] of allocs) {
      await db.query('INSERT INTO payment_allocations (payment_id, charge_id, amount) VALUES ($1, $2, $3)', [
        p.id,
        cid,
        amt,
      ]);
    }
  }
}

/** Financial standing for one member: totals + itemised charges. */
export async function getStanding(userId) {
  const { rows: items } = await query(
    `SELECT c.id, c.description, c.period, c.due_date, c.amount, c.created_at,
            pt.name AS type_name, pt.category,
            COALESCE(SUM(a.amount), 0) AS paid
       FROM charges c
       JOIN payment_types pt ON pt.id = c.payment_type_id
       LEFT JOIN payment_allocations a ON a.charge_id = c.id
      WHERE c.user_id = $1 AND NOT c.voided
      GROUP BY c.id, pt.name, pt.category
      ORDER BY COALESCE(c.due_date, c.created_at::date) DESC, c.id DESC`,
    [userId]
  );
  for (const i of items) i.balance = round2(i.amount - i.paid);

  const { rows: [p] } = await query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE purpose='dues' AND status='confirmed'), 0) AS dues_paid,
       COALESCE(SUM(amount) FILTER (WHERE purpose='voluntary' AND status='confirmed'), 0) AS voluntary_paid,
       COALESCE(SUM(amount) FILTER (WHERE status='pending'), 0) AS pending_amount,
       COUNT(*) FILTER (WHERE status='pending') AS pending_count
     FROM payments WHERE user_id = $1`,
    [userId]
  );
  const totalCharged = round2(items.reduce((s, i) => s + i.amount, 0));
  const allocated = round2(items.reduce((s, i) => s + i.paid, 0));
  const outstanding = round2(items.reduce((s, i) => s + i.balance, 0));
  const credit = round2(p.dues_paid - allocated);

  // Outstanding grouped by payment type, for the "what makes up my balance" view
  const byType = {};
  for (const i of items) {
    if (i.balance <= 0) continue;
    byType[i.type_name] = round2((byType[i.type_name] || 0) + i.balance);
  }

  return {
    items,
    unpaid: items.filter((i) => i.balance > 0).reverse(), // oldest first
    totalCharged,
    duesPaid: p.dues_paid,
    voluntaryPaid: p.voluntary_paid,
    pendingAmount: p.pending_amount,
    pendingCount: Number(p.pending_count),
    outstanding,
    credit,
    byType,
  };
}

/** Outstanding balance for every approved member (Fin Sec member list). */
export async function getAllBalances() {
  const { rows } = await query(
    `WITH ch AS (
        SELECT c.user_id, SUM(c.amount) AS charged
          FROM charges c WHERE NOT c.voided GROUP BY c.user_id),
      al AS (
        SELECT c.user_id, SUM(a.amount) AS allocated
          FROM payment_allocations a JOIN charges c ON c.id = a.charge_id
         WHERE NOT c.voided GROUP BY c.user_id),
      pd AS (
        SELECT user_id,
               SUM(amount) FILTER (WHERE status='confirmed') AS paid,
               COUNT(*) FILTER (WHERE status='pending') AS pending
          FROM payments GROUP BY user_id)
     SELECT u.id, u.full_name, u.email, u.phone, u.alumni_set, u.role,
            COALESCE(ch.charged,0) AS charged,
            COALESCE(ch.charged,0) - COALESCE(al.allocated,0) AS outstanding,
            COALESCE(pd.paid,0) AS paid,
            COALESCE(pd.pending,0)::int AS pending
       FROM users u
       LEFT JOIN ch ON ch.user_id = u.id
       LEFT JOIN al ON al.user_id = u.id
       LEFT JOIN pd ON pd.user_id = u.id
      WHERE u.status = 'approved'
      ORDER BY u.full_name`
  );
  return rows;
}
