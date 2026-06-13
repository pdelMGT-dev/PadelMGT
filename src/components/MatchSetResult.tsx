import React from 'react';

// MatchSetResult — standard read-only display for a finished padel match.
// Shows the result in COLUMNS, mirroring the score-entry form: a header row
// with SET labels, then one row per pair with its score under each set column.
// Used across all JR/Tournament result views so the format stays consistent.

export interface MatchSetScore { p1: number; p2: number; }

export interface MatchSetResultProps {
  pair1Label: string;
  pair2Label: string;
  /** Per-set scores. When absent/empty, falls back to the aggregate score. */
  sets?: MatchSetScore[] | null;
  /** Aggregate fallback (points formats or matches without per-set detail). */
  pair1Score?: number | null;
  pair2Score?: number | null;
  /** Optional header rendered top-left (e.g. "GRUPO A · Partido 1"). */
  header?: React.ReactNode;
  /** When provided, renders an "editar" link below the result. */
  onEdit?: () => void;
  /** Visual density. 'sm' = compact (history lists), 'md' = roomier. */
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export default function MatchSetResult({
  pair1Label, pair2Label, sets, pair1Score, pair2Score, header, onEdit, size = 'sm', style,
}: MatchSetResultProps) {
  const hasSets = Array.isArray(sets) && sets.length > 0;
  const colW   = size === 'md' ? 48 : 40;
  const nameFs = size === 'md' ? 14 : 13;
  const scoreFs = size === 'md' ? 18 : 15;

  // Winner: by sets won when we have set detail, else by aggregate score.
  let p1Won = false, p2Won = false;
  if (hasSets) {
    const s1 = sets!.filter(s => s.p1 > s.p2).length;
    const s2 = sets!.filter(s => s.p2 > s.p1).length;
    p1Won = s1 > s2; p2Won = s2 > s1;
  } else {
    p1Won = (pair1Score ?? 0) > (pair2Score ?? 0);
    p2Won = (pair2Score ?? 0) > (pair1Score ?? 0);
  }

  const colLabels = hasSets ? sets!.map((_, i) => `SET ${i + 1}`) : ['PTS'];

  const scoreCell = (val: React.ReactNode, win: boolean, key: number) => (
    <div key={key} style={{ width: colW, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: scoreFs, fontWeight: win ? 700 : 400, color: win ? 'var(--turf-green)' : 'var(--grey-400)' }}>
      {val}
    </div>
  );

  const nameStyle = (win: boolean): React.CSSProperties => ({
    flex: 1, minWidth: 0, fontSize: nameFs, fontWeight: win ? 700 : 400,
    color: win ? 'var(--black)' : 'var(--grey-500)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  });

  return (
    <div style={{ border: '1px solid var(--grey-100)', background: '#fff', ...style }}>
      {/* Header: optional label + set column labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '7px 14px', background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-100)' }}>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>
          {header}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {colLabels.map((l, i) => (
            <div key={i} style={{ width: colW, textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{l}</div>
          ))}
        </div>
      </div>

      {/* Pair 1 row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--grey-50)' }}>
        <span style={nameStyle(p1Won)}>{p1Won ? '▶ ' : ''}{pair1Label}</span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {hasSets
            ? sets!.map((s, i) => scoreCell(s.p1, s.p1 > s.p2, i))
            : scoreCell(pair1Score ?? '—', p1Won, 0)}
        </div>
      </div>

      {/* Pair 2 row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px' }}>
        <span style={nameStyle(p2Won)}>{p2Won ? '▶ ' : ''}{pair2Label}</span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {hasSets
            ? sets!.map((s, i) => scoreCell(s.p2, s.p2 > s.p1, i))
            : scoreCell(pair2Score ?? '—', p2Won, 0)}
        </div>
      </div>

      {onEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 14px 8px' }}>
          <button onClick={onEdit} style={{ fontSize: 9, color: 'var(--grey-400)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            editar
          </button>
        </div>
      )}
    </div>
  );
}
