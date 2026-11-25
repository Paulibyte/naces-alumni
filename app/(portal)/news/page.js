import Link from 'next/link';
import { requireUser, isPublisher } from '@/lib/auth';
import { getFeed, excerpt } from '@/lib/news';
import { fmtDate } from '@/lib/format';

export default async function NewsFeed({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = ['announcement', 'news'].includes(sp?.tab) ? sp.tab : null;
  const posts = await getFeed(user.id, tab);
  const tabs = [
    [null, 'All'],
    ['announcement', 'Announcements'],
    ['news', 'News'],
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Announcements &amp; News</h1>
          <div className="muted">Official notices from the executives and news about our members.</div>
        </div>
        {isPublisher(user) && (
          <div className="row-actions">
            <Link href="/news/manage" className="btn secondary">Manage posts</Link>
            <Link href="/news/new" className="btn">New post</Link>
          </div>
        )}
      </div>

      <div className="row-actions" style={{ marginBottom: 16 }}>
        {tabs.map(([k, l]) => (
          <Link key={l} href={k ? `/news?tab=${k}` : '/news'} className={`btn sm ${tab === k ? '' : 'secondary'}`}>{l}</Link>
        ))}
      </div>

      {posts.length === 0 && <div className="card empty">Nothing posted yet.</div>}

      <div className="feed">
        {posts.map((p) => (
          <Link key={p.id} href={`/news/${p.id}`} className={`post-card ${p.priority === 'urgent' ? 'urgent' : ''} ${p.is_read ? '' : 'unread'}`}>
            {p.cover_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${p.cover_path}`} alt="" className="post-cover" />
            )}
            <div className="post-card-body">
              <div className="post-meta">
                <span className={`badge ${p.kind === 'announcement' ? 'b-announce' : 'b-news'}`}>
                  {p.kind === 'announcement' ? 'Announcement' : 'News'}
                </span>
                {p.priority === 'urgent' && <span className="badge b-owing">Urgent</span>}
                {p.pinned && <span className="badge b-neutral">Pinned</span>}
                {!p.is_read && <span className="badge b-pending">New</span>}
              </div>
              <h2 className="post-title">{p.title}</h2>
              <p className="muted" style={{ margin: '4px 0 8px' }}>{excerpt(p.body)}</p>
              <div className="small muted">
                {p.author} · {fmtDate(p.published_at)}
                {p.comments > 0 && ` · ${p.comments} comment${p.comments === 1 ? '' : 's'}`}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
