'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { roleLabel, type Profile, type Status } from '@/lib/types';

const RANK: Record<Status, number> = { pending: 0, approved: 1, rejected: 2 };

export function PeopleAdmin() {
  const { profile: me } = useSession();
  const [people, setPeople] = useState<Profile[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const sb = supabase();
    const [pr, bl] = await Promise.all([
      sb.from('profiles').select('*').order('created_at'),
      sb.from('ballots').select('voter_id'),
    ]);
    if (pr.error) return setError(pr.error.message);
    setPeople((pr.data ?? []) as Profile[]);
    setVoted(new Set(((bl.data ?? []) as { voter_id: string }[]).map((b) => b.voter_id)));
  }, []);

  useEffect(() => {
    void load();
    const sb = supabase();
    const ch = sb.channel('people-live').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void load()).subscribe();
    return () => {
      void sb.removeChannel(ch);
    };
  }, [load]);

  const patch = async (id: string, values: Partial<Profile>) => {
    const { error: err } = await supabase().from('profiles').update(values).eq('id', id);
    if (err) setError(err.message);
    await load();
  };

  const presidents = people.filter((p) => p.role);
  const approved = presidents.filter((p) => p.status === 'approved').length;
  const pending = presidents.filter((p) => p.status === 'pending').length;
  const sorted = [...people].sort((a, b) => RANK[a.status] - RANK[b.status]);

  return (
    <section className="card tight">
      <h2 className="title-md" style={{ marginBottom: 4 }}>People with accounts</h2>
      <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>
        {approved} approved, {pending} waiting for approval, {voted.size} voted. Only approved state and LGA presidents can vote.
      </p>
      {error && <p role="alert" className="error" style={{ marginBottom: 12 }}>{error}</p>}
      <div className="stack" style={{ gap: 10 }}>
        {sorted.map((p) => (
          <div className="item" key={p.id}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {p.full_name}
                <span className="badge">{roleLabel(p.role, p.is_admin)}</span>
                <span className={p.status === 'approved' ? 'badge ok' : p.status === 'rejected' ? 'badge bad' : 'badge wait'}>
                  {p.status === 'pending' ? 'Pending' : p.status === 'approved' ? 'Approved' : 'Rejected'}
                </span>
                {voted.has(p.id) && <span className="badge ok">Voted</span>}
              </div>
              <div className="muted" style={{ fontSize: 14, overflowWrap: 'anywhere' }}>{p.email}</div>
              <div className="muted" style={{ fontSize: 14 }}>
                {p.role ? `${p.state ?? 'No state'} · Code ${p.state_code ?? 'none'}${p.lga ? ` · ${p.lga} LGA` : ''}` : 'Organiser account'}
              </div>
            </div>
            <div className="row">
              {p.role && p.status !== 'approved' && <button className="btn small" onClick={() => void patch(p.id, { status: 'approved' })}>Approve</button>}
              {p.role && p.status === 'pending' && <button className="btn danger small" onClick={() => void patch(p.id, { status: 'rejected' })}>Reject</button>}
              {p.id !== me?.id && (
                <button className="btn ghost small" onClick={() => void patch(p.id, { is_admin: !p.is_admin })}>
                  {p.is_admin ? 'Remove admin' : 'Make admin'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
