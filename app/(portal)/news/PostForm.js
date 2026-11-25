'use client';
import { useActionState, useRef, useState } from 'react';
import { savePost } from '@/app/actions/news';

export default function PostForm({ post }) {
  const [state, action, pending] = useActionState(savePost, null);
  const v = state?.values || post || {};
  const [kind, setKind] = useState(v.kind || 'announcement');
  const intent = useRef(null);
  const expires = v.expires_at ? String(v.expires_at).slice(0, 10) : '';

  return (
    <form action={action} className="card">
      {state?.error && <div className="alert error">{state.error}</div>}
      {post && <input type="hidden" name="id" value={post.id} />}
      <input type="hidden" name="intent" ref={intent} defaultValue="draft" />

      <div className="field">
        <label>Type</label>
        <div className="radio-group">
          <label><input type="radio" name="kind" value="announcement" checked={kind === 'announcement'} onChange={() => setKind('announcement')} /> Announcement</label>
          <label><input type="radio" name="kind" value="news" checked={kind === 'news'} onChange={() => setKind('news')} /> News</label>
        </div>
        <div className="hint">Announcements are official notices (meetings, deadlines, levies). News is stories about members and events.</div>
      </div>

      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" type="text" required maxLength={200} defaultValue={v.title} />
      </div>

      <div className="field">
        <label htmlFor="body">Content</label>
        <textarea id="body" name="body" required defaultValue={v.body} style={{ minHeight: 260 }} />
        <div className="hint">Leave an empty line between paragraphs. Web links become clickable.</div>
      </div>

      <div className="field">
        <label htmlFor="cover">Cover picture (optional)</label>
        {post?.cover_path && (
          <div className="row-actions" style={{ marginBottom: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/files/${post.cover_path}`} alt="" className="slip-thumb" />
            <label style={{ fontWeight: 400 }}><input type="checkbox" name="remove_cover" /> Remove current picture</label>
          </div>
        )}
        <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" />
        <div className="hint">JPG, PNG or WEBP, max 5 MB.</div>
      </div>

      <div className="grid g3" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="priority">Priority</label>
          <select id="priority" name="priority" defaultValue={v.priority || 'normal'}>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent (highlighted on dashboards)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="expires_at">Remove from feed after (optional)</label>
          <input id="expires_at" name="expires_at" type="date" defaultValue={expires} />
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <label style={{ fontWeight: 400 }}><input type="checkbox" name="pinned" defaultChecked={!!v.pinned} /> Pin to top</label>
          <label style={{ fontWeight: 400 }}><input type="checkbox" name="allow_comments" defaultChecked={v.allow_comments ?? true} /> Allow comments</label>
        </div>
      </div>

      <div className="row-actions">
        <button className="btn" disabled={pending} onClick={() => (intent.current.value = 'publish')}>
          {pending ? 'Saving…' : post?.status === 'published' ? 'Save & keep published' : 'Publish now'}
        </button>
        <button className="btn secondary" disabled={pending} onClick={() => (intent.current.value = 'draft')}>
          {post?.status === 'published' ? 'Unpublish (save as draft)' : 'Save as draft'}
        </button>
      </div>
    </form>
  );
}
