import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getStanding } from '@/lib/finance';
import { query } from '@/lib/db';
import { money, fmtDate, SET_LABELS } from '@/lib/format';
import { ChargeBadge, StatusBadge } from '@/app/components/ui';

export default async function Dashboard() {
  const user = await requireUser();
  const s = await getStanding(user.id);
  const { rows: recent } = await query(
    `SELECT p.*, pt.name AS type_name FROM payments p LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
      WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 5`,
    [user.id]
  );
  const first = user.full_name.split(' ').slice(-1)[0];
  const standingGood = s.outstanding <= 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Welcome, {first}</h1>
          <div className="muted">{SET_LABELS[user.alumni_set]} set · {user.department || 'FEDPONEK'}</div>
        </div>
        <Link href="/pay" className="btn">Make a payment</Link>
      </div>

      <div className={`alert ${standingGood ? 'ok' : 'error'}`}>
        {standingGood
          ? s.credit > 0
            ? `You are financially up to date, with ${money(s.credit)} in credit toward future dues.`
            : 'You are financially up to date. Thank you!'
          : `You currently owe ${money(s.outstanding)}. The breakdown below shows what makes up this amount.`}
      </div>

      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className={`stat ${standingGood ? 'good' : 'owe'}`}>
          <div className="label">Amount owed</div>
          <div className="value">{money(s.outstanding)}</div>
        </div>
        <div className="stat">
          <div className="label">Total billed to date</div>
          <div className="value">{money(s.totalCharged)}</div>
        </div>
        <div className="stat good">
          <div className="label">Confirmed dues &amp; levies paid</div>
          <div className="value">{money(s.duesPaid)}</div>
          {s.voluntaryPaid > 0 && <div className="small muted">+ {money(s.voluntaryPaid)} contributions/donations</div>}
        </div>
        <div className="stat wait">
          <div className="label">Awaiting confirmation</div>
          <div className="value">{money(s.pendingAmount)}</div>
          <div className="small muted">{s.pendingCount} slip{s.pendingCount === 1 ? '' : 's'} with the Fin Sec</div>
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h2>What makes up what I owe</h2>
          {s.unpaid.length === 0 ? (
            <div className="empty">Nothing outstanding.</div>
          ) : (
            <>
              {Object.keys(s.byType).length > 1 && (
                <div className="small muted" style={{ marginBottom: 10 }}>
                  {Object.entries(s.byType)
                    .map(([k, v]) => `${k}: ${money(v)}`)
                    .join(' · ')}
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Item</th><th className="num">Billed</th><th className="num">Paid</th><th className="num">Balance</th></tr>
                  </thead>
                  <tbody>
                    {s.unpaid.map((i) => (
                      <tr key={i.id}>
                        <td>
                          {i.description}
                          <div className="small muted">{i.due_date ? `Due ${fmtDate(i.due_date)}` : `Billed ${fmtDate(i.created_at)}`}</div>
                        </td>
                        <td className="num">{money(i.amount)}</td>
                        <td className="num">{money(i.paid)}</td>
                        <td className="num"><b>{money(i.balance)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={3}>Total owed</td><td className="num">{money(s.outstanding)}</td></tr>
                  </tfoot>
                </table>
              </div>
              {s.pendingCount > 0 && (
                <p className="small muted">Payments awaiting confirmation are not deducted until the Financial Secretary confirms them.</p>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h2>Recent payments</h2>
          {recent.length === 0 ? (
            <div className="empty">No payments yet.</div>
          ) : (
            <table>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.purpose === 'dues' ? 'Dues & levies' : p.type_name}
                      <div className="small muted">Paid {fmtDate(p.paid_on)}</div>
                      {p.status === 'rejected' && p.review_note && <div className="small" style={{ color: 'var(--red)' }}>{p.review_note}</div>}
                    </td>
                    <td className="num">{money(p.amount)}<div><StatusBadge status={p.status} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="small" style={{ marginBottom: 0 }}><Link href="/payments">See full payment history →</Link></p>
        </div>
      </div>

      <div className="card">
        <h2>Full statement of charges</h2>
        {s.items.length === 0 ? (
          <div className="empty">You have not been billed for anything yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Item</th><th>Type</th><th>Date</th><th className="num">Billed</th><th className="num">Paid</th><th>Status</th></tr>
              </thead>
              <tbody>
                {s.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.description}</td>
                    <td className="muted">{i.type_name}</td>
                    <td className="muted">{fmtDate(i.due_date || i.created_at)}</td>
                    <td className="num">{money(i.amount)}</td>
                    <td className="num">{money(i.paid)}</td>
                    <td><ChargeBadge amount={i.amount} paid={i.paid} /></td>
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
