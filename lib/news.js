import { query } from './db';

// A post is visible on the feed when published and not past its expiry date
const LIVE = `p.status = 'published' AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)`;

export async function getFeed(userId, kind, { limit = 50 } = {}) {
  const { rows } = await query(
    `SELECT p.id, p.kind, p.title, p.body, p.cover_path, p.priority, p.pinned, p.published_at, p.expires_at,
            u.full_name AS author, (r.user_id IS NOT NULL) AS is_read,
            (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id)::int AS comments
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       LEFT JOIN post_reads r ON r.post_id = p.id AND r.user_id = $1
      WHERE ${LIVE} AND ($2::text IS NULL OR p.kind = $2)
      ORDER BY p.pinned DESC, p.published_at DESC
      LIMIT $3`,
    [userId, kind || null, limit]
  );
  return rows;
}

/** Unread posts from the last 30 days (older ones never nag new members). */
export async function getUnreadCount(userId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM posts p
      WHERE ${LIVE} AND p.published_at > now() - interval '30 days'
        AND NOT EXISTS (SELECT 1 FROM post_reads r WHERE r.post_id = p.id AND r.user_id = $1)`,
    [userId]
  );
  return rows[0].n;
}

export async function getPost(id) {
  const { rows } = await query(
    `SELECT p.*, u.full_name AS author FROM posts p LEFT JOIN users u ON u.id = p.author_id WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function markRead(postId, userId) {
  await query('INSERT INTO post_reads (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [postId, userId]);
}

export async function getComments(postId) {
  const { rows } = await query(
    `SELECT c.id, c.body, c.created_at, c.user_id, u.full_name, u.role
       FROM post_comments c JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1 ORDER BY c.created_at`,
    [postId]
  );
  return rows;
}

/** Plain-text excerpt for cards */
export function excerpt(body, n = 180) {
  const t = body.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n).replace(/\s\S*$/, '') + '…' : t;
}
