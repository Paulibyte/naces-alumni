'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';

export default function Shell({ user, roleLabel, pendingSlips, pendingMembers, children }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const fin = user.role === 'fin_sec' || user.role === 'admin';
  const admin = user.role === 'admin';
  const L = ({ href, children: c, count }) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      style={path === href || (href !== '/dashboard' && path.startsWith(href + '/')) ? { background: 'rgba(255,255,255,0.16)' } : undefined}
    >
      {c}
      {count > 0 && <span className="count">{count}</span>}
    </Link>
  );

  return (
    <>
      <div className="mobile-top">
        <b>NACES Alumni</b>
        <button onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
      </div>
      <div className="shell">
        <aside className={`side ${open ? 'open' : ''}`}>
          <div className="brand">
            <div className="brand-badge">NACES</div>
            <div>
              <b>NACES Alumni</b>
              <span>ND 2005 · HND 2008 · FEDPONEK</span>
            </div>
          </div>
          <div className="nav-label">My account</div>
          <L href="/dashboard">Dashboard</L>
          <L href="/pay">Make a payment</L>
          <L href="/payments">My payments</L>

          {fin && (
            <>
              <div className="nav-label">Finance</div>
              <L href="/finance">Overview</L>
              <L href="/finance/confirmations" count={pendingSlips}>Confirm payments</L>
              <L href="/finance/bill">Bill members</L>
              <L href="/finance/types">Payment types</L>
              <L href="/finance/members">Member balances</L>
            </>
          )}
          {fin && (
            <>
              <div className="nav-label">Administration</div>
              <L href="/admin/members" count={pendingMembers}>Members & verification</L>
            </>
          )}

          <div className="side-foot">
            <div>{user.full_name}</div>
            <div style={{ opacity: 0.7 }}>{roleLabel}</div>
            <form action={logoutAction}>
              <button type="submit">Log out</button>
            </form>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
    </>
  );
}
