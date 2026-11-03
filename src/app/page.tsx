'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/AuthCard';
import { Ballot } from '@/components/Ballot';
import { Header } from '@/components/Header';
import { Results } from '@/components/Results';
import { RulesCard } from '@/components/RulesCard';
import { useElection } from '@/lib/election';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

function Panel({ title, children, icon }: { title: string; children: React.ReactNode; icon?: boolean }) {
  return (
    <div>
      {icon && <div className="avatar" style={{ width: 56, height: 56 }} aria-hidden="true">·</div>}
      <h2 className="title-xl" style={{ fontSize: 30, margin: icon ? '18px 0 6px' : '0 0 6px' }}>{title}</h2>
      <p className="muted" style={{ fontSize: 16 }}>{children}</p>
    </div>
  );
}

export default function Home() {
  const election = useElection();
  const { loading, signedIn, profile, receipt, nullified } = useSession();
  const [anyAccounts, setAnyAccounts] = useState(true);

  useEffect(() => {
    void supabase().rpc('has_accounts').then(({ data }) => setAnyAccounts(data !== false));
  }, [signedIn]);

  const { settings } = election;
  const eligible = !!profile && profile.status === 'approved' && !!profile.role;

  let left: React.ReactNode;
  if (loading || election.loading) {
    left = <p className="muted">Loading…</p>;
  } else if (election.error) {
    left = <p role="alert" className="error">Could not load the election: {election.error}</p>;
  } else if (!signedIn || !profile) {
    left = <AuthCard autoApprove={settings.auto_approve} firstAccount={!anyAccounts} />;
  } else if (profile.status === 'pending') {
    left = <Panel icon title="Waiting for approval">Thank you for signing up. An admin must confirm that you are a president before you can vote. Come back and sign in again once you are approved.</Panel>;
  } else if (profile.status === 'rejected') {
    left = <Panel title="Not approved">An admin could not confirm your details, so you cannot vote. Contact the DL4All Nigeria office if you think this is a mistake.</Panel>;
  } else if (!eligible) {
    left = (
      <div>
        <Panel title="Admin account">This account manages the election and does not vote.</Panel>
        <Link className="btn" href="/admin" style={{ display: 'inline-flex', alignItems: 'center', marginTop: 16, textDecoration: 'none' }}>Open admin</Link>
      </div>
    );
  } else if (receipt && nullified) {
    left = (
      <Panel title="Your vote was nullified">
        An admin nullified your vote under the election rules{nullified.reason ? `: ${nullified.reason}` : ''}. It is not counted in the results and you cannot vote again. <Link href="/rules">Read the rules</Link>.
      </Panel>
    );
  } else if (receipt) {
    left = (
      <div>
        <h2 className="title-xl" style={{ fontSize: 32 }}>Your vote is in</h2>
        <p className="muted" style={{ margin: '6px 0 20px', fontSize: 16 }}>Thank you for voting. The results on this page include your vote.</p>
        <div className="receipt">
          <div className="muted" style={{ fontSize: 13 }}>Your receipt code</div>
          <div className="display" style={{ fontWeight: 700, fontSize: 26, letterSpacing: '.08em', marginTop: 2 }}>{receipt}</div>
        </div>
        <p className="muted" style={{ marginTop: 18, fontSize: 14 }}>Each account can vote once. Your choices are secret.</p>
      </div>
    );
  } else if (!settings.voting_open) {
    left = <Panel title="Voting is closed">Voting is not open right now. You can still follow the results on this page.</Panel>;
  } else if (!profile.rules_accepted_at) {
    left = <RulesCard />;
  } else {
    left = <Ballot election={election} />;
  }

  return (
    <div className="shell">
      <Header title={settings.title} votingOpen={settings.voting_open} current="vote" />
      <main className="page cols">
        <section className="col card">{left}</section>
        <div className="col"><Results election={election} /></div>
      </main>
    </div>
  );
}
