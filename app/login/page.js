'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';
import { AuthHead } from '@/app/components/ui';

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <div className="auth">
      <div className="auth-card">
        <AuthHead subtitle="Members login" />
        {state?.error && <div className="alert error">{state.error}</div>}
        <form action={action}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required defaultValue={state?.email} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button className="btn block" disabled={pending}>{pending ? 'Signing in…' : 'Log in'}</button>
        </form>
        <p className="small muted" style={{ textAlign: 'center', marginTop: 16 }}>
          Not yet registered? <Link href="/register">Create your member account</Link>
        </p>
      </div>
    </div>
  );
}
