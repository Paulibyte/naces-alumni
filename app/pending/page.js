import Link from 'next/link';
import { AuthHead } from '@/app/components/ui';

export default function PendingPage() {
  return (
    <div className="auth">
      <div className="auth-card">
        <AuthHead />
        <div className="alert ok">Registration received.</div>
        <p>
          The executives will check your details against the set records. Once you are verified you can log in with the email
          and password you just chose.
        </p>
        <Link className="btn block" href="/login" style={{ textAlign: 'center' }}>Back to login</Link>
      </div>
    </div>
  );
}
