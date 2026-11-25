import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');

const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const MAX_BYTES = 5 * 1024 * 1024;

// Check real file signatures so a renamed file can't pass as an image/PDF
function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.slice(0, 5).toString() === '%PDF-') return 'application/pdf';
  return null;
}

export const hasFile = (file) => file && typeof file !== 'string' && file.size > 0;

async function store(buf, type, ...dirs) {
  const rel = path.join(...dirs, `${crypto.randomBytes(12).toString('hex')}.${ALLOWED[type]}`);
  const abs = path.join(UPLOAD_DIR, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);
  return rel.split(path.sep).join('/');
}

/** Saves an image (no PDF), e.g. a news cover. Returns e.g. "posts/ab12cd.jpg". */
export async function saveImage(file, folder) {
  if (!hasFile(file)) throw new Error('Please choose an image.');
  if (file.size > MAX_BYTES) throw new Error('Image is too large (max 5 MB).');
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || type === 'application/pdf') throw new Error('Image must be a JPG, PNG or WEBP file.');
  return store(buf, type, folder);
}

export async function removeUpload(rel) {
  const abs = rel && resolveUpload(rel);
  if (abs) await fs.unlink(abs).catch(() => {});
}

/** Saves an uploaded payment slip. Returns a relative path like "slips/12/ab12cd.jpg". */
export async function saveSlip(file, userId) {
  if (!hasFile(file)) throw new Error('Please attach your payment slip.');
  if (file.size > MAX_BYTES) throw new Error('Slip is too large (max 5 MB).');
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type) throw new Error('Slip must be a JPG, PNG, WEBP image or a PDF.');
  return store(buf, type, 'slips', String(userId));
}


export function resolveUpload(rel) {
  const abs = path.resolve(UPLOAD_DIR, rel);
  if (!abs.startsWith(UPLOAD_DIR + path.sep)) return null; // block ../ tricks
  return abs;
}

export const MIME_BY_EXT = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
