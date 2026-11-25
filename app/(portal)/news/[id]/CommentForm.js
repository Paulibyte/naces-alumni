'use client';
import { useActionState, useEffect, useRef } from 'react';
import { addComment } from '@/app/actions/news';

export default function CommentForm({ postId }) {
  const [state, action, pending] = useActionState(addComment, null);
  const ref = useRef(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={action} ref={ref} style={{ marginTop: 14 }}>
      {state?.error && <div className="alert error">{state.error}</div>}
      <input type="hidden" name="post_id" value={postId} />
      <textarea name="body" placeholder="Write a comment…" required maxLength={2000} />
      <button className="btn sm" style={{ marginTop: 8 }} disabled={pending}>{pending ? 'Posting…' : 'Post comment'}</button>
    </form>
  );
}
