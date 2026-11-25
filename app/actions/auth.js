'use server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { createSession, destroySession } from '@/lib/auth';

const clean = (v) => (typeof v === 'string' ? v.trim() : '');

export async function registerAction(_prev, formData) {
  const data = {
    full_name: clean(formData.get('full_name')),
    email: clean(formData.get('email')).toLowerCase(),
    phone: clean(formData.get('phone')),
    alumni_set: clean(formData.get('alumni_set')),
    department: clean(formData.get('department')),
    matric_no: clean(formData.get('matric_no')),
  };
  const password = formData.get('password') || '';
  const confirm = formData.get('confirm') || '';

  if (data.full_name.length < 3) return { error: 'Enter your full name.', data };
  if (!/^\S+@\S+\.\S+$/.test(data.email)) return { error: 'Enter a valid email address.', data };
  if (!/^[0-9+\s-]{7,20}$/.test(data.phone)) return { error: 'Enter a valid phone number.', data };
  if (!['ND2005', 'HND2008', 'BOTH'].includes(data.alumni_set)) return { error: 'Choose your set.', data };
  if (!data.department) return { error: 'Enter your department.', data };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.', data };
  if (password !== confirm) return { error: 'Passwords do not match.', data };

  const exists = await query('SELECT 1 FROM users WHERE lower(email) = $1', [data.email]);
  if (exists.rowCount) return { error: 'An account with this email already exists. Try logging in.', data };

  const hash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO users (full_name, email, phone, alumni_set, department, matric_no, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [data.full_name, data.email, data.phone, data.alumni_set, data.department, data.matric_no || null, hash]
  );
  redirect('/pending');
}

export async function loginAction(_prev, formData) {
  const email = clean(formData.get('email')).toLowerCase();
  const password = formData.get('password') || '';
  const { rows } = await query('SELECT id, password_hash, status, status_note FROM users WHERE lower(email) = $1', [
    email,
  ]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return { error: 'Incorrect email or password.', email };
  if (user.status === 'pending')
    return { error: 'Your registration is awaiting verification by the executives. You will be able to log in once approved.', email };
  if (user.status === 'rejected')
    return { error: `Your registration was not approved${user.status_note ? `: ${user.status_note}` : '.'}`, email };
  if (user.status === 'suspended') return { error: 'Your account is suspended. Please contact the executives.', email };

  await createSession(user.id);
  redirect('/dashboard');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
