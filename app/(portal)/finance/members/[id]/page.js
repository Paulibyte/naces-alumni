import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getStanding } from '@/lib/finance';
import { money, fmtDate, SET_LABELS, METHOD_LABELS } from '@/lib/format';
import { ChargeBadge, StatusBadge } from '@/app/components/ui';
import { voidCharge } from '@/app/actions/finance';
import RecordPaymentForm from './RecordPaymentForm';

export default async function MemberStatement({ params }) {
  await requireUser(['fin_sec', 'admin']);
  const id = Number((await params).id);
  const { rows: [m] } = await query('SELECT * FROM users WHERE id = $1', [id]);
  if (!m) notFound();
  const s = await getStanding(id);
  const { rows: payments } = await query(
    `SELECT p.*, pt.name AS type_name FROM payments p LEFT JOIN payment_types pt ON pt.id=p.payment_type_id
      WHERE p.user_id=$1 ORDER BY p.paid_on DESC, p.id DESC`,
    [id]
  );
  const { rows: voluntaryTypes } = await query(`SELECT id, name FROM payment_types WHERE active AND billing='voluntary' ORDER BY name`);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="small"><Link href="/finance/members">← Member balances</Link></div>
          <h1>{m.full_name}</h1>
          <div className="muted">{SET_LABELS[m.alumni_set]} · {m.department} · {m.phone} · {m.email}</div>
        </div>
      </div>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className={`stat ${s.outstanding > 0 ? 'owe' : 'good'}`}><div className="label">Owes</div><div className="value">{money(s.outstanding)}</div></div>
        <div className="stat"><div className="label">Total billed</div><div className="value">{money(s.totalCharged)}</div></div>
        <div className="stat good"><div className="label">Dues paid</div><div className="value">{money(s.duesPaid)}</div>{s.credit > 0 && <div className="small muted">Credit {money(s.credit)}</div>}</div>
        <div className="stat"><div className="label">Voluntary paid</div><div className="value">{money(s.voluntaryPaid)}</div></div>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h2>Charges</h2>
          {s.items.length === 0 ? <div className="empty">No charges.</div> : (
            <table>
              <tbody>
                {s.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.description}<div className="small muted">{fmtDate(i.due_date || i.created_at)}</div></td>
                    <td className="num">{money(i.amount)}<div className="small muted">paid {money(i.paid)}</div></td>
                    <td>
                      <ChargeBadge amount={i.amount} paid={i.paid} />
                      <details className="small" style={{ marginTop: 4 }}>
                        <summary className="muted">Void</summary>
                        <form action={voidCharge} style={{ marginTop: 4 }}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="text" name="reason" placeholder="Reason" required style={{ marginBottom: 4 }} />
                          <button className="btn danger sm">Void charge</button>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="small muted" style={{ marginBottom: 0 }}>Voiding removes a charge billed in error. Any money applied to it moves to the member&apos;s other charges or credit.</p>
        </div>
        <div className="card">
          <h2>Record a payment received in person</h2>
          <RecordPaymentForm userId={id} voluntaryTypes={voluntaryTypes} />
        </div>
      </div>

      <div className="card">
        <h2>Payments</h2>
        {payments.length === 0 ? <div className="empty">No payments.</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>For</th><th>Method</th><th className="num">Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.paid_on)}</td>
                    <td>{p.purpose === 'dues' ? 'Dues & levies' : p.type_name}{p.review_note && <div className="small muted">{p.review_note}</div>}</td>
                    <td className="small">{METHOD_LABELS[p.method]}{p.reference ? ` · ${p.reference}` : ''}</td>
                    <td className="num">{money(p.amount)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>{p.slip_path && <a className="small" href={`/api/files/${p.slip_path}`} target="_blank">Slip</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
