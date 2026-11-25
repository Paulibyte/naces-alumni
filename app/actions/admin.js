'use server';
import { revalidatePath } from 'next/cache';
import { query, audit } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export async function setMemberStatus(formData) {
  const admin = await requireUser(['admin', 'fin_sec']);
  const id = Number(formData.get('id'));
  const status = formData.get('status');
  const note = (formData.get('note') || '').toString().trim() || null;
  if (!['approved', 'rejected', 'suspended'].includes(status)) return;
  if (id === admin.id) return; // can't change your own status
  // Only admins may suspend or touch executive accounts
  const { rows } = await query('SELECT role FROM users WHERE id = $1', [id]);
  if (!rows[0]) return;
  if (admin.role !== 'admin' && (status === 'suspended' || rows[0].role !== 'member')) return;

  await query(
    `UPDATE users SET status = $1, status_note = $2,
       approved_by = CASE WHEN $1 = 'approved' THEN $3::int ELSE approved_by END,
       approved_at = CASE WHEN $1 = 'approved' THEN now() ELSE approved_at END
     WHERE id = $4`,
    [status, note, admin.id, id]
  );
  if (status !== 'approved') await query('DELETE FROM sessions WHERE user_id = $1', [id]);
  await audit({ query }, admin.id, `member.${status}`, { member_id: id, note });
  revalidatePath('/admin/members');
}

export async function setMemberRole(formData) {
  const admin = await requireUser(['admin']);
  const id = Number(formData.get('id'));
  const role = formData.get('role');
  if (!['member', 'fin_sec', 'publicity', 'admin'].includes(role) || id === admin.id) return;
  await query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
  await audit({ query }, admin.id, 'member.role', { member_id: id, role });
  revalidatePath('/admin/members');
}

// One action per button (a clicked button's value is not sent with the form)
export async function approveMember(fd) { fd.set('status', 'approved'); return setMemberStatus(fd); }
export async function rejectMember(fd) { fd.set('status', 'rejected'); return setMemberStatus(fd); }
export async function suspendMember(fd) { fd.set('status', 'suspended'); return setMemberStatus(fd); }
