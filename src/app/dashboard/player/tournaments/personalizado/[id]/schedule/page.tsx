'use client';

import React, { useState, useEffect, use, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  loadPersonalizadoById,
  getPersonalizado,
  saveControlPanel,
  saveMatchResult,
  generateGroupSchedule,
  calculateGroupStandings,
  computeQualifiers,
  generateBracket,
  scheduleBracket,
  saveBracketResult,
  canManagePersonalizado,
  createScheduleNotifications,
  DEFAULT_CONTROL_CONFIG,
  type PersonalizadoTournament,
  type PersonalizadoTeam,
  type PersonalizadoMatch,
  type BracketMatch,
  type MatchResult,
  type SetScore,
} from '@/lib/personalizado-store';
import { useToast } from '@/components/ToastProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// ── Styles ────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--grey-200)',
  padding: '20px clamp(14px, 3vw, 24px)',
  marginBottom: 16,
};

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function fmtDay(day: string): string {
  try {
    const d = new Date(`${day}T00:00:00`);
    const s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return day;
  }
}

// ── Result form (inline, per match/bracket card) ───────────────────────────────

interface ResultFormProps {
  matchId: string;
  teamAId: string;
  teamBId: string;
  result?: MatchResult;
  teamName: (id: string) => string;
  saving: boolean;
  onSave: (matchId: string, result: MatchResult) => void;
  onCancel: () => void;
}

