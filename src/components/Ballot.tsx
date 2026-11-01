'use client';

import { useState } from 'react';
import { Avatar } from './Avatar';
import type { Election } from '@/lib/election';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';

export function Ballot({ election }: { election: Election }) {
  const { positions, candidates, settings } = election;
  const { reload } = useSession();
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'pick' | 'confirm'>('pick');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const live = positions.filter((p) => candidates.some((c) => c.position_id === p.id));
  const picked = live.filter((p) => choices[p.id]);

  const cast = async () => {
    setBusy(true);
    setError('');
    const payload: Record<string, string> = {};
    for (const p of picked) payload[p.id] = choices[p.id];
    const { error: err } = await supabase().rpc('cast_vote', { choices: payload });
    setBusy(false);
    if (err) {
      setError(err.message);
      setStep('pick');
      return;
    }
    await reload();
    await election.reload();
  };

  if (step === 'confirm') {
    return (
      <div>
        <div className="eyebrow">Confirm</div>
        <h2 className="title-xl" style={{ fontSize: 30, margin: '6px 0 16px' }}>Your choices</h2>
        <div className="stack" style={{ gap: 10 }}>
          {live.map((p) => {
            const c = candidates.find((x) => x.id === choices[p.id]);
            return (
              <div className="summary" key={p.id}>
                <div className="muted" style={{ fontSize: 14 }}>{p.name}</div>
                <div className="display" style={{ fontWeight: 800, fontSize: 22 }}>{c ? c.name : 'No choice (skipped)'}</div>
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ margin: '16px 0 22px', fontSize: 15 }}>Once you cast your vote you cannot change it.</p>
        {error && <p role="alert" className="error" style={{ marginBottom: 12 }}>{error}</p>}
        <div className="row" style={{ gap: 12 }}>
          <button className="btn" style={{ flex: '1 1 200px', minHeight: 52 }} disabled={busy} onClick={() => void cast()}>
            {busy ? 'Casting…' : 'Cast my vote'}
          </button>
          <button className="btn ghost" style={{ flex: '1 1 140px', minHeight: 52 }} disabled={busy} onClick={() => setStep('pick')}>Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow">Official ballot</div>
      <h1 className="title-xl">{settings.title}</h1>
      <p className="muted" style={{ fontSize: 16 }}>Choose one candidate for each position. You can vote once.</p>
      {live.length === 0 && (
        <p className="muted" style={{ margin: '20px 0', padding: 16, border: '2px dashed #8c8a82', borderRadius: 12 }}>
          The ballot is not ready yet. An admin is still adding positions and candidates.
        </p>
      )}
      {live.map((p) => (
        <div key={p.id}>
          <h2 className="section-head" style={{ fontSize: 22 }}>{p.name}</h2>
          <div className="opts" role="group" aria-label={p.name}>
            {candidates.filter((c) => c.position_id === p.id).map((c) => {
              const on = choices[p.id] === c.id;
              return (
                <button type="button" key={c.id} className="opt" aria-pressed={on} onClick={() => setChoices((s) => ({ ...s, [p.id]: c.id }))}>
                  <span className="mark" aria-hidden="true">
                    {on && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    )}
                  </span>
                  <Avatar name={c.name} src={c.photo_url} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="cand-name">{c.name}</span>
                    <span className="cand-tag">{c.tagline}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button className="btn block" style={{ marginTop: 28 }} disabled={picked.length === 0} onClick={() => setStep('confirm')}>
        Review my vote
      </button>
    </div>
  );
}
