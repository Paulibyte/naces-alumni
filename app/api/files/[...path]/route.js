import fs from 'fs/promises';
import { getCurrentUser, isFinance } from '@/lib/auth';
import { resolveUpload, MIME_BY_EXT } from '@/lib/uploads';

// Serves uploaded files only to people allowed to see them.
export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Not signed in', { status: 401 });
  const parts = (await params).path;
  const rel = parts.join('/');

  if (parts[0] === 'slips') {
    const ownerId = Number(parts[1]);
    if (ownerId !== user.id && !isFinance(user)) return new Response('Forbidden', { status: 403 });
  } else if (parts[0] === 'posts') {
    // news/announcement images: any signed-in member
  } else {
    return new Response('Not found', { status: 404 });
  }

  const abs = resolveUpload(rel);
  if (!abs) return new Response('Not found', { status: 404 });
  try {
    const buf = await fs.readFile(abs);
    const ext = rel.split('.').pop().toLowerCase();
    return new Response(buf, {
      headers: {
        'Content-Type': MIME_BY_EXT[ext] || 'application/octet-stream',
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
