import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { publishPost, unpublishPost, togglePin, deletePost } from '@/app/actions/news';

export default async function ManagePosts({ searchParams }) {
  await requireUser(['publicity', 'admin']);
  const sp = await searchParams;
  const { rows: posts } = await query(
    `SELECT p.*, u.full_name AS author,
            (SELECT COUNT(*) FROM post_reads r JOIN users m ON m.id = r.user_id AND m.status='approved' WHERE r.post_id = p.id)::int AS reads,
            (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id)::int AS comments
       FROM posts p LEFT JOIN users u ON u.id = p.author_id
      ORDER BY (p.status = 'draft') DESC, p.pinned DESC, COALESCE(p.published_at, p.created_at) DESC`
  );
  const { rows: [{ members }] } = await query(`SELECT COUNT(*)::int AS members FROM users WHERE status='approved'`);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Manage posts</h1>
          <div className="muted">Drafts, published posts, and how many members have opened each one.</div>
        </div>
        <Link href="/news/new" className="btn">New post</Link>
      </div>
      {sp?.saved === 'draft' && <div className="alert ok">Saved as draft. Members can&apos;t see it until you publish.</div>}
      {sp?.deleted && <div className="alert ok">Post deleted.</div>}
      <div className="card">
        {posts.length === 0 ? <div className="empty">No posts yet. <Link href="/news/new">Write the first one</Link></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Post</th><th>Status</th><th>Seen by</th><th>Actions</th></tr></thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/news/${p.id}`}><b>{p.title}</b></Link>
                      <div className="small muted">
                        {p.kind === 'announcement' ? 'Announcement' : 'News'}{p.priority === 'urgent' ? ' · Urgent' : ''}{p.pinned ? ' · Pinned' : ''}
                        {' · '}{p.author} · {fmtDate(p.published_at || p.created_at)}
                        {p.expires_at && ` · until ${fmtDate(String(p.expires_at).slice(0, 10))}`}
                      </div>
                    </td>
                    <td>
                      {p.status === 'published' ? <span className="badge b-confirmed">Published</span> : <span className="badge b-neutral">Draft</span>}
                    </td>
                    <td className="small">
                      {p.status === 'published' ? `${p.reads} of ${members}` : '—'}
                      {p.comments > 0 && <div className="muted">{p.comments} comments</div>}
                    </td>
                    <td>
                      <form className="row-actions">
                        <input type="hidden" name="id" value={p.id} />
                        <Link className="btn secondary sm" href={`/news/${p.id}/edit`}>Edit</Link>
                        {p.status === 'published'
                          ? <button className="btn secondary sm" formAction={unpublishPost}>Unpublish</button>
                          : <button className="btn sm" formAction={publishPost}>Publish</button>}
                        <button className="btn secondary sm" formAction={togglePin}>{p.pinned ? 'Unpin' : 'Pin'}</button>
                        <details className="small">
                          <summary className="muted">Delete</summary>
                          <button className="btn danger sm" formAction={deletePost} style={{ marginTop: 4 }}>Delete permanently</button>
                        </details>
                      </form>
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
