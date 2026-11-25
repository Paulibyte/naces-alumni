import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getPost } from '@/lib/news';
import PostForm from '../../PostForm';

export default async function EditPost({ params }) {
  await requireUser(['publicity', 'admin']);
  const post = await getPost(Number((await params).id));
  if (!post) notFound();
  return (
    <div style={{ maxWidth: 820 }}>
      <div className="small"><Link href="/news/manage">← Manage posts</Link></div>
      <div className="page-head"><h1>Edit post</h1></div>
      <PostForm post={post} />
    </div>
  );
}
