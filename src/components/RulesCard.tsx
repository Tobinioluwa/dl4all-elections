'use client';

import { useState } from 'react';
import { RulesText } from './RulesText';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export function RulesCard() {
  const { reload } = useSession();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const accept = async () => {
    setBusy(true);
    setError('');
    const { error: err } = await supabase().rpc('accept_rules');
    setBusy(false);
    if (err) return setError(err.message);
    await reload();
  };

  return (
    <div>
      <div className="eyebrow">Before you vote</div>
      <h1 className="title-xl" style={{ fontSize: 30, marginBottom: 14 }}>Rules of the election</h1>
      <RulesText />
      <label className="choice" style={{ margin: '20px 0 14px', flex: 'none' }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        I have read and accept the rules
      </label>
      {error && <p role="alert" className="error" style={{ marginBottom: 12 }}>{error}</p>}
      <button className="btn block" disabled={!agreed || busy} onClick={() => void accept()}>
        {busy ? 'Saving…' : 'Continue to the ballot'}
      </button>
    </div>
  );
}
