'use client';

// "Busca tu nombre": each player's own matches (round, time, court, partner,
// rivals), with one-tap copy/share for WhatsApp.

import { useMemo, useState } from 'react';
import type { ActiveGame, GameRound } from '@/lib/game-engine';
import { buildAgenda, agendaText, normalizeName } from '@/lib/rotation-agenda';

interface Props {
  game: ActiveGame;
  rounds: GameRound[];
  highlightId?: string;   // the viewer, shown first
  canCopyAll?: boolean;   // organizer: copy every agenda at once
  dark?: boolean;         // public page uses a dark theme
}

export default function PlayerAgendas({ game, rounds, highlightId, canCopyAll, dark }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(highlightId ?? null);
  const [copied, setCopied] = useState<string | null>(null);

  const nameOf = (id: string) => game.players.find(p => p.id === id)?.name ?? '?';

  const inSchedule = useMemo(
    () => new Set(rounds.flatMap(r => r.courts.flatMap(c => [...c.pair1, ...c.pair2]))),
    [rounds],
  );

  const list = useMemo(() => {
    const nq = normalizeName(q);
    const ps = game.players
      .filter(p => inSchedule.has(p.id))
      .filter(p => !nq || normalizeName(p.name).includes(nq))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (highlightId) {
      const me = ps.findIndex(p => p.id === highlightId);
      if (me > 0) ps.unshift(...ps.splice(me, 1));
    }
    return ps;
  }, [game.players, inSchedule, q, highlightId]);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(c => (c === key ? null : c)), 2000);
    } catch { /* clipboard blocked — the share button still works */ }
  }

  async function share(text: string) {
    const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
    if (nav.share) { try { await nav.share({ text }); return; } catch { /* cancelled */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  const fg = dark ? '#fff' : 'var(--black)';
  const muted = dark ? 'rgba(255,255,255,0.5)' : 'var(--grey-400)';
  const line = dark ? 'rgba(255,255,255,0.1)' : 'var(--grey-100)';
  const btn: React.CSSProperties = {
    padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.25)' : 'var(--grey-200)'}`,
    background: 'transparent', color: fg,
  };

  if (inSchedule.size === 0) return null;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Busca tu nombre…"
          style={{ flex: '1 1 220px', padding: '10px 12px', fontSize: 14, border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'var(--grey-200)'}`, background: dark ? 'rgba(255,255,255,0.06)' : '#fff', color: fg, outline: 'none' }} />
        {canCopyAll && (
          <button style={btn} onClick={() => copy(list.map(p => agendaText(game, rounds, p.id, nameOf)).join('\n\n'), '__all')}>
            {copied === '__all' ? '✓ Copiadas' : `📋 Copiar ${q ? 'estas' : 'todas'} (${list.length})`}
          </button>
        )}
      </div>

      {list.length === 0 && <div style={{ fontSize: 13, color: muted }}>Nadie con ese nombre en el cronograma.</div>}

      {list.map(p => {
        const items = buildAgenda(game, rounds, p.id);
        const isOpen = open === p.id || (q.length > 0 && list.length <= 3);
        const text = agendaText(game, rounds, p.id, nameOf);
        return (
          <div key={p.id} style={{ borderBottom: `1px solid ${line}`, padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setOpen(isOpen ? null : p.id)}
                style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: fg, fontSize: 14, fontWeight: p.id === highlightId ? 800 : 600 }}>
                {isOpen ? '▾' : '▸'} {p.name}{p.id === highlightId ? ' (vos)' : ''}
                <span style={{ fontWeight: 400, fontSize: 12, color: muted }}> · {items.length} juego{items.length !== 1 ? 's' : ''}{items[0]?.time ? ` · desde ${items[0].time}` : ''}</span>
              </button>
              <button style={btn} onClick={() => copy(text, p.id)}>{copied === p.id ? '✓' : 'Copiar'}</button>
              <button style={btn} onClick={() => share(text)}>WhatsApp</button>
            </div>
            {isOpen && (
              <div style={{ marginTop: 6, paddingLeft: 16 }}>
                {items.map(it => (
                  <div key={it.round} style={{ fontSize: 13, padding: '3px 0', color: fg }}>
                    <strong>R{it.round}</strong>{it.time ? ` · ${it.time}` : ''} · Cancha {it.court}
                    <span style={{ color: muted }}> — con </span>{nameOf(it.partnerId)}
                    <span style={{ color: muted }}> vs </span>{it.rivalIds.map(nameOf).join(' / ')}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
