'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { MatchResult, SetScore } from '@/lib/personalizado-store';

/**
 * Standard padel score entry: both teams stacked on the left, one score column per set
 * (set count comes from the tournament's score config). Used from the calendar and the bracket.
 */
export function ScoreEntry({
  teamAId, teamBId, teamAName, teamBName, setsCount, result, saving, onSave, onCancel, onPartialUpdate, liveScore,
}: {
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  setsCount: number;      // configured number of sets for this phase (1, 2 or 3)
  result?: MatchResult;
  saving: boolean;
  onSave: (result: MatchResult) => void;
  onCancel: () => void;
  // Called (debounced) on every score edit so a live match can broadcast its partial score
  // before a winner exists. Only wired for matches that are already 'playing'.
  onPartialUpdate?: (sets: { a: number | null; b: number | null }[]) => void;
  // Partial score already broadcast (re-seeds the inputs when reopening a live match w/o a result).
  liveScore?: { a: number | null; b: number | null }[];
}) {
  // Allow up to setsCount sets, but always render at least the configured number of columns.
  const cols = Math.max(1, setsCount);
  const seed = (): { a: string; b: string }[] => {
    const base = Array.from({ length: cols }, () => ({ a: '', b: '' }));
    if (result) {
      result.sets.forEach((s, i) => { if (i < cols) base[i] = { a: String(s.a), b: String(s.b) }; });
    } else if (liveScore) {
      liveScore.forEach((s, i) => { if (i < cols) base[i] = { a: s.a == null ? '' : String(s.a), b: s.b == null ? '' : String(s.b) }; });
    }
    return base;
  };
  const [sets, setSets] = useState<{ a: string; b: string }[]>(seed);
  const [walkover, setWalkover] = useState<string>(result?.walkover ? result.winnerId : '');

  // Broadcast the partial score (debounced) as the organizer types, so the public live page can
  // show it before a winner exists. Skips the initial mount so opening the editor doesn't write.
  const touched = useRef(false);
  useEffect(() => {
    if (!onPartialUpdate || !touched.current) return;
    const parsed = sets.map(s => ({
      a: s.a === '' ? null : parseInt(s.a, 10),
      b: s.b === '' ? null : parseInt(s.b, 10),
    }));
    const id = setTimeout(() => onPartialUpdate(parsed), 500);
    return () => clearTimeout(id);
  }, [sets, onPartialUpdate]);

  const setVal = (idx: number, side: 'a' | 'b', val: string) => {
    touched.current = true;
    setSets(prev => { const n = [...prev]; n[idx] = { ...n[idx], [side]: val.replace(/[^0-9]/g, '').slice(0, 2) }; return n; });
  };

  function computeWinner(): string | null {
    if (walkover) return walkover;
    const played = sets.filter(s => s.a !== '' && s.b !== '');
    if (played.length === 0) return null;
    let wA = 0, wB = 0;
    for (const s of played) { if (parseInt(s.a) > parseInt(s.b)) wA++; else if (parseInt(s.b) > parseInt(s.a)) wB++; }
    if (wA > wB) return teamAId;
    if (wB > wA) return teamBId;
    return null;
  }
  const winner = computeWinner();
  const canSave = Boolean(winner);

  function handleSave() {
    if (!canSave || !winner) return;
    if (walkover) { onSave({ sets: [], winnerId: walkover, walkover: true }); return; }
    const cleanSets: SetScore[] = sets
      .filter(s => s.a !== '' && s.b !== '')
      .map(s => ({ a: parseInt(s.a), b: parseInt(s.b) }));
    onSave({ sets: cleanSets, winnerId: winner, walkover: false });
  }

  const cell: React.CSSProperties = {
    width: 46, height: 46, textAlign: 'center', border: '1px solid var(--grey-200)',
    fontSize: 18, fontWeight: 700, outline: 'none', color: 'var(--black)', background: '#fff',
    MozAppearance: 'textfield',
  };
  const headTh: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--grey-400)', textAlign: 'center', paddingBottom: 6,
  };
  const teamCell = (name: string, isWinner: boolean): React.CSSProperties => ({
    fontSize: 14, fontWeight: isWinner ? 800 : 600, color: isWinner ? 'var(--black)' : 'var(--grey-600)',
    padding: '0 14px 0 4px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  });
  const woBtn = (tid: string): React.CSSProperties => ({
    fontSize: 10, padding: '5px 11px', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.05em',
    textTransform: 'uppercase', border: `1px solid ${walkover === tid ? 'var(--black)' : 'var(--grey-200)'}`,
    background: walkover === tid ? 'var(--black)' : 'transparent',
    color: walkover === tid ? 'var(--neon)' : 'var(--grey-400)',
  });

  return (
    <div>
      <table style={{ borderCollapse: 'collapse', marginBottom: 12 }}>
        <thead>
          <tr>
            <th style={{ ...headTh, textAlign: 'left' }}>Pareja</th>
            {Array.from({ length: cols }, (_, i) => <th key={i} style={headTh}>Set {i + 1}</th>)}
          </tr>
        </thead>
        <tbody>
          {([['A', teamAName, teamAId], ['B', teamBName, teamBId]] as const).map(([side, name, id]) => (
            <tr key={side}>
              <td style={teamCell(name, winner === id)}>
                <span style={{ fontSize: 9, color: 'var(--grey-300)', fontWeight: 700, marginRight: 6 }}>Pareja {side}</span>
                {name}
              </td>
              {Array.from({ length: cols }, (_, i) => (
                <td key={i} style={{ padding: 3 }}>
                  <input
                    inputMode="numeric" disabled={!!walkover}
                    style={{ ...cell, opacity: walkover ? 0.4 : 1 }}
                    value={side === 'A' ? sets[i]?.a ?? '' : sets[i]?.b ?? ''}
                    onChange={e => setVal(i, side === 'A' ? 'a' : 'b', e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-300)' }}>Walkover</span>
        <button style={woBtn(teamAId)} onClick={() => setWalkover(p => p === teamAId ? '' : teamAId)}>{teamAName} W.O.</button>
        <button style={woBtn(teamBId)} onClick={() => setWalkover(p => p === teamBId ? '' : teamBId)}>{teamBName} W.O.</button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          disabled={!canSave || saving} onClick={handleSave}
          style={{ fontSize: 12, padding: '9px 22px', border: 'none', cursor: canSave && !saving ? 'pointer' : 'not-allowed', background: 'var(--black)', color: 'var(--neon)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: canSave && !saving ? 1 : 0.4 }}>
          {saving ? 'Guardando…' : 'Registrar Score'}
        </button>
        <button
          disabled={saving} onClick={onCancel}
          style={{ fontSize: 12, padding: '9px 18px', border: '1px solid var(--grey-200)', background: 'transparent', color: 'var(--grey-500)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
