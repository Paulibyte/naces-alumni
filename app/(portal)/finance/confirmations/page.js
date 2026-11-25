import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { money, fmtDate, METHOD_LABELS, SET_LABELS } from '@/lib/format';
import { StatusBadge } from '@/app/components/ui';
import { confirmPayment, rejectPayment, reopenPayment } from '@/app/actions/finance';

export default async function Confirmations({ searchParams }) {
  await requireUser(['fin_sec', 'admin']);
  const sp = await searchParams;
  const { rows: pending } = await query(
    `SELECT p.*, u.full_name, u.phone, u.alumni_set, pt.name AS type_name,
            (SELECT string_agg(c.description, '; ') FROM payment_targets t JOIN charges c ON c.id=t.charge_id WHERE t.payment_id=p.id) AS targets
       FROM payments p JOIN users u ON u.id=p.user_id LEFT JOIN payment_types pt ON pt.id=p.payment_type_id
      WHERE p.status='pending' ORDER BY p.created_at`
  );
  const { rows: recent } = await query(
    `SELECT p.*, u.full_name, pt.name AS type_name, r.full_name AS reviewer
       FROM payments p JOIN users u ON u.id=p.user_id LEFT JOIN payment_types pt ON pt.id=p.payment_type_id
       LEFT JOIN users r ON r.id=p.reviewed_by
      WHERE p.status<>'pending' ORDER BY p.reviewed_at DESC NULLS LAST LIMIT 25`
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Confirm payments</h1>
          <div className="muted">Check each slip against the bank statement before confirming. Confirmed money is applied to the member&apos;s balance immediately.</div>
        </div>
      </div>
      {sp?.error && <div className="alert error">{sp.error}</div>}

      {pending.length === 0 && <div className="card empty">No slips waiting. All caught up.</div>}
      {pending.map((p) => {
        const isPdf = p.slip_path?.endsWith('.pdf');
        return (
          <div className="card" key={p.id}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <a href={`/api/files/${p.slip_path}`} target="_blank" style={{ flexShrink: 0 }}>
                {isPdf ? (
                  <div className="slip-thumb" style={{ display: 'grid', placeItems: 'center', width: 110, height: 110 }}>PDF</div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${p.slip_path}`} alt="Payment slip" className="slip-thumb" style={{ width: 110, height: 110 }} />
                )}
                <div className="small" style={{ textAlign: 'center' }}>Open slip</div>
              </a>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <b>{p.full_name}</b> <span className="small muted">· {SET_LABELS[p.alumni_set]} · {p.phone}</span>
                    <div className="small muted">Paid {fmtDate(p.paid_on)} by {METHOD_LABELS[p.method]}{p.reference ? ` · Ref ${p.reference}` : ''} · submitted {fmtDate(p.created_at)}</div>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{money(p.amount)}</div>
                </div>
                <div style={{ margin: '8px 0' }}>
                  For: <b>{p.purpose === 'dues' ? 'Dues & levies' : p.type_name}</b>
                  {p.targets && <div className="small muted">Member selected: {p.targets}</div>}
                  {p.member_note && <div className="small">Member&apos;s note: “{p.member_note}”</div>}
                </div>
                <form className="row-actions">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="text" name="review_note" placeholder="Note to member (required when rejecting)" style={{ flex: 1, minWidth: 200 }} />
                  <button className="btn sm" formAction={confirmPayment}>Confirm</button>
                  <button className="btn sm danger" formAction={rejectPayment}>Reject</button>
                </form>
              </div>
            </div>
          </div>
        );
      })}

      <div className="card">
        <h2>Recently reviewed</h2>
        {recent.length === 0 ? <div className="empty">Nothing reviewed yet.</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>For</th><th className="num">Amount</th><th>Status</th><th>By</th><th></th></tr></thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td>{p.full_name}<div className="small muted">Paid {fmtDate(p.paid_on)}</div></td>
                    <td>{p.purpose === 'dues' ? 'Dues & levies' : p.type_name}{p.review_note && <div className="small muted">{p.review_note}</div>}</td>
                    <td className="num">{money(p.amount)}</td>
                    <td><StatusBadge status={p.status} />{p.recorded_by && <div className="small muted">Recorded in person</div>}</td>
                    <td className="small muted">{p.reviewer}<br />{fmtDate(p.reviewed_at)}</td>
                    <td>
                      {p.slip_path && <a className="small" href={`/api/files/${p.slip_path}`} target="_blank">Slip</a>}
                      {!p.recorded_by && (
                        <form action={reopenPayment} className="inline-form">
                          <input type="hidden" name="id" value={p.id} />
                          <button className="btn secondary sm" style={{ marginLeft: 6 }} title="Send back to pending if this was a mistake">Undo</button>
                        </form>
                      )}
                    </td>
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