function ResultForm({ matchId, teamAId, teamBId, result, teamName, saving, onSave, onCancel }: ResultFormProps) {
  const initial = result
    ? result.sets.map(s => ({ a: String(s.a), b: String(s.b) }))
    : [{ a: '', b: '' }, { a: '', b: '' }];

  const [sets, setSets] = useState<{ a: string; b: string }[]>(initial);
  const [walkover, setWalkover] = useState<string>(result?.walkover ? result.winnerId : '');

  const setVal = (idx: number, side: 'a' | 'b', val: string) => {
    setSets(prev => {
      const next = [...prev];
      while (next.length <= idx) next.push({ a: '', b: '' });
      next[idx] = { ...next[idx], [side]: val };
      return next;
    });
  };

  const scored2 = sets.slice(0, 2).filter(s => s.a !== '' && s.b !== '');
  let s2A = 0, s2B = 0;
  for (const s of scored2) {
    if (parseInt(s.a) > parseInt(s.b)) s2A++; else if (parseInt(s.b) > parseInt(s.a)) s2B++;
  }
  const needsSet3 = scored2.length === 2 && s2A === s2B;
  const hasSet3Val = sets[2]?.a !== '' || sets[2]?.b !== '';
  const showSet3 = needsSet3 || hasSet3Val;

  function computeWinner(): string | null {
    const played = sets.filter(s => s.a !== '' && s.b !== '');
    if (played.length === 0) return null;
    let wA = 0, wB = 0;
    for (const s of played) {
      if (parseInt(s.a) > parseInt(s.b)) wA++; else if (parseInt(s.b) > parseInt(s.a)) wB++;
    }
    if (wA > wB) return teamAId;
    if (wB > wA) return teamBId;
    return null;
  }

  const winner = walkover ? walkover : computeWinner();
  const canSave = Boolean(winner);

  function handleSave() {
    if (!canSave) return;
    if (walkover) {
      onSave(matchId, { sets: [], winnerId: walkover, walkover: true });
    } else {
      const parsedSets: SetScore[] = sets
        .filter(s => s.a !== '' && s.b !== '')
        .map(s => ({ a: parseInt(s.a), b: parseInt(s.b) }));
      onSave(matchId, { sets: parsedSets, winnerId: winner!, walkover: false });
    }
  }

  const inputStyle: React.CSSProperties = {
    width: 44, textAlign: 'center', border: '1px solid var(--grey-200)',
    padding: '5px 2px', fontSize: 14, fontWeight: 700, outline: 'none',
  };
  const woBtn = (tid: string): React.CSSProperties => ({
    fontSize: 10, padding: '4px 10px', cursor: 'pointer', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    border: `1px solid ${walkover === tid ? 'var(--black)' : 'var(--grey-200)'}`,
    background: walkover === tid ? 'var(--black)' : 'transparent',
    color: walkover === tid ? 'var(--bs-light)' : 'var(--grey-400)',
  });

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--grey-100)' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 5 }}>
          Walkover / Retiro
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button style={woBtn(teamAId)}
            onClick={() => setWalkover(prev => prev === teamAId ? '' : teamAId)}>
            {teamName(teamAId)} gana W.O.
          </button>
          <button style={woBtn(teamBId)}
            onClick={() => setWalkover(prev => prev === teamBId ? '' : teamBId)}>
            {teamName(teamBId)} gana W.O.
          </button>
        </div>
      </div>

      {!walkover && (
        <div style={{ marginBottom: 10 }}>
          {[0, 1, 2].map(idx => {
            if (idx === 2 && !showSet3) return null;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: 'var(--grey-400)', fontWeight: 600, width: 30, flexShrink: 0 }}>Set {idx + 1}</span>
                <input type="number" min="0" max="99" style={inputStyle}
                  value={sets[idx]?.a ?? ''}
                  onChange={e => setVal(idx, 'a', e.target.value)} />
                <span style={{ color: 'var(--grey-300)', fontWeight: 700, fontSize: 14 }}>–</span>
                <input type="number" min="0" max="99" style={inputStyle}
                  value={sets[idx]?.b ?? ''}
                  onChange={e => setVal(idx, 'b', e.target.value)} />
                {idx === 2 && (
                  <span style={{ fontSize: 10, color: 'var(--grey-400)' }}>(3er set)</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {winner && !walkover && (
        <div style={{ fontSize: 11, color: 'var(--grey-500)', marginBottom: 8 }}>
          Gana: <strong>{teamName(winner)}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button disabled={!canSave || saving} onClick={handleSave}
          style={{
            fontSize: 11, padding: '6px 14px', border: 'none', cursor: canSave && !saving ? 'pointer' : 'not-allowed',
            background: 'var(--black)', color: 'var(--bs-light)', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', opacity: canSave && !saving ? 1 : 0.45,
          }}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button disabled={saving} onClick={onCancel}
          style={{
            fontSize: 11, padding: '6px 14px', border: '1px solid var(--grey-200)',
            background: 'transparent', color: 'var(--grey-500)', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Match card (selectable + draggable) ───────────────────────────────────────

interface MatchCardProps {
  match: PersonalizadoMatch;
  teamName: (id: string) => string;
  catName: (id: string) => string;
  editingId: string | null;
  savingId: string | null;
  onEdit: (id: string) => void;
  onSave: (matchId: string, result: MatchResult) => void;
  onCancelEdit: () => void;
  // multiselect + drag
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  isDragging: boolean;
}

function MatchCard({
  match, teamName, catName, editingId, savingId, onEdit, onSave, onCancelEdit,
  selected, onToggleSelect, onDragStart, isDragging,
}: MatchCardProps) {
  const res = match.result;
  const isEditing = editingId === match.id;
  const isSaving = savingId === match.id;

  const setsLabel = res && !res.walkover && res.sets.length > 0
    ? res.sets.map(s => `${s.a}-${s.b}`).join(' / ')
    : null;

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(match.id); }}
      onClick={e => {
        // click on the card background toggles selection; ignore if clicking a button/input
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') return;
        onToggleSelect(match.id);
      }}
      style={{
        border: `2px solid ${selected ? 'var(--black)' : res ? 'var(--grey-200)' : 'var(--grey-100)'}`,
        padding: '12px 14px',
        background: selected ? 'rgba(0,0,0,0.03)' : res ? '#f9faf9' : 'var(--grey-50, #fafafa)',
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
        userSelect: 'none',
        position: 'relative',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      {/* Selection indicator */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        width: 16, height: 16, border: `2px solid ${selected ? 'var(--black)' : 'var(--grey-200)'}`,
        background: selected ? 'var(--black)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: 'var(--bs-light)', fontWeight: 700,
        pointerEvents: 'none',
      }}>
        {selected ? '✓' : ''}
      </div>

      {/* Court + group label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingRight: 22 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>
          {match.courtName}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(0,0,0,0.05)', color: 'var(--grey-500)' }}>
          {catName(match.categoryId)} · Gr. {match.groupLabel}
        </span>
      </div>

      {/* Teams */}
      <div style={{ fontSize: 13, fontWeight: 600 }}>{teamName(match.teamAId)}</div>
      <div style={{ fontSize: 11, color: 'var(--grey-400)', margin: '2px 0', fontWeight: 700 }}>vs</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{teamName(match.teamBId)}</div>

      {/* Result display */}
      {res && !isEditing && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--grey-100)' }}>
          {res.walkover ? (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 6px', background: '#fef3c7', color: '#92400e' }}>
              W.O. → {teamName(res.winnerId)}
            </span>
          ) : (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-600)', letterSpacing: '0.04em' }}>{setsLabel}</div>
              <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 2 }}>Ganó: <strong>{teamName(res.winnerId)}</strong></div>
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      {!isEditing && (
        <button
          onClick={e => { e.stopPropagation(); onEdit(match.id); }}
          style={{
            marginTop: 10, fontSize: 10, padding: '4px 10px', cursor: 'pointer',
            border: '1px solid var(--grey-200)', background: 'transparent',
            color: 'var(--grey-500)', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', width: '100%',
          }}>
          {res ? '✎ Editar resultado' : '+ Ingresar resultado'}
        </button>
      )}

      {isEditing && (
        <ResultForm
          matchId={match.id} teamAId={match.teamAId} teamBId={match.teamBId} result={match.result}
          teamName={teamName} saving={isSaving}
          onSave={onSave} onCancel={onCancelEdit}
        />
      )}
    </div>
  );
}

// ── Day drop zone wrapper ─────────────────────────────────────────────────────

function DayDropZone({
  day, dragActive, onDrop, children,
}: {
  day: string;
  dragActive: boolean;
  onDrop: (day: string) => void;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(day); }}
      style={{
        marginBottom: 24,
        outline: over && dragActive ? '2px dashed var(--black)' : 'none',
        outlineOffset: 4,
        background: over && dragActive ? 'rgba(0,0,0,0.015)' : 'transparent',
        transition: 'background 0.1s',
        borderRadius: 2,
      }}
    >
      {children}
      {over && dragActive && (
        <div style={{
          padding: '10px 16px',
          border: '2px dashed var(--grey-300)',
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--grey-400)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginTop: 8,
        }}>
          Soltar aquí → {fmtDay(day)}
        </div>
      )}
    </div>
  );
}

// ── Bracket match card ───────────────────────────────────────────────────────

interface BracketMatchCardProps {
  match: BracketMatch;
  teamName: (id: string) => string;
  editingId: string | null;
  savingId: string | null;
  onEdit: (id: string) => void;
  onSave: (matchId: string, result: MatchResult) => void;
  onCancelEdit: () => void;
}

function BracketMatchCard({ match, teamName, editingId, savingId, onEdit, onSave, onCancelEdit }: BracketMatchCardProps) {
  const isEditing = editingId === match.id;
  const isSaving = savingId === match.id;
  const ready = Boolean(match.teamAId && match.teamBId);
  const res = match.result;

  const setsLabel = res && !res.walkover && res.sets.length > 0
    ? res.sets.map(s => `${s.a}-${s.b}`).join(' / ')
    : null;

  return (
    <div style={{
      border: `1px solid ${res ? 'var(--grey-200)' : 'var(--grey-100)'}`,
      padding: '12px 14px',
      background: res ? '#f9faf9' : 'var(--grey-50, #fafafa)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>
          {match.courtName ?? '—'}{match.day ? ` · ${match.day}` : ''}{match.time ? ` · ${match.time}` : ''}
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: match.teamAId ? 'inherit' : 'var(--grey-400)' }}>
        {match.teamAId ? teamName(match.teamAId) : 'Por definir'}
        {match.wildcardA && <span style={{ fontSize: 9, color: 'var(--grey-400)', marginLeft: 6 }}>(comodín)</span>}
      </div>
      <div style={{ fontSize: 11, color: 'var(--grey-400)', margin: '2px 0', fontWeight: 700 }}>vs</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: match.teamBId ? 'inherit' : 'var(--grey-400)' }}>
        {match.teamBId ? teamName(match.teamBId) : 'Por definir'}
        {match.wildcardB && <span style={{ fontSize: 9, color: 'var(--grey-400)', marginLeft: 6 }}>(comodín)</span>}
      </div>

      {res && !isEditing && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--grey-100)' }}>
          {res.walkover ? (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 6px', background: '#fef3c7', color: '#92400e' }}>
              W.O. → {teamName(res.winnerId)}
            </span>
          ) : (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-600)', letterSpacing: '0.04em' }}>{setsLabel}</div>
              <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 2 }}>Ganó: <strong>{teamName(res.winnerId)}</strong></div>
            </div>
          )}
        </div>
      )}

      {ready && !isEditing && (
        <button onClick={() => onEdit(match.id)}
          style={{
            marginTop: 10, fontSize: 10, padding: '4px 10px', cursor: 'pointer',
            border: '1px solid var(--grey-200)', background: 'transparent',
            color: 'var(--grey-500)', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', width: '100%',
          }}>
          {res ? '✎ Editar resultado' : '+ Ingresar resultado'}
        </button>
      )}

      {isEditing && match.teamAId && match.teamBId && (
        <ResultForm
          matchId={match.id} teamAId={match.teamAId} teamBId={match.teamBId} result={match.result}
          teamName={teamName} saving={isSaving}
          onSave={onSave} onCancel={onCancelEdit}
        />
      )}
    </div>
  );
}

