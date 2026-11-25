import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getAllBalances } from '@/lib/finance';
import { money, SET_LABELS } from '@/lib/format';

export default async function MemberBalances({ searchParams }) {
  await requireUser(['fin_sec', 'admin']);
  const sp = await searchParams;
  const show = sp?.show || 'all';
  let rows = await getAllBalances();
  if (show === 'owing') rows = rows.filter((r) => r.outstanding > 0);
  if (show === 'clear') rows = rows.filter((r) => r.outstanding <= 0);
  rows.sort((a, b) => b.outstanding - a.outstanding || a.full_name.localeCompare(b.full_name));
  const total = rows.reduce((s, r) => s + Math.max(0, r.outstanding), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Member balances</h1>
          <div className="muted">Who owes what. Open a member to see their statement or record a cash payment.</div>
        </div>
        <div className="row-actions">
          {[['all', 'All'], ['owing', 'Owing'], ['clear', 'Up to date']].map(([k, l]) => (
            <Link key={k} href={`/finance/members?show=${k}`} className={`btn sm ${show === k ? '' : 'secondary'}`}>{l}</Link>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Member</th><th>Set</th><th>Phone</th><th className="num">Billed</th><th className="num">Paid</th><th className="num">Owes</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/finance/members/${r.id}`}>{r.full_name}</Link>{r.pending > 0 && <span className="badge b-pending" style={{ marginLeft: 6 }}>{r.pending} pending</span>}</td>
                  <td className="small">{SET_LABELS[r.alumni_set]}</td>
                  <td className="small">{r.phone}</td>
                  <td className="num">{money(r.charged)}</td>
                  <td className="num">{money(r.paid)}</td>
                  <td className="num">{r.outstanding > 0 ? <b style={{ color: 'var(--red)' }}>{money(r.outstanding)}</b> : <span className="badge b-paid">Up to date</span>}</td>
                  <td><Link className="btn secondary sm" href={`/finance/members/${r.id}`}>Open</Link></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="empty">No members in this view.</td></tr>}
            </tbody>
            <tfoot><tr><td colSpan={5}>Total outstanding (this view)</td><td className="num">{money(total)}</td><td></td></tr></tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
