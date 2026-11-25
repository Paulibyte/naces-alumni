import Link from 'next/link';
import { requireUser, ROLE_LABELS } from '@/lib/auth';
import { query } from '@/lib/db';
import { fmtDate, SET_LABELS } from '@/lib/format';
import { StatusBadge } from '@/app/components/ui';
import { setMemberRole, approveMember, rejectMember, suspendMember } from '@/app/actions/admin';

export default async function MembersAdmin({ searchParams }) {
  const me = await requireUser(['admin', 'fin_sec']);
  const sp = await searchParams;
  const tab = sp?.tab || 'pending';
  const { rows: counts } = await query(`SELECT status, COUNT(*)::int AS n FROM users GROUP BY status`);
  const count = Object.fromEntries(counts.map((c) => [c.status, c.n]));
  const { rows } = await query(
    `SELECT u.*, a.full_name AS approver FROM users u LEFT JOIN users a ON a.id = u.approved_by
      WHERE u.status = $1 ORDER BY ${tab === 'pending' ? 'u.created_at' : 'u.full_name'}`,
    [tab]
  );
  const isAdmin = me.role === 'admin';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Members &amp; verification</h1>
          <div className="muted">Verify new registrations against the set records. Only approved members can log in.</div>
        </div>
        <div className="row-actions">
          {['pending', 'approved', 'rejected', 'suspended'].map((t) => (
            <Link key={t} href={`/admin/members?tab=${t}`} className={`btn sm ${tab === t ? '' : 'secondary'}`}>
              {t[0].toUpperCase() + t.slice(1)} ({count[t] || 0})
            </Link>
          ))}
        </div>
      </div>
      <div className="card">
        {rows.length === 0 ? <div className="empty">No {tab} members.</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Set / department</th><th>Contact</th><th>{tab === 'pending' ? 'Registered' : 'Role'}</th><th>Action</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.full_name}</b>
                      {u.matric_no && <div className="small muted">Matric: {u.matric_no}</div>}
                      {u.status_note && <div className="small muted">Note: {u.status_note}</div>}
                    </td>
                    <td className="small">{SET_LABELS[u.alumni_set]}<br />{u.department}</td>
                    <td className="small">{u.phone}<br />{u.email}</td>
                    <td className="small">
                      {tab === 'pending' ? fmtDate(u.created_at) : (
                        isAdmin && u.id !== me.id ? (
                          <form action={setMemberRole} className="row-actions">
                            <input type="hidden" name="id" value={u.id} />
                            <select name="role" defaultValue={u.role} style={{ width: 'auto' }}>
                              {Object.entries(ROLE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                            <button className="btn secondary sm">Set</button>
                          </form>
                        ) : ROLE_LABELS[u.role]
                      )}
                      {u.approver && tab === 'approved' && <div className="muted">Verified by {u.approver}</div>}
                    </td>
                    <td>
                      {u.id === me.id ? <span className="small muted">You</span> : (
                        <form className="row-actions">
                          <input type="hidden" name="id" value={u.id} />
                          {tab !== 'approved' && <input type="text" name="note" placeholder="Note (for rejection)" style={{ width: 160 }} />}
                          {tab !== 'approved' && <button className="btn sm" formAction={approveMember}>Approve</button>}
                          {tab === 'pending' && <button className="btn sm danger" formAction={rejectMember}>Reject</button>}
                          {tab === 'approved' && isAdmin && <><input type="text" name="note" placeholder="Reason" style={{ width: 130 }} /><button className="btn sm danger" formAction={suspendMember}>Suspend</button></>}
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
      {isAdmin && (
        <p className="small muted">
          Roles: <b>Financial Secretary</b> manages payment types, billing and confirmations, and can verify members. <b>Publicity Secretary (PRO)</b> publishes announcements and news and moderates comments. <b>Administrator</b> can do everything,
          including assigning roles and suspending members.
        </p>
      )}
    </>
  );
}
