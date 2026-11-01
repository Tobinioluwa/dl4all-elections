'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Profile } from './types';

type SessionValue = {
  loading: boolean;
  signedIn: boolean;
  profile: Profile | null;
  receipt: string | null;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  const load = useCallback(async (id: string | null) => {
    if (!id) {
      setProfile(null);
      setReceipt(null);
      return;
    }
    const sb = supabase();
    const [p, b] = await Promise.all([
      sb.from('profiles').select('*').eq('id', id).maybeSingle(),
      sb.from('ballots').select('receipt').eq('voter_id', id).maybeSingle(),
    ]);
    setProfile((p.data as Profile | null) ?? null);
    setReceipt((b.data as { receipt: string } | null)?.receipt ?? null);
  }, []);

  useEffect(() => {
    const sb = supabase();
    let active = true;
    sb.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id ?? null;
      if (!active) return;
      setUserId(id);
      await load(id);
      if (active) setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      setUserId(id);
      // Defer the queries: Supabase warns against awaiting inside this callback.
      setTimeout(() => void load(id), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const value = useMemo<SessionValue>(
    () => ({
      loading,
      signedIn: !!userId,
      profile,
      receipt,
      reload: () => load(userId),
      signOut: async () => {
        await supabase().auth.signOut();
      },
    }),
    [loading, userId, profile, receipt, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
