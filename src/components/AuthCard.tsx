'use client';

import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { STATES } from '@/lib/states';
import type { Role } from '@/lib/types';

export function AuthCard({ autoApprove, firstAccount }: { autoApprove: boolean; firstAccount: boolean }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [lga, setLga] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const up = mode === 'up';
  const askPresident = up && !firstAccount;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const mail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError('Enter a valid email address.');
    if (up) {
      if (!name.trim()) return setError('Enter your full name.');
      if (askPresident) {
        if (!state) return setError('Choose your state.');
        if (!code.trim()) return setError('Enter your state code.');
        if (!role) return setError('Choose State president or LGA president.');
        if (role === 'lga_president' && !lga.trim()) return setError('Enter your local government area.');
      }
      if (pw.length < 8) return setError('Your password needs at least 8 characters.');
    } else if (!pw) {
      return setError('Enter your password.');
    }

    setBusy(true);
    try {
      const sb = supabase();
      if (up) {
        const { data, error: err } = await sb.auth.signUp({
          email: mail,
          password: pw,
          options: {
            data: {
              full_name: name.trim(),
              state,
              state_code: code.trim(),
              role: askPresident ? role : '',
              lga: role === 'lga_president' ? lga.trim() : '',
            },
          },
        });
        if (err) throw err;
        if (!data.session) setInfo('Check your email and open the link to confirm your account, then sign in.');
      } else {
        const { error: err } = await sb.auth.signInWithPassword({ email: mail, password: pw });
        if (err) throw err;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(/already registered/i.test(msg) ? 'An account with that email already exists. Sign in instead.' : /invalid login/i.test(msg) ? 'Email or password is not correct.' : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="eyebrow">Presidents only</div>
      <h1 className="title-xl" style={{ fontSize: 30 }}>{up ? 'Create your account' : 'Sign in to vote'}</h1>
      <p className="muted" style={{ margin: '0 0 18px', fontSize: 15 }}>
        {!up
          ? 'Use the email and password you signed up with.'
          : firstAccount
            ? 'You are the first person here, so your account will be the admin account.'
            : autoApprove
              ? 'Only state presidents and LGA presidents can vote. Your account is approved as soon as you sign up.'
              : 'Only state presidents and LGA presidents can vote. An admin approves your account before you can vote.'}
      </p>
      <div className="tabs" style={{ marginBottom: 18 }}>
        <button type="button" className="tab" aria-pressed={!up} onClick={() => { setMode('in'); setError(''); }}>Sign in</button>
        <button type="button" className="tab" aria-pressed={up} onClick={() => { setMode('up'); setError(''); }}>Create account</button>
      </div>

      <div className="stack">
        {up && (
          <label className="label">Full name
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        )}
        {askPresident && (
          <>
            <label className="label">State
              <select className="field" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">Choose your state</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="label">State code
              <input className="field" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
            </label>
            <fieldset className="fieldset">
              <legend className="label" style={{ marginBottom: 6 }}>I am a</legend>
              <div className="row" style={{ gap: 12 }}>
                <label className="choice"><input type="radio" name="role" checked={role === 'state_president'} onChange={() => setRole('state_president')} />State president</label>
                <label className="choice"><input type="radio" name="role" checked={role === 'lga_president'} onChange={() => setRole('lga_president')} />LGA president</label>
              </div>
            </fieldset>
            {role === 'lga_president' && (
              <label className="label">Local government area (LGA)
                <input className="field" value={lga} onChange={(e) => setLga(e.target.value)} />
              </label>
            )}
          </>
        )}
        <label className="label">Email
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="label">Password
          <input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={up ? 'new-password' : 'current-password'} />
        </label>
      </div>

      {error && <p role="alert" className="error" style={{ marginTop: 12 }}>{error}</p>}
      {info && <p role="status" className="notice" style={{ marginTop: 12 }}>{info}</p>}
      <button className="btn block" type="submit" disabled={busy} style={{ marginTop: 18 }}>
        {busy ? 'Please wait…' : up ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}
