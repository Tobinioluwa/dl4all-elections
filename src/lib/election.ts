'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Candidate, Position, Settings } from './types';

const DEFAULT_SETTINGS: Settings = { title: 'Executive Council Election', voting_open: false, auto_approve: false };

/** Election data plus a live subscription: results update the moment a vote is counted. */
export function useElection() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const [s, p, c, v] = await Promise.all([
      sb.from('settings').select('title, voting_open, auto_approve').eq('id', 1).maybeSingle(),
      sb.from('positions').select('*').order('sort').order('created_at'),
      sb.from('candidates').select('*').order('sort').order('created_at'),
      sb.from('vote_counts').select('candidate_id, votes'),
    ]);
    const failed = s.error || p.error || c.error || v.error;
    if (failed) {
      setError(failed.message);
    } else {
      setError(null);
      if (s.data) setSettings(s.data as Settings);
      setPositions((p.data ?? []) as Position[]);
      setCandidates((c.data ?? []) as Candidate[]);
      const map: Record<string, number> = {};
      for (const row of (v.data ?? []) as { candidate_id: string; votes: number }[]) map[row.candidate_id] = row.votes;
      setCounts(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const sb = supabase();
    void load();
    const channel = sb
      .channel('election-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vote_counts' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => void load())
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [load]);

  return { settings, positions, candidates, counts, loading, error, reload: load };
}

export type Election = ReturnType<typeof useElection>;