// ── Drag & drop group assignment ───────────────────────────────────────────────

function DropColumn({ title, accent, count, capacity, onDrop, children }: {
  title: string; accent: string; count: number; capacity?: number;
  onDrop: () => void; children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(); }}
      style={{
        border: `1px solid ${over ? accent : 'var(--grey-200)'}`,
        background: over ? 'rgba(34,197,94,0.04)' : '#fff', padding: 10, minHeight: 90,
        boxShadow: over ? `inset 0 0 0 1px ${accent}` : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: capacity && count > capacity ? '#b91c1c' : 'var(--grey-400)' }}>
          {count}{capacity ? `/${capacity}` : ''}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function TeamChip({ team, onDragStart }: { team: PersonalizadoTeam; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{
        padding: '7px 9px', border: '1px solid var(--grey-200)', background: 'var(--grey-50, #fafafa)',
        cursor: 'grab', fontSize: 12, lineHeight: 1.3,
      }}
    >
      <div style={{ fontWeight: 600 }}>{team.player1Name}</div>
      {team.player2Name && <div style={{ color: 'var(--grey-400)', fontSize: 11 }}>{team.player2Name}</div>}
    </div>
  );
}

// ── Standings view ────────────────────────────────────────────────────────────

interface StandingsViewProps {
  tournament: PersonalizadoTournament;
  teamName: (id: string) => string;
}

