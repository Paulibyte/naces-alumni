import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getAllBalances } from '@/lib/finance';
import { money, fmtDate } from '@/lib/format';

export default async function FinanceOverview() {
  await requireUser(['fin_sec', 'admin']);
  const balances = await getAllBalances();
  const { rows: [t] } = await query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE status='confirmed'),0) AS received,
       COALESCE(SUM(amount) FILTER (WHERE status='confirmed' AND purpose='dues'),0) AS dues,
       COALESCE(SUM(amount) FILTER (WHERE status='confirmed' AND purpose='voluntary'),0) AS voluntary,
       COALESCE(SUM(amount) FILTER (WHERE status='pending'),0) AS pending_amt,
       COUNT(*) FILTER (WHERE status='pending')::int AS pending_n
     FROM payments`
  );
  const { rows: byType } = await query(
    `SELECT pt.name, SUM(a.amount) AS total
       FROM payment_allocations a JOIN charges c ON c.id=a.charge_id JOIN payment_types pt ON pt.id=c.payment_type_id
      GROUP BY pt.name
     UNION ALL
     SELECT pt.name, SUM(p.amount) FROM payments p JOIN payment_types pt ON pt.id=p.payment_type_id
      WHERE p.status='confirmed' AND p.purpose='voluntary' GROUP BY pt.name
     ORDER BY 2 DESC`
  );
  const { rows: batches } = await query(
    `SELECT b.*, pt.name AS type_name,
            COALESCE((SELECT SUM(a.amount) FROM charges c JOIN payment_allocations a ON a.charge_id=c.id
                       WHERE c.batch_id=b.id AND NOT c.voided),0) AS collected,
            COALESCE((SELECT SUM(c.amount) FROM charges c WHERE c.batch_id=b.id AND NOT c.voided),0) AS billed
       FROM billing_batches b JOIN payment_types pt ON pt.id=b.payment_type_id
      ORDER BY b.created_at DESC LIMIT 10`
  );
  const totalOutstanding = balances.reduce((s, b) => s + Math.max(0, b.outstanding), 0);
  const owing = balances.filter((b) => b.outstanding > 0).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Finance overview</h1>
          <div className="muted">Association-wide position. Only confirmed payments count as received.</div>
        </div>
        <Link href="/finance/confirmations" className="btn">Confirm payments ({t.pending_n})</Link>
      </div>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="stat good"><div className="label">Total received (confirmed)</div><div className="value">{money(t.received)}</div>
          <div className="small muted">Dues/levies {money(t.dues)} · Voluntary {money(t.voluntary)}</div></div>
        <div className="stat owe"><div className="label">Outstanding from members</div><div className="value">{money(totalOutstanding)}</div>
          <div className="small muted">{owing} of {balances.length} members owing</div></div>
        <div className="stat wait"><div className="label">Slips awaiting you</div><div className="value">{money(t.pending_amt)}</div>
          <div className="small muted">{t.pending_n} payment{t.pending_n === 1 ? '' : 's'}</div></div>
        <div className="stat"><div className="label">Verified members</div><div className="value">{balances.length}</div></div>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h2>Recent billings</h2>
          {batches.length === 0 ? <div className="empty">Nothing billed yet. <Link href="/finance/bill">Bill members</Link></div> : (
            <table>
              <thead><tr><th>Billing</th><th className="num">Collected / billed</th></tr></thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td>{b.title}<div className="small muted">{b.member_count} members · {money(b.amount)} each · {fmtDate(b.created_at)}</div></td>
                    <td className="num">{money(b.collected)}<div className="small muted">of {money(b.billed)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h2>Money received by payment type</h2>
          {byType.length === 0 ? <div className="empty">No confirmed payments yet.</div> : (
            <table><tbody>
              {byType.map((r, i) => <tr key={i}><td>{r.name}</td><td className="num">{money(r.total)}</td></tr>)}
            </tbody></table>
          )}
          <p className="small muted" style={{ marginBottom: 0 }}>Unapplied member credit is not included here until it covers a charge.</p>
        </div>
      </div>
    </>
  );
}
