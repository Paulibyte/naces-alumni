// Small shared server-renderable pieces
export function AuthHead({ subtitle }) {
  return (
    <div className="auth-head">
      <div className="brand-badge">NACES</div>
      <h1>NACES Alumni</h1>
      <p>ND 2005 &amp; HND 2008 Sets · Federal Polytechnic Nekede, Owerri</p>
      {subtitle && <p style={{ marginTop: 10, color: 'var(--ink)' }}>{subtitle}</p>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const label = { pending: 'Awaiting confirmation', confirmed: 'Confirmed', rejected: 'Rejected', approved: 'Approved', suspended: 'Suspended' }[status] || status;
  return <span className={`badge b-${status}`}>{label}</span>;
}

export function ChargeBadge({ amount, paid }) {
  if (paid >= amount) return <span className="badge b-paid">Paid</span>;
  if (paid > 0) return <span className="badge b-part">Part paid</span>;
  return <span className="badge b-owing">Owing</span>;
}
