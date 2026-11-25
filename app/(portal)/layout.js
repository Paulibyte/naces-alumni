import { requireUser, ROLE_LABELS, isFinance } from '@/lib/auth';
import { query } from '@/lib/db';
import Shell from '@/app/components/Shell';
import { getUnreadCount } from '@/lib/news';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }) {
  const user = await requireUser();
  let pendingSlips = 0;
  let pendingMembers = 0;
  if (isFinance(user)) {
    const { rows } = await query(
      `SELECT (SELECT COUNT(*) FROM payments WHERE status='pending')::int AS slips,
              (SELECT COUNT(*) FROM users WHERE status='pending')::int AS members`
    );
    pendingSlips = rows[0].slips;
    pendingMembers = rows[0].members;
  }
  const unreadNews = await getUnreadCount(user.id);
  return (
    <Shell user={user} roleLabel={ROLE_LABELS[user.role]} pendingSlips={pendingSlips} pendingMembers={pendingMembers} unreadNews={unreadNews}>
      {children}
    </Shell>
  );
}
