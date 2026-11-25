'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction } from '@/app/actions/auth';
import { AuthHead } from '@/app/components/ui';

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, null);
  const d = state?.data || {};
  return (
    <div className="auth">
      <div className="auth-card wide">
        <AuthHead subtitle="Register — your account will be verified by the executives before you can log in" />
        {state?.error && <div className="alert error">{state.error}</div>}
        <form action={action}>
          <div className="field">
            <label htmlFor="full_name">Full name</label>
            <input id="full_name" name="full_name" type="text" required defaultValue={d.full_name} placeholder="Surname first, as known in school" />
          </div>
          <div className="grid g2" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required defaultValue={d.email} />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone (WhatsApp)</label>
              <input id="phone" name="phone" type="tel" required defaultValue={d.phone} placeholder="080…" />
            </div>
          </div>
          <div className="field">
            <label>Your set</label>
            <div className="radio-group">
              {[
                ['ND2005', 'ND 2005'],
                ['HND2008', 'HND 2008'],
                ['BOTH', 'Both ND 2005 & HND 2008'],
              ].map(([v, l]) => (
                <label key={v}>
                  <input type="radio" name="alumni_set" value={v} required defaultChecked={d.alumni_set === v} /> {l}
                </label>
              ))}
            </div>
          </div>
          <div className="grid g2" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="department">Department</label>
              <input id="department" name="department" type="text" required defaultValue={d.department} placeholder="e.g. Civil Engineering Technology" />
            </div>
            <div className="field">
              <label htmlFor="matric_no">Matric / Reg. number (optional)</label>
              <input id="matric_no" name="matric_no" type="text" defaultValue={d.matric_no} />
              <div className="hint">Helps the executives verify you faster.</div>
            </div>
          </div>
          <div className="grid g2" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
            </div>
          </div>
          <button className="btn block" disabled={pending}>{pending ? 'Submitting…' : 'Register'}</button>
        </form>
        <p className="small muted" style={{ textAlign: 'center', marginTop: 16 }}>
          Already verified? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
