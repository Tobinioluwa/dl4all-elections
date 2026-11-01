'use client';

import { useEffect, useState } from 'react';
import type { Election } from '@/lib/election';
import { supabase } from '@/lib/supabase';

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={onChange}>
      <span className="knob" />
    </button>
  );
}

export function SettingsAdmin({ election }: { election: Election }) {
  const { settings, reload } = election;
  const [title, setTitle] = useState(settings.title);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => setTitle(settings.title), [settings.title]);

  const update = async (patch: Partial<typeof settings>) => {
    setError('');
    const { error: err } = await supabase().from('settings').update(patch).eq('id', 1);
    if (err) setError(err.message);
    await reload();
  };

  const toggleAuto = async () => {
    const on = !settings.auto_approve;
    await update({ auto_approve: on });
    if (on) {
      const { error: err } = await supabase().from('profiles').update({ status: 'approved' }).eq('status', 'pending').not('role', 'is', null);
      if (err) setError(err.message);
    }
  };

  const reset = async () => {
    const { error: err } = await supabase().rpc('reset_votes');
    if (err) setError(err.message);
    setConfirmReset(false);
    await reload();
  };

  return (
    <>
      {error && <p role="alert" className="error" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="card tight row between" style={{ gap: 16 }}>
        <div style={{ flex: '1 1 260px' }}>
          <div className="display title-md" style={{ fontSize: 22 }}>Voting is {settings.voting_open ? 'open' : 'closed'}</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>
            {settings.voting_open ? 'Voters can cast their vote now. Switch off to stop voting and freeze the results.' : 'Voters cannot vote. Switch on to let voting start or continue.'}
          </div>
        </div>
        <Switch checked={settings.voting_open} label="Voting open" onChange={() => void update({ voting_open: !settings.voting_open })} />
      </div>

      <div className="card tight row between" style={{ gap: 16 }}>
        <div style={{ flex: '1 1 260px' }}>
          <div className="display title-md" style={{ fontSize: 22 }}>Approve all at once: {settings.auto_approve ? 'on' : 'off'}</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>
            {settings.auto_approve
              ? 'New presidents are approved the moment they sign up. Anyone who was waiting was approved when this was switched on.'
              : 'Off: you approve each president by hand. Switch on to approve everyone waiting and every new sign-up at once.'}
          </div>
        </div>
        <Switch checked={settings.auto_approve} label="Approve all presidents at once" onChange={() => void toggleAuto()} />
      </div>

      <div className="card tight">
        <label className="label" htmlFor="el-title">Election name</label>
        <div className="row" style={{ marginTop: 4 }}>
          <input id="el-title" className="field" style={{ flex: '1 1 240px', width: 'auto', marginTop: 0 }} value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="btn" disabled={!title.trim() || title === settings.title} onClick={() => void update({ title: title.trim() })}>Save name</button>
        </div>
      </div>

      <div className="card tight row between">
        <div style={{ flex: '1 1 260px' }}>
          <div className="display" style={{ fontWeight: 800, fontSize: 18 }}>Reset all votes</div>
          <div className="muted" style={{ fontSize: 14 }}>Clears every count and lets everyone vote again. Use it to clear test votes before the real election.</div>
        </div>
        {confirmReset ? (
          <div className="row">
            <button className="btn danger small" onClick={() => void reset()}>Yes, reset</button>
            <button className="btn ghost small" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn danger small" onClick={() => setConfirmReset(true)}>Reset all votes</button>
        )}
      </div>
    </>
  );
}
