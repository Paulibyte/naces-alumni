'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { query, audit } from '@/lib/db';
import { requireUser, isPublisher } from '@/lib/auth';
import { saveImage, removeUpload, hasFile } from '@/lib/uploads';

const PUB = ['publicity', 'admin'];
const str = (v) => (v == null ? '' : String(v).trim());

function revalidateNews(id) {
  ['/news', '/news/manage', '/dashboard'].forEach((p) => revalidatePath(p));
  if (id) revalidatePath(`/news/${id}`);
  revalidatePath('/', 'layout'); // sidebar unread count
}

export async function savePost(_prev, formData) {
  const user = await requireUser(PUB);
  const id = Number(formData.get('id')) || null;
  const kind = str(formData.get('kind'));
  const title = str(formData.get('title'));
  const body = str(formData.get('body'));
  const priority = str(formData.get('priority')) === 'urgent' ? 'urgent' : 'normal';
  const pinned = formData.get('pinned') === 'on';
  const allowComments = formData.get('allow_comments') === 'on';
  const expiresAt = str(formData.get('expires_at')) || null;
  const publish = str(formData.get('intent')) === 'publish';
  const removeCover = formData.get('remove_cover') === 'on';
  const cover = formData.get('cover');
  const values = { kind, title, body, priority, pinned, allow_comments: allowComments, expires_at: expiresAt };

  if (!['announcement', 'news'].includes(kind)) return { error: 'Choose Announcement or News.', values };
  if (title.length < 3) return { error: 'Give it a title.', values };
  if (title.length > 200) return { error: 'Title is too long (200 characters max).', values };
  if (body.length < 5) return { error: 'Write the content.', values };
  if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return { error: 'Invalid expiry date.', values };

  let existing = null;
  if (id) {
    const { rows } = await query('SELECT * FROM posts WHERE id = $1', [id]);
    existing = rows[0];
    if (!existing) return { error: 'Post not found.', values };
  }

  let coverPath = existing?.cover_path || null;
  if (hasFile(cover)) {
    try {
      const saved = await saveImage(cover, 'posts');
      if (coverPath) await removeUpload(coverPath);
      coverPath = saved;
    } catch (e) {
      return { error: e.message, values };
    }
  } else if (removeCover && coverPath) {
    await removeUpload(coverPath);
    coverPath = null;
  }

  // Publishing keeps the original date if it was already published
  const status = publish ? 'published' : 'draft';
  let postId = id;
  if (id) {
    await query(
      `UPDATE posts SET kind=$1, title=$2, body=$3, cover_path=$4, priority=$5, pinned=$6, allow_comments=$7,
              expires_at=$8, status=$9,
              published_at = CASE WHEN $9 = 'published' THEN COALESCE(published_at, now()) ELSE published_at END,
              updated_at = now()
        WHERE id=$10`,
      [kind, title, body, coverPath, priority, pinned, allowComments, expiresAt, status, id]
    );
  } else {
    const { rows } = await query(
      `INSERT INTO posts (kind, title, body, cover_path, priority, pinned, allow_comments, expires_at, status, published_at, author_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CASE WHEN $9 = 'published' THEN now() END, $10) RETURNING id`,
      [kind, title, body, coverPath, priority, pinned, allowComments, expiresAt, status, user.id]
    );
    postId = rows[0].id;
  }
  // The author has obviously "read" their own post
  if (status === 'published') {
    await query('INSERT INTO post_reads (post_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [postId, user.id]);
  }
  await audit({ query }, user.id, id ? 'post.update' : 'post.create', { post_id: postId, title, status });
  revalidateNews(postId);
  redirect(status === 'published' ? `/news/${postId}` : `/news/manage?saved=draft`);
}

export async function setPostStatus(formData) {
  const user = await requireUser(PUB);
  const id = Number(formData.get('id'));
  const status = str(formData.get('status'));
  if (!['draft', 'published'].includes(status)) return;
  await query(
    `UPDATE posts SET status=$1, published_at = CASE WHEN $1='published' THEN COALESCE(published_at, now()) ELSE published_at END,
            updated_at=now() WHERE id=$2`,
    [status, id]
  );
  await audit({ query }, user.id, `post.${status}`, { post_id: id });
  revalidateNews(id);
}
export async function publishPost(fd) { fd.set('status', 'published'); return setPostStatus(fd); }
export async function unpublishPost(fd) { fd.set('status', 'draft'); return setPostStatus(fd); }

export async function togglePin(formData) {
  const user = await requireUser(PUB);
  const id = Number(formData.get('id'));
  await query('UPDATE posts SET pinned = NOT pinned WHERE id = $1', [id]);
  await audit({ query }, user.id, 'post.pin', { post_id: id });
  revalidateNews(id);
}

export async function deletePost(formData) {
  const user = await requireUser(PUB);
  const id = Number(formData.get('id'));
  const { rows } = await query('DELETE FROM posts WHERE id = $1 RETURNING title, cover_path', [id]);
  if (rows[0]?.cover_path) await removeUpload(rows[0].cover_path);
  if (rows[0]) await audit({ query }, user.id, 'post.delete', { post_id: id, title: rows[0].title });
  revalidateNews();
  redirect('/news/manage?deleted=1');
}

/* ---------------- Comments ---------------- */

export async function addComment(_prev, formData) {
  const user = await requireUser();
  const postId = Number(formData.get('post_id'));
  const body = str(formData.get('body'));
  if (!body) return { error: 'Write something first.' };
  if (body.length > 2000) return { error: 'Comment is too long (2000 characters max).' };
  const { rows } = await query(
    `SELECT allow_comments FROM posts WHERE id = $1 AND status = 'published'`,
    [postId]
  );
  if (!rows[0]) return { error: 'This post is no longer available.' };
  if (!rows[0].allow_comments) return { error: 'Comments are closed on this post.' };
  await query('INSERT INTO post_comments (post_id, user_id, body) VALUES ($1,$2,$3)', [postId, user.id, body]);
  revalidatePath(`/news/${postId}`);
  revalidatePath('/news');
  return { ok: true, at: Date.now() };
}

export async function deleteComment(formData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  const { rows } = await query('SELECT user_id, post_id FROM post_comments WHERE id = $1', [id]);
  const c = rows[0];
  if (!c) return;
  if (c.user_id !== user.id && !isPublisher(user)) return; // own comment, or moderator
  await query('DELETE FROM post_comments WHERE id = $1', [id]);
  if (c.user_id !== user.id) await audit({ query }, user.id, 'comment.delete', { comment_id: id, post_id: c.post_id });
  revalidatePath(`/news/${c.post_id}`);
}
