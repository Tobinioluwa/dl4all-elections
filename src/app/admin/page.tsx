'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { PeopleAdmin } from '@/components/admin/PeopleAdmin';
import { PositionsAdmin } from '@/components/admin/PositionsAdmin';
import { SettingsAdmin } from '@/components/admin/SettingsAdmin';
import { useElection } from '@/lib/election';
import { useSession } from '@/lib/session';

export default function AdminPage() {
  const election = useElection();
  const { loading, profile } = useSession();
  const { settings } = election;

  let body: React.ReactNode;
  if (loading || election.loading) {
    body = <p className="muted">Loading…</p>;
  } else if (!profile?.is_admin) {
    body = (
      <div className="card">
        <h1 className="title-xl">Admins only</h1>
        <p className="muted" style={{ margin: '6px 0 16px' }}>Sign in with an admin account to manage the election.</p>
        <Link className="btn" href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Go to sign in</Link>
      </div>
    );
  } else {
    body = (
      <>
        <div className="eyebrow">Admin</div>
        <h1 className="title-xl">Set up the election</h1>
        <p className="muted" style={{ margin: '0 0 24px', fontSize: 16 }}>
          Add the positions and contestants, approve presidents, and open or close voting. Voters see changes straight away.
        </p>
        <SettingsAdmin election={election} />
        <PositionsAdmin election={election} />
        <PeopleAdmin />
      </>
    );
  }

  return (
    <div className="shell">
      <Header title={settings.title} votingOpen={settings.voting_open} current="admin" />
      <main className="page narrow">{body}</main>
    </div>
  );
}
