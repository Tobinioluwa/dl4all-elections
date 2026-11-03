'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { STATES } from '@/lib/states';
import { useSession } from '@/lib/session';
import { roleLabel, type Profile, type Status } from '@/lib/types';

const RANK: Record<Status, number> = { pending: 0, approved: 1, rejected: 2 };

type Ballot = { voter_id: string; nullified_at: string | null };

export function PeopleAdmin() {
  const { profile: me } = useSession();
  const [people, setPeople] = useState<Profile[]>([]);
  const [ballots, setBallots] = useState<Record<string, Ballot>>({});
  const [error, setError] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [nullTarget, setNullTarget] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const sb = supabase();
    const [pr, bl] = await Promise.all([
      sb.from('profiles').select('*').order('created_at'),
      sb.from('ballots').select('voter_id, nullified_at'),
    ]);
    if (pr.error) return setError(pr.error.message);
    setPeople((pr.data ?? []) as Profile[]);
    const map: Record<string, Ballot> = {};
    for (const b of (bl.data ?? []) as Ballot[]) map[b.voter_id] = b;
    setBallots(map);
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

  const nullify = async (id: string) => {
    setError('');
    const { error: err } = await supabase().rpc('nullify_vote', { voter: id, reason });
    if (err) setError(err.message);
    setNullTarget(null);
    setReason('');
    await load();
  };

  const presidents = people.filter((p) => p.role);
  const approved = presidents.filter((p) => p.status === 'approved').length;
  const pending = presidents.filter((p) => p.status === 'pending').length;
  const all = Object.values(ballots);
  const nVoted = all.filter((b) => !b.nullified_at).length;
  const nNull = all.filter((b) => b.nullified_at).length;

  const shown = people
    .filter((p) => !stateFilter || p.state === stateFilter)
    .filter((p) => !roleFilter || p.role === roleFilter)
    .sort((a, b) => RANK[a.status] - RANK[b.status]);

  return (
    <section className="card tight">
      <h2 className="title-md" style={{ marginBottom: 4 }}>People with accounts</h2>
      <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>
        {approved} approved, {pending} waiting for approval, {nVoted} voted, {nNull} nullified. Only approved state and LGA presidents can vote.
      </p>
      {error && <p role="alert" className="error" style={{ marginBottom: 12 }}>{error}</p>}
      <div className="row" style={{ marginBottom: 14, gap: 12 }}>
        <label className="label" style={{ flex: '1 1 180px' }}>Filter by state
          <select className="field" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">All states</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="label" style={{ flex: '1 1 180px' }}>Filter by role
          <select className="field" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            <option value="state_president">State presidents</option>
            <option value="lga_president">LGA presidents</option>
          </select>
        </label>
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Showing {shown.length} of {people.length}.</p>
      <div className="stack" style={{ gap: 10 }}>
        {shown.map((p) => {
          const b = ballots[p.id];
          const missing = !!p.role && (!p.state || !p.state_code || (p.role === 'lga_president' && !p.lga));
          return (
            <div className="item" key={p.id}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>
                  {p.full_name}
                  <span className="badge">{roleLabel(p.role, p.is_admin)}</span>
                  <span className={p.status === 'approved' ? 'badge ok' : p.status === 'rejected' ? 'badge bad' : 'badge wait'}>
                    {p.status === 'pending' ? 'Pending' : p.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                  {b && !b.nullified_at && <span className="badge ok">Voted</span>}
                  {b?.nullified_at && <span className="badge bad">Vote nullified</span>}
                  {missing && <span className="badge bad">Missing state or LGA</span>}
                </div>
                <div className="muted" style={{ fontSize: 14, overflowWrap: 'anywhere' }}>{p.email}</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {p.role ? `${p.state ?? 'No state'} · Code ${p.state_code ?? 'none'}${p.lga ? ` · ${p.lga} LGA` : ''}` : 'Organiser account'}
                </div>
                {nullTarget === p.id && (
                  <div className="row" style={{ marginTop: 10 }}>
                    <input className="field" style={{ flex: '1 1 220px', width: 'auto', marginTop: 0 }} placeholder="Reason (for example: LGA could not be confirmed)" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <button className="btn danger small" onClick={() => void nullify(p.id)}>Confirm nullify</button>
                    <button className="btn ghost small" onClick={() => { setNullTarget(null); setReason(''); }}>Cancel</button>
                  </div>
                )}
              </div>
              <div className="row">
                {p.role && p.status !== 'approved' && <button className="btn small" onClick={() => void patch(p.id, { status: 'approved' })}>Approve</button>}
                {p.role && p.status === 'pending' && <button className="btn danger small" onClick={() => void patch(p.id, { status: 'rejected' })}>Reject</button>}
                {b && !b.nullified_at && nullTarget !== p.id && (
                  <button className="btn danger small" onClick={() => { setNullTarget(p.id); setReason(''); }}>Nullify vote</button>
                )}
                {p.id !== me?.id && (
                  <button className="btn ghost small" onClick={() => void patch(p.id, { is_admin: !p.is_admin })}>
                    {p.is_admin ? 'Remove admin' : 'Make admin'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
