'use client';

import { Avatar } from './Avatar';
import type { Election } from '@/lib/election';

export function Results({ election }: { election: Election }) {
  const { positions, candidates, counts, settings } = election;
  return (
    <section aria-live="polite">
      <h2 className="title-lg">Live results</h2>
      <p className="muted" style={{ fontSize: 14, margin: '6px 0 4px' }}>
        {settings.voting_open ? 'Updates the moment a vote is counted.' : 'Voting is closed. These are the final results.'}
      </p>
      {positions.length === 0 && <p className="muted" style={{ marginTop: 20 }}>No positions yet.</p>}
      {positions.map((pos) => {
        const cands = candidates.filter((c) => c.position_id === pos.id);
        const total = cands.reduce((a, c) => a + (counts[c.id] ?? 0), 0);
        const top = Math.max(0, ...cands.map((c) => counts[c.id] ?? 0));
        const rows = [...cands].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
        return (
          <div key={pos.id}>
            <div className="section-head row between" style={{ alignItems: 'baseline' }}>
              <h3 style={{ fontSize: 22 }}>{pos.name}</h3>
              <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>
                <strong className="display" style={{ color: 'var(--ink)', fontSize: 18 }}>{total}</strong> votes cast
              </span>
            </div>
            {rows.length === 0 && <p className="muted">No candidates yet.</p>}
            <div className="stack" style={{ gap: 16 }}>
              {rows.map((c) => {
                const v = counts[c.id] ?? 0;
                const pct = total ? Math.round((v / total) * 100) : 0;
                const lead = total > 0 && v === top;
                return (
                  <div key={c.id}>
                    <div className="row between" style={{ flexWrap: 'nowrap', marginBottom: 6 }}>
                      <div className="row" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
                        <Avatar name={c.name} src={c.photo_url} size={36} />
                        <span style={{ fontWeight: 600, fontSize: 16 }}>{c.name}</span>
                      </div>
                      <span className="pct">{pct}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${total ? (v / total) * 100 : 0}%`, background: lead ? 'var(--green)' : 'var(--bar)' }} />
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{v} votes</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
