import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, isPublisher, ROLE_LABELS } from '@/lib/auth';
import { getPost, getComments, markRead } from '@/lib/news';
import { fmtDate } from '@/lib/format';
import PostBody from '@/app/components/PostBody';
import CommentForm from './CommentForm';
import { deleteComment } from '@/app/actions/news';

export default async function PostPage({ params }) {
  const user = await requireUser();
  const id = Number((await params).id);
  const post = Number.isInteger(id) ? await getPost(id) : null;
  const canManage = isPublisher(user);
  if (!post || (post.status !== 'published' && !canManage)) notFound();
  if (post.status === 'published') await markRead(post.id, user.id);
  const comments = await getComments(post.id);

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="small" style={{ marginBottom: 10 }}><Link href="/news">← Announcements &amp; News</Link></div>
      {post.status !== 'published' && <div className="alert info">Draft — only the executives who publish can see this.</div>}
      <article className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {post.cover_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${post.cover_path}`} alt="" style={{ width: '100%', maxHeight: 380, objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ padding: '20px 24px' }}>
          <div className="post-meta">
            <span className={`badge ${post.kind === 'announcement' ? 'b-announce' : 'b-news'}`}>
              {post.kind === 'announcement' ? 'Announcement' : 'News'}
            </span>
            {post.priority === 'urgent' && <span className="badge b-owing">Urgent</span>}
          </div>
          <h1 style={{ margin: '6px 0' }}>{post.title}</h1>
          <div className="small muted" style={{ marginBottom: 16 }}>
            By {post.author} · {fmtDate(post.published_at || post.created_at)}
            {post.updated_at && post.published_at && new Date(post.updated_at) - new Date(post.published_at) > 60000 && ` · edited ${fmtDate(post.updated_at)}`}
          </div>
          <PostBody text={post.body} />
          {canManage && (
            <div className="row-actions" style={{ marginTop: 18 }}>
              <Link className="btn secondary sm" href={`/news/${post.id}/edit`}>Edit</Link>
              <Link className="btn secondary sm" href="/news/manage">Manage posts</Link>
            </div>
          )}
        </div>
      </article>

      {post.status === 'published' && (
        <div className="card">
          <h2>Comments ({comments.length})</h2>
          {comments.length === 0 && <p className="muted small">No comments yet.</p>}
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <div className="small">
                <b>{c.full_name}</b>
                {c.role !== 'member' && <span className="muted"> · {ROLE_LABELS[c.role]}</span>}
                <span className="muted"> · {fmtDate(c.created_at)}</span>
                {(c.user_id === user.id || canManage) && (
                  <form action={deleteComment} className="inline-form">
                    <input type="hidden" name="id" value={c.id} />
                    <button className="link-btn">Delete</button>
                  </form>
                )}
              </div>
              <PostBody text={c.body} />
            </div>
          ))}
          {post.allow_comments ? <CommentForm postId={post.id} /> : <p className="muted small">Comments are closed on this post.</p>}
        </div>
      )}
    </div>
  );
}