function StandingsView({ tournament, teamName }: StandingsViewProps) {
  const groups = useMemo(() => {
    const result: { categoryId: string; categoryName: string; groupId: string; groupLabel: string }[] = [];
    const seen = new Set<string>();
    for (const m of tournament.config?.matches ?? []) {
      const key = `${m.categoryId}|${m.groupId}`;
      if (!seen.has(key)) {
        seen.add(key);
        const cat = tournament.categories.find(c => c.id === m.categoryId);
        result.push({ categoryId: m.categoryId, categoryName: cat?.name ?? m.categoryId, groupId: m.groupId, groupLabel: m.groupLabel });
      }
    }
    return result;
  }, [tournament]);

  if (groups.length === 0) {
    return (
      <div style={{ ...card, textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
        Genera el calendario primero para ver las posiciones.
      </div>
    );
  }

  const byCategory = new Map<string, typeof groups>();
  for (const g of groups) {
    const arr = byCategory.get(g.categoryId) ?? [];
    arr.push(g);
    byCategory.set(g.categoryId, arr);
  }

  const thStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--grey-400)', padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    fontSize: 12, padding: '7px 8px', textAlign: 'right', borderTop: '1px solid var(--grey-100)',
  };

  return (
    <div>
      {[...byCategory.entries()].map(([catId, catGroups]) => (
        <div key={catId} style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>
            {catGroups[0].categoryName}
          </div>

          {catGroups.map(g => {
            const qualifyN = tournament.config?.groups.find(gc => gc.categoryId === catId)?.qualifyPerGroup ?? 2;
            const standings = calculateGroupStandings(tournament, catId, g.groupId);
            const matchesInGroup = (tournament.config?.matches ?? []).filter(m => m.categoryId === catId && m.groupId === g.groupId);
            const doneCount = matchesInGroup.filter(m => m.result).length;

            return (
              <div key={g.groupId} style={{ ...card, padding: '16px clamp(12px, 2vw, 20px)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>
                    Grupo {g.groupLabel}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>
                    {doneCount}/{matchesInGroup.length} partidos jugados
                  </div>
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left', width: 24 }}>#</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Equipo</th>
                        <th style={thStyle}>PJ</th>
                        <th style={thStyle}>PG</th>
                        <th style={thStyle}>PE</th>
                        <th style={thStyle}>PP</th>
                        <th style={thStyle}>JF</th>
                        <th style={thStyle}>JC</th>
                        <th style={thStyle}>+/−</th>
                        <th style={{ ...thStyle, color: 'var(--grey-700)' }}>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row, idx) => {
                        const classified = idx < qualifyN && doneCount === matchesInGroup.length && matchesInGroup.length > 0;
                        const rowBg = classified ? 'rgba(34,197,94,0.07)' : idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)';
                        return (
                          <tr key={row.teamId} style={{ background: rowBg }}>
                            <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700, color: classified ? '#15803d' : 'var(--grey-400)', fontSize: 11 }}>
                              {idx + 1}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {teamName(row.teamId)}
                              {classified && <span style={{ marginLeft: 5, fontSize: 9, color: '#15803d', fontWeight: 700 }}>✓</span>}
                            </td>
                            <td style={tdStyle}>{row.pj}</td>
                            <td style={tdStyle}>{row.pg}</td>
                            <td style={tdStyle}>{row.pe}</td>
                            <td style={tdStyle}>{row.pp}</td>
                            <td style={tdStyle}>{row.jf}</td>
                            <td style={tdStyle}>{row.jc}</td>
                            <td style={{ ...tdStyle, color: row.diff > 0 ? '#15803d' : row.diff < 0 ? '#dc2626' : 'inherit', fontWeight: 700 }}>
                              {row.diff > 0 ? `+${row.diff}` : row.diff}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 800, fontSize: 14, color: 'var(--grey-800)' }}>{row.pts}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {doneCount === matchesInGroup.length && matchesInGroup.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 10, color: '#15803d', fontWeight: 600 }}>
                    ✓ Clasifican: top {qualifyN} del grupo
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { showToast } = useToast();
  const { user: currentUser } = useCurrentUser();
  const [tournament, setTournament] = useState<PersonalizadoTournament | null>(null);
  const [teams, setTeams] = useState<PersonalizadoTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [savingGroups, setSavingGroups] = useState(false);
  const [tab, setTab] = useState<'schedule' | 'standings' | 'bracket'>('schedule');
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [editingBracketId, setEditingBracketId] = useState<string | null>(null);
  const [savingBracketId, setSavingBracketId] = useState<string | null>(null);
  const [generatingBracketCat, setGeneratingBracketCat] = useState<string | null>(null);

  // Group assignment drag
  const [dragTeam, setDragTeam] = useState<string | null>(null);

  // Calendar multiselect + drag between days
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [draggingMatchId, setDraggingMatchId] = useState<string | null>(null);
  // localMatches: null = no pending changes; array = has unsaved moves
  const [localMatches, setLocalMatches] = useState<PersonalizadoMatch[] | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    let active = true;
    loadPersonalizadoById(id).then(t => {
      if (active) { setTournament(t); setTeams(t?.teams ?? []); setLoading(false); }
    });
    return () => { active = false; };
  }, [id]);

  // Reset pending changes when tournament reloads
  useEffect(() => { setLocalMatches(null); setSelectedMatchIds(new Set()); }, [tournament?.id]);

  const accessDenied = !!tournament && !canManagePersonalizado(tournament, currentUser?.id);

  const teamName = useMemo(() => {
    const map = new Map<string, string>();
    for (const tm of teams) {
      map.set(tm.id, tm.player2Name ? `${tm.player1Name} / ${tm.player2Name}` : tm.player1Name);
    }
    return (tid: string) => map.get(tid) ?? '—';
  }, [teams]);

  const catName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of tournament?.categories ?? []) map.set(c.id, c.name);
    return (cid: string) => map.get(cid) ?? '';
  }, [tournament]);

  const assignable = useMemo(
    () => teams.filter(t => t.status === 'pending' || t.status === 'confirmed'),
    [teams],
  );

  // Use localMatches if there are pending changes, otherwise use saved matches
  const matches = localMatches ?? (tournament?.config?.matches ?? []);
  const bracketMatches = tournament?.config?.bracketMatches ?? [];
  const assignedCount = assignable.filter(t => t.groupId).length;
  const doneCount = matches.filter(m => m.result).length;
  const hasPendingChanges = localMatches !== null;

  // ── Group assignment handlers ────────────────────────────────────────────
  function assignTeamToGroup(teamId: string, groupId: string | null) {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, groupId: groupId ?? undefined } : t));
  }

  function autoDistribute(categoryId: string, groupIds: string[]) {
    if (groupIds.length === 0) return;
    const catTeams = assignable.filter(t => t.categoryId === categoryId);
    setTeams(prev => {
      const next = [...prev];
      catTeams.forEach((t, i) => {
        const gid = groupIds[i % groupIds.length];
        const idx = next.findIndex(x => x.id === t.id);
        if (idx >= 0) next[idx] = { ...next[idx], groupId: gid };
      });
      return next;
    });
  }

  function clearGroups(categoryId: string) {
    setTeams(prev => prev.map(t => t.categoryId === categoryId ? { ...t, groupId: undefined } : t));
  }

  async function handleSaveGroups() {
    if (!tournament) return;
    setSavingGroups(true);
    const groupAssignments: Record<string, string | null> = {};
    for (const t of teams) groupAssignments[t.id] = t.groupId ?? null;
    const res = await saveControlPanel({
      id: tournament.id,
      categories: tournament.categories,
      config: tournament.config ?? DEFAULT_CONTROL_CONFIG,
      groupAssignments,
      requesterId: currentUser?.id,
    });
    setSavingGroups(false);
    if (!res.ok) { showToast(res.error ?? 'No se pudo guardar', 'error'); return; }
    if (res.teams) setTeams(res.teams);
    showToast('Grupos guardados', 'success');
  }

  // ── Calendar generation ──────────────────────────────────────────────────
  async function handleGenerate() {
    if (!tournament) return;
    setWorking(true);
    setLocalMatches(null);
    setSelectedMatchIds(new Set());
    const liveTournament = { ...tournament, teams };
    const generated = generateGroupSchedule(liveTournament);
    const config = { ...DEFAULT_CONTROL_CONFIG, ...(tournament.config ?? {}), matches: generated };
    const res = await saveControlPanel({
      id: tournament.id,
      categories: tournament.categories,
      config,
      status: tournament.status === 'configured' || tournament.status === 'registration_open' ? 'live' : undefined,
      requesterId: currentUser?.id,
    });
    setWorking(false);
    if (!res.ok) { showToast(res.error ?? 'No se pudo generar', 'error'); return; }
    const refreshed = await loadPersonalizadoById(id);
    setTournament(refreshed);
    if (refreshed) setTeams(refreshed.teams);
    showToast(`Calendario generado: ${generated.length} partidos`, 'success');
  }

  // ── Match result save ─────────────────────────────────────────────────────
  const handleSaveResult = useCallback(async (matchId: string, result: MatchResult) => {
    if (!tournament) return;
    setSavingMatchId(matchId);
    const res = await saveMatchResult({ tournamentId: tournament.id, matchId, result });
    setSavingMatchId(null);
    if (!res.ok) { showToast(res.error ?? 'Error al guardar', 'error'); return; }

    // Update in localMatches if pending, otherwise in tournament
    if (localMatches) {
      setLocalMatches(prev => prev ? prev.map(m =>
        m.id === matchId ? { ...m, result, status: 'done' as const } : m
      ) : null);
    } else {
      setTournament(prev => {
        if (!prev?.config?.matches) return prev;
        return {
          ...prev,
          config: {
            ...prev.config,
            matches: prev.config.matches.map(m =>
              m.id === matchId ? { ...m, result, status: 'done' as const } : m
            ),
          },
        };
      });
    }
    setEditingMatchId(null);
    showToast('Resultado guardado', 'success');
  }, [tournament, localMatches, showToast]);

  // ── Calendar drag & drop between days ─────────────────────────────────────

  function handleMatchDragStart(matchId: string) {
    setDraggingMatchId(matchId);
    // If the dragged match is not in the selection, select only it
    setSelectedMatchIds(prev => {
      if (!prev.has(matchId)) return new Set([matchId]);
      return prev;
    });
  }

  function handleDropOnDay(targetDay: string) {
    if (!draggingMatchId) return;
    const idsToMove = selectedMatchIds.size > 0 ? [...selectedMatchIds] : [draggingMatchId];

    setLocalMatches(prev => {
      const base = prev ?? (tournament?.config?.matches ?? []);
      return base.map(m =>
        idsToMove.includes(m.id) ? { ...m, day: targetDay } : m
      );
    });

    setDraggingMatchId(null);
  }

  function handleToggleSelect(matchId: string) {
    setSelectedMatchIds(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  function handleSelectAll() {
    setSelectedMatchIds(new Set(matches.map(m => m.id)));
  }

  function handleClearSelection() {
    setSelectedMatchIds(new Set());
  }

  // ── Save pending schedule changes ─────────────────────────────────────────

  async function handleSaveScheduleChanges() {
    if (!tournament || !localMatches) return;
    setSavingSchedule(true);

    const newConfig = { ...(tournament.config ?? DEFAULT_CONTROL_CONFIG), matches: localMatches };
    const res = await saveControlPanel({
      id: tournament.id,
      categories: tournament.categories,
      config: newConfig,
      requesterId: currentUser?.id,
    });

    if (!res.ok) {
      setSavingSchedule(false);
      showToast(res.error ?? 'No se pudo guardar el calendario', 'error');
      return;
    }

    // Notify all participants (player1Id + player2Id of active teams)
    const participantIds = teams
      .filter(t => t.status === 'pending' || t.status === 'confirmed')
      .flatMap(t => [t.player1Id, t.player2Id])
      .filter((pid): pid is string => !!pid && pid !== currentUser?.id);

    const tournamentName = tournament.name;
    await createScheduleNotifications(
      tournament.id,
      participantIds,
      `El calendario del torneo "${tournamentName}" ha sido actualizado por el organizador.`,
    );

    // Reload from server so local state matches DB
    const refreshed = await loadPersonalizadoById(id);
    setTournament(refreshed);
    if (refreshed) setTeams(refreshed.teams);
    setLocalMatches(null);
    setSelectedMatchIds(new Set());
    setSavingSchedule(false);
    showToast('Calendario guardado. Participantes notificados.', 'success');
  }

  function handleDiscardChanges() {
    setLocalMatches(null);
    setSelectedMatchIds(new Set());
  }

  // ── Bracket ───────────────────────────────────────────────────────────────
  async function handleGenerateBracket(categoryId: string) {
    if (!tournament) return;
    setGeneratingBracketCat(categoryId);
    const liveTournament = { ...tournament, teams };
    const built = generateBracket(liveTournament, categoryId);
    const scheduled = scheduleBracket(liveTournament, built);
    const newBracketMatches = [
      ...(tournament.config?.bracketMatches ?? []).filter(m => m.categoryId !== categoryId),
      ...scheduled,
    ];
    const newConfig = { ...(tournament.config ?? DEFAULT_CONTROL_CONFIG), bracketMatches: newBracketMatches };
    const res = await saveControlPanel({ id: tournament.id, categories: tournament.categories, config: newConfig, requesterId: currentUser?.id });
    setGeneratingBracketCat(null);
    if (!res.ok) { showToast(res.error ?? 'No se pudo generar el bracket', 'error'); return; }
    const refreshed = await loadPersonalizadoById(id);
    setTournament(refreshed);
    if (refreshed) setTeams(refreshed.teams);
    showToast(`Bracket generado: ${scheduled.length} partidos`, 'success');
  }

  const handleSaveBracketResult = useCallback(async (matchId: string, result: MatchResult) => {
    if (!tournament) return;
    setSavingBracketId(matchId);
    const res = await saveBracketResult({ tournamentId: tournament.id, matchId, result });
    setSavingBracketId(null);
    if (!res.ok) { showToast(res.error ?? 'Error al guardar', 'error'); return; }
    const refreshed = getPersonalizado(tournament.id);
    if (refreshed) { setTournament(refreshed); setTeams(refreshed.teams); }
    setEditingBracketId(null);
    showToast('Resultado guardado', 'success');
  }, [tournament, showToast]);

  if (loading) return <div className="bs-page" style={{ padding: 40, color: 'var(--grey-400)', fontSize: 14 }}>Cargando…</div>;
  if (tournament && accessDenied) {
    return (
      <div className="bs-page" style={{ padding: '40px clamp(16px,4vw,40px)', maxWidth: 1000, margin: '0 auto' }}>
        <Link href={`/dashboard/player/tournaments`} style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>← Mis Torneos</Link>
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--black)', marginBottom: 8 }}>Acceso restringido</div>
          <div style={{ fontSize: 14, color: 'var(--grey-500)', lineHeight: 1.6 }}>
            Solo el creador del torneo o sus co-creadores pueden ver el calendario y la gestión.
          </div>
        </div>
      </div>
    );
  }
  if (!tournament) {
    return (
      <div className="bs-page" style={{ padding: '40px clamp(16px,4vw,40px)', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--grey-500)' }}>Torneo no encontrado.</div>
      </div>
    );
  }

  const byDay = new Map<string, PersonalizadoMatch[]>();
  for (const m of matches) {
    const arr = byDay.get(m.day) ?? [];
    arr.push(m);
    byDay.set(m.day, arr);
  }
  const days = [...byDay.keys()].sort();

  const tabBtn = (t: 'schedule' | 'standings' | 'bracket'): React.CSSProperties => ({
    padding: '8px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', cursor: 'pointer',
    border: tab === t ? 'none' : '1px solid var(--grey-200)',
    background: tab === t ? 'var(--black)' : 'transparent',
    color: tab === t ? 'var(--bs-light)' : 'var(--grey-400)',
  });

  return (
    <div
      className="bs-page"
      style={{ padding: '40px clamp(16px, 4vw, 40px) 120px', maxWidth: 1000, margin: '0 auto' }}
      onDragEnd={() => setDraggingMatchId(null)}
    >
      <Link
        href={`/dashboard/player/tournaments/personalizado/${id}`}
        style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}
      >
        ← Volver al torneo
      </Link>

      {/* Header */}
      <div className="bs-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
            Calendario · Posiciones · Bracket
          </div>
          <h1 className="bs-h1" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
            {tournament.name}
          </h1>
        </div>
        <button
          type="button" onClick={handleGenerate} disabled={working || assignedCount < 2}
          style={{
            padding: '12px 22px', border: 'none', background: 'var(--black)', color: 'var(--bs-light)',
            cursor: working || assignedCount < 2 ? 'not-allowed' : 'pointer',
            opacity: assignedCount < 2 ? 0.5 : 1,
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}
        >
          {working ? 'Generando…' : matches.length > 0 ? 'Regenerar calendario' : 'Generar calendario'}
        </button>
      </div>

      {/* Organización de grupos */}
      <div style={card}>
        <div className="bs-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)' }}>
            Organización de Grupos
          </span>
          <button type="button" onClick={handleSaveGroups} disabled={savingGroups}
            style={{
              padding: '8px 16px', border: '1px solid var(--grey-300)', background: '#fff', color: 'var(--black)',
              cursor: savingGroups ? 'wait' : 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
            {savingGroups ? 'Guardando…' : 'Guardar asignación'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {tournament.categories.map(cat => {
            const g = tournament.config?.groups.find(x => x.categoryId === cat.id);
            const groupCount = Math.max(1, g?.groupCount ?? 1);
            const teamsPerGroup = g?.teamsPerGroup ?? cat.maxTeams;
            const catTeams = assignable.filter(t => t.categoryId === cat.id);
            const groupIds = Array.from({ length: groupCount }, (_, i) => `${cat.id}-G${i + 1}`);
            const unassigned = catTeams.filter(t => !t.groupId || !groupIds.includes(t.groupId));
            return (
              <div key={cat.id}>
                <div className="bs-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{cat.name} <span style={{ color: 'var(--grey-400)', fontWeight: 400 }}>· {catTeams.length} equipos</span></div>
                  <div className="bs-actions-buttons" style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => autoDistribute(cat.id, groupIds)}
                      style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', cursor: 'pointer', border: '1px solid var(--grey-200)', background: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Distribuir automáticamente
                    </button>
                    <button type="button" onClick={() => clearGroups(cat.id)}
                      style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', cursor: 'pointer', border: '1px solid var(--grey-200)', background: '#fff', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Vaciar
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  <DropColumn
                    title="Sin asignar" accent="var(--grey-300)" count={unassigned.length}
                    onDrop={() => { if (dragTeam) { assignTeamToGroup(dragTeam, null); setDragTeam(null); } }}
                  >
                    {unassigned.map(t => (
                      <TeamChip key={t.id} team={t} onDragStart={() => setDragTeam(t.id)} />
                    ))}
                  </DropColumn>
                  {groupIds.map((gid, i) => {
                    const members = catTeams.filter(t => t.groupId === gid);
                    return (
                      <DropColumn
                        key={gid} title={`Grupo ${GROUP_LETTERS[i % GROUP_LETTERS.length]}`} accent="var(--turf-green)"
                        count={members.length} capacity={teamsPerGroup}
                        onDrop={() => { if (dragTeam) { assignTeamToGroup(dragTeam, gid); setDragTeam(null); } }}
                      >
                        {members.map(t => (
                          <TeamChip key={t.id} team={t} onDragStart={() => setDragTeam(t.id)} />
                        ))}
                      </DropColumn>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {assignedCount < 2 && (
        <div style={{ ...card, background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.25)', color: '#92400e', fontSize: 13, lineHeight: 1.6 }}>
          Asigna al menos 2 equipos a sus grupos arriba (y pulsa <strong>Guardar asignación</strong>) para poder generar el calendario.
        </div>
      )}

      {matches.length === 0 && assignedCount >= 2 && (
        <div style={{ ...card, textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
          Aún no hay calendario. Pulsa <strong>Generar calendario</strong> para crear los partidos de la fase de grupos.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
          {matches.length > 0 && (
            <>{matches.length} partidos · {days.length} día{days.length === 1 ? '' : 's'} · {tournament.config?.courtNames?.length ?? tournament.courts} canchas
              {doneCount > 0 && <> · <span style={{ color: '#15803d', fontWeight: 700 }}>{doneCount} jugados</span></>}
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 1 }}>
          <button style={tabBtn('schedule')} onClick={() => setTab('schedule')}>Calendario</button>
          <button style={tabBtn('standings')} onClick={() => setTab('standings')}>Posiciones</button>
          <button style={tabBtn('bracket')} onClick={() => setTab('bracket')}>Bracket</button>
        </div>
      </div>

      {/* Multiselect toolbar (only on schedule tab with matches) */}
      {tab === 'schedule' && matches.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '8px 14px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)',
          marginBottom: 12, fontSize: 11,
        }}>
          <span style={{ color: 'var(--grey-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Selección:
          </span>
          <button onClick={handleSelectAll}
            style={{ fontSize: 11, padding: '4px 10px', cursor: 'pointer', border: '1px solid var(--grey-200)', background: '#fff', fontWeight: 600 }}>
            Seleccionar todos
          </button>
          {selectedMatchIds.size > 0 && (
            <>
              <span style={{ color: 'var(--black)', fontWeight: 700 }}>
                {selectedMatchIds.size} seleccionado{selectedMatchIds.size !== 1 ? 's' : ''}
              </span>
              <button onClick={handleClearSelection}
                style={{ fontSize: 11, padding: '4px 10px', cursor: 'pointer', border: '1px solid var(--grey-200)', background: '#fff', color: 'var(--grey-500)', fontWeight: 600 }}>
                Limpiar
              </button>
              <span style={{ color: 'var(--grey-400)', fontSize: 10 }}>
                Arrastra cualquier seleccionado a otro día para moverlos
              </span>
            </>
          )}
          {selectedMatchIds.size === 0 && (
            <span style={{ color: 'var(--grey-400)', fontSize: 10 }}>
              Haz clic en una tarjeta para seleccionarla, luego arrástrala a otro día
            </span>
          )}
        </div>
      )}

      {/* Schedule tab */}
      {tab === 'schedule' && days.map(day => {
        const dayMatches = byDay.get(day) ?? [];
        const bySlot = new Map<number, PersonalizadoMatch[]>();
        for (const m of dayMatches) {
          const arr = bySlot.get(m.slot) ?? [];
          arr.push(m);
          bySlot.set(m.slot, arr);
        }
        const slots = [...bySlot.entries()].sort((a, b) => a[0] - b[0]);
        return (
          <DayDropZone
            key={day}
            day={day}
            dragActive={!!draggingMatchId}
            onDrop={handleDropOnDay}
          >
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-600)', marginBottom: 10 }}>
              {fmtDay(day)}
            </div>
            {slots.map(([slot, slotMatches]) => (
              <div key={slot} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{slotMatches[0].time}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Franja {slot + 1}</span>
                  {slotMatches.every(m => m.result) && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', marginLeft: 'auto' }}>✓ Completada</span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                  {slotMatches.map(m => (
                    <MatchCard
                      key={m.id} match={m} teamName={teamName} catName={catName}
                      editingId={editingMatchId} savingId={savingMatchId}
                      onEdit={setEditingMatchId}
                      onSave={handleSaveResult}
                      onCancelEdit={() => setEditingMatchId(null)}
                      selected={selectedMatchIds.has(m.id)}
                      onToggleSelect={handleToggleSelect}
                      onDragStart={handleMatchDragStart}
                      isDragging={draggingMatchId === m.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </DayDropZone>
        );
      })}

      {/* Standings tab */}
      {tab === 'standings' && (
        <StandingsView tournament={tournament} teamName={teamName} />
      )}

      {/* Bracket tab */}
      {tab === 'bracket' && (
        <div>
          {tournament.categories.map(cat => {
            const catBracket = bracketMatches
              .filter(m => m.categoryId === cat.id)
              .sort((a, b) => a.round - b.round || a.slotIndex - b.slotIndex);
            const rounds = [...new Set(catBracket.map(m => m.round))].sort((a, b) => a - b);
            const liveTournament = { ...tournament, teams };
            const qualifiers = computeQualifiers(liveTournament, cat.id);

            return (
              <div key={cat.id} style={card}>
                <div className="bs-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, textTransform: 'uppercase' }}>{cat.name}</div>
                  <button type="button" onClick={() => handleGenerateBracket(cat.id)}
                    disabled={generatingBracketCat === cat.id || qualifiers.length < 2}
                    style={{
                      padding: '8px 16px', border: 'none', background: 'var(--black)', color: 'var(--bs-light)',
                      cursor: qualifiers.length < 2 ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em', opacity: qualifiers.length < 2 ? 0.5 : 1,
                    }}>
                    {generatingBracketCat === cat.id ? 'Generando…' : catBracket.length > 0 ? 'Regenerar bracket' : 'Generar bracket'}
                  </button>
                </div>

                {qualifiers.length < 2 && (
                  <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                    Aún no hay suficientes equipos clasificados en esta categoría.
                  </div>
                )}
                {qualifiers.length >= 2 && catBracket.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                    {qualifiers.length} equipos listos para clasificar. Pulsa &ldquo;Generar bracket&rdquo;.
                  </div>
                )}

                {rounds.map(r => {
                  const roundMatches = catBracket.filter(m => m.round === r);
                  return (
                    <div key={r} style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>
                        {roundMatches[0]?.roundLabel}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                        {roundMatches.map(m => (
                          <BracketMatchCard
                            key={m.id} match={m} teamName={teamName}
                            editingId={editingBracketId} savingId={savingBracketId}
                            onEdit={setEditingBracketId}
                            onSave={handleSaveBracketResult}
                            onCancelEdit={() => setEditingBracketId(null)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky save bar — only visible when there are pending calendar changes */}
      {hasPendingChanges && (
        <div className="bs-actions-row" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'var(--black)', color: '#fff',
          padding: '14px clamp(16px, 4vw, 40px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          borderTop: '2px solid var(--court-blue)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bs-light)' }}>
              Cambios sin guardar
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
              Los participantes serán notificados al guardar
            </div>
          </div>
          <div className="bs-actions-buttons" style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDiscardChanges}
              disabled={savingSchedule}
              style={{
                padding: '10px 20px', border: '1px solid rgba(255,255,255,0.25)',
                background: 'transparent', color: 'rgba(255,255,255,0.7)',
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              Descartar
            </button>
            <button
              onClick={handleSaveScheduleChanges}
              disabled={savingSchedule}
              style={{
                padding: '10px 24px', border: 'none',
                background: 'var(--bs-light)', color: 'var(--court-blue-deep)',
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                cursor: savingSchedule ? 'wait' : 'pointer',
                opacity: savingSchedule ? 0.7 : 1,
              }}
            >
              {savingSchedule ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
