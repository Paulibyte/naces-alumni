import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import PostForm from '../PostForm';

export default async function NewPost() {
  await requireUser(['publicity', 'admin']);
  return (
    <div style={{ maxWidth: 820 }}>
      <div className="small"><Link href="/news/manage">← Manage posts</Link></div>
      <div className="page-head"><h1>New post</h1></div>
      <PostForm />
    </div>
  );
}
