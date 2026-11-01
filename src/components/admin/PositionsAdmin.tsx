'use client';

import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import type { Election } from '@/lib/election';
import { squarePhoto } from '@/lib/photo';
import { supabase } from '@/lib/supabase';
import type { Candidate, Position } from '@/lib/types';

async function uploadPhoto(file: File): Promise<string> {
  const blob = await squarePhoto(file);
  const path = `${crypto.randomUUID()}.jpg`;
  const sb = supabase();
  const { error } = await sb.storage.from('candidate-photos').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return sb.storage.from('candidate-photos').getPublicUrl(path).data.publicUrl;
}

function CandidateRow({ c, onChange, onError }: { c: Candidate; onChange: () => void; onError: (m: string) => void }) {
  const changePhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const url = await uploadPhoto(file);
      const { error } = await supabase().from('candidates').update({ photo_url: url }).eq('id', c.id);
      if (error) throw error;
      onChange();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not upload that picture.');
    }
  };
  const remove = async () => {
    const { error } = await supabase().from('candidates').delete().eq('id', c.id);
    if (error) onError(error.message);
    onChange();
  };
  return (
    <div className="item">
      <Avatar name={c.name} src={c.photo_url} />
      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
        <div className="display" style={{ fontWeight: 700, fontSize: 18 }}>{c.name}</div>
        <div className="muted" style={{ fontSize: 14 }}>{c.tagline}</div>
      </div>
      <div className="row">
        <label className="label" style={{ fontSize: 13 }}>Change picture
          <input type="file" accept="image/*" style={{ display: 'block', marginTop: 4, maxWidth: 200, fontSize: 13 }} onChange={(e) => void changePhoto(e.target.files?.[0])} />
        </label>
        <button className="btn danger small" onClick={() => void remove()}>Remove</button>
      </div>
    </div>
  );
}

function PositionCard({ pos, candidates, onChange, onError }: { pos: Position; candidates: Candidate[]; onChange: () => void; onError: (m: string) => void }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [file, setFile] = useState<File | undefined>();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = (f: File | undefined) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const photo = file ? await uploadPhoto(file) : null;
      const { error } = await supabase().from('candidates').insert({
        position_id: pos.id,
        name: name.trim(),
        tagline: tag.trim() || `Candidate for ${pos.name}`,
        photo_url: photo,
        sort: candidates.length,
      });
      if (error) throw error;
      setName('');
      setTag('');
      pick(undefined);
      onChange();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not add that contestant.');
    } finally {
      setBusy(false);
    }
  };

  const removePosition = async () => {
    const { error } = await supabase().from('positions').delete().eq('id', pos.id);
    if (error) onError(error.message);
    onChange();
  };

  return (
    <section className="card tight">
      <div className="row between" style={{ paddingBottom: 10, borderBottom: '2px solid var(--ink)' }}>
        <h2 className="title-md">{pos.name}</h2>
        <button className="btn danger small" onClick={() => void removePosition()}>Remove position</button>
      </div>
      {candidates.length === 0 && <p className="muted" style={{ marginTop: 14, fontSize: 15 }}>No contestants yet. Add the first one below.</p>}
      <div className="stack" style={{ gap: 10, marginTop: 14 }}>
        {candidates.map((c) => <CandidateRow key={c.id} c={c} onChange={onChange} onError={onError} />)}
      </div>
      <div className="draft">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Add a contestant</div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 12 }}>
          {preview ? <Avatar name={name} src={preview} size={64} /> : <span className="avatar" style={{ width: 64, height: 64, borderStyle: 'dashed', fontSize: 11, fontWeight: 500, textAlign: 'center' }}>No picture</span>}
          <label className="label" style={{ flex: '1 1 180px' }}>Full name
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="label" style={{ flex: '1 1 220px' }}>One-line platform
            <input className="field" value={tag} onChange={(e) => setTag(e.target.value)} />
          </label>
          <label className="label" style={{ flex: '1 1 100%' }}>Picture (JPG or PNG)
            <input type="file" accept="image/*" style={{ display: 'block', marginTop: 4, fontSize: 14 }} onChange={(e) => pick(e.target.files?.[0])} />
          </label>
        </div>
        <button className="btn" style={{ marginTop: 14 }} disabled={busy || !name.trim()} onClick={() => void add()}>
          {busy ? 'Adding…' : 'Add contestant'}
        </button>
      </div>
    </section>
  );
}

export function PositionsAdmin({ election }: { election: Election }) {
  const { positions, candidates, reload } = election;
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const addPosition = async () => {
    if (!name.trim()) return;
    const { error: err } = await supabase().from('positions').insert({ name: name.trim(), sort: positions.length });
    if (err) setError(err.message);
    else setName('');
    await reload();
  };

  return (
    <div style={{ margin: '28px 0' }}>
      {error && <p role="alert" className="error" style={{ marginBottom: 12 }}>{error}</p>}
      <div className="card tight" style={{ marginBottom: 28 }}>
        <label className="label" htmlFor="new-pos">New position</label>
        <div className="row" style={{ marginTop: 4 }}>
          <input id="new-pos" className="field" style={{ flex: '1 1 220px', width: 'auto', marginTop: 0 }} placeholder="For example: Treasurer" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" disabled={!name.trim()} onClick={() => void addPosition()}>Add position</button>
        </div>
      </div>
      {positions.map((p) => (
        <PositionCard key={p.id} pos={p} candidates={candidates.filter((c) => c.position_id === p.id)} onChange={() => void reload()} onError={setError} />
      ))}
    </div>
  );
}
