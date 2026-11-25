import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { money, fmtDate, METHOD_LABELS } from '@/lib/format';
import { StatusBadge } from '@/app/components/ui';

export default async function MyPayments({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { rows } = await query(
    `SELECT p.*, pt.name AS type_name,
            (SELECT string_agg(c.description || ' (' || to_char(a.amount, 'FM999,999,990.00') || ')', '; ')
               FROM payment_allocations a JOIN charges c ON c.id = a.charge_id WHERE a.payment_id = p.id) AS applied_to
       FROM payments p LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
      WHERE p.user_id = $1 ORDER BY p.paid_on DESC, p.id DESC`,
    [user.id]
  );
  return (
    <>
      <div className="page-head">
        <div>
          <h1>My payments</h1>
          <div className="muted">Every payment you have submitted, and how confirmed money was applied.</div>
        </div>
      </div>
      {sp?.submitted && <div className="alert ok">Payment submitted. The Financial Secretary will check your slip and confirm it.</div>}
      <div className="card">
        {rows.length === 0 ? (
          <div className="empty">No payments yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date paid</th><th>For</th><th className="num">Amount</th><th>Status</th><th>Slip</th></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.paid_on)}<div className="small muted">{METHOD_LABELS[p.method]}{p.reference ? ` · ${p.reference}` : ''}</div></td>
                    <td>
                      {p.purpose === 'dues' ? 'Dues & levies' : p.type_name}
                      {p.applied_to && <div className="small muted">Applied to: {p.applied_to}</div>}
                      {p.status === 'confirmed' && p.purpose === 'dues' && !p.applied_to && (
                        <div className="small muted">Held as credit for future dues</div>
                      )}
                      {p.review_note && <div className="small" style={{ color: p.status === 'rejected' ? 'var(--red)' : 'var(--muted)' }}>Fin Sec: {p.review_note}</div>}
                    </td>
                    <td className="num">{money(p.amount)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>{p.slip_path ? <a href={`/api/files/${p.slip_path}`} target="_blank">View</a> : <span className="muted small">Recorded by Fin Sec</span>}</td>
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
