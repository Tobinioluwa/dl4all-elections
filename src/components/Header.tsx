'use client';

import Link from 'next/link';
import { useSession } from '@/lib/session';

export function Header({ title, votingOpen, current }: { title: string; votingOpen: boolean; current: 'vote' | 'admin' }) {
  const { profile, signedIn, signOut } = useSession();
  return (
    <header className="header">
      <Link href="/" className="brand">
        <div className="logo" aria-hidden="true">DL</div>
        <div style={{ minWidth: 0 }}>
          <div className="display" style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}>DL4All Nigeria</div>
          <div className="muted" style={{ fontSize: 13 }}>{title}</div>
        </div>
      </Link>
      <div className="header-right">
        <div className="pill">
          <span className={votingOpen ? 'dot live' : 'dot'} style={{ background: votingOpen ? 'var(--green)' : 'var(--red)' }} />
          {votingOpen ? 'Voting is open' : 'Voting is closed'}
        </div>
        {profile?.is_admin && (
          <nav className="tabs" aria-label="Sections">
            <Link href="/" className={current === 'vote' ? 'tab on' : 'tab'}>Voter</Link>
            <Link href="/admin" className={current === 'admin' ? 'tab on' : 'tab'}>Admin</Link>
          </nav>
        )}
        {signedIn && (
          <div className="row" style={{ fontSize: 14 }}>
            <strong>{profile?.full_name}</strong>
            <button type="button" className="btn ghost small" onClick={() => void signOut()}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
