import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from './db';

const COOKIE = 'naces_session';
const SESSION_DAYS = 14;

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
    sha256(token),
    userId,
    expires,
  ]);
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [userId]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
  jar.delete(COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const { rows } = await query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.alumni_set, u.department, u.role, u.status
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)]
  );
  const user = rows[0];
  if (!user || user.status !== 'approved') return null;
  return user;
}

export const ROLE_LABELS = {
  member: 'Member',
  fin_sec: 'Financial Secretary',
  publicity: 'Publicity Secretary (PRO)',
  admin: 'Administrator',
};
export const isFinance = (u) => u && (u.role === 'fin_sec' || u.role === 'admin');
export const isAdmin = (u) => u && u.role === 'admin';
export const isPublisher = (u) => u && (u.role === 'publicity' || u.role === 'admin');

/** Use in pages/actions. roles: optional array of allowed roles. */
export async function requireUser(roles) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (roles && !roles.includes(user.role)) redirect('/dashboard');
  return user;
}
