'use client';

import React, { useState, useEffect, use, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  loadPersonalizadoById,
  saveControlPanel,
  saveMatchResult,
  generateGroupSchedule,
  calculateGroupStandings,
  DEFAULT_CONTROL_CONFIG,
  type PersonalizadoTournament,
  type PersonalizadoMatch,
  type MatchResult,
  type SetScore,
  type ControlPanelConfig,
} from '@/lib/personalizado-store';
import { useToast } from '@/components/ToastProvider';

// ── Styles ────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--grey-200)',
  padding: '20px clamp(14px, 3vw, 24px)',
  marginBottom: 16,
};

// ── Result form (inline, per match card) ─────────────────────────────────────

interface ResultFormProps {
  match: PersonalizadoMatch;
  teamName: (id: string) => string;
  config: ControlPanelConfig;
  saving: boolean;
  onSave: (matchId: string, result: MatchResult) => void;
  onCancel: () => void;
}

function ResultForm({ match, teamName, config, saving, onSave, onCancel }: ResultFormProps) {
  const initial = match.result
    ? match.result.sets.map(s => ({ a: String(s.a), b: String(s.b) }))
    : [{ a: '', b: '' }, { a: '', b: '' }];

  const [sets, setSets] = useState<{ a: string; b: string }[]>(initial);
  const [walkover, setWalkover] = useState<string>(match.result?.walkover ? match.result.winnerId : '');

  const setVal = (idx: number, side: 'a' | 'b', val: string) => {
    setSets(prev => {
      const next = [...prev];
      while (next.length <= idx) next.push({ a: '', b: '' });
      next[idx] = { ...next[idx], [side]: val };
      return next;
    });
  };

  // Count sets won by each side from the first two sets
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
    if (wA > wB) return match.teamAId;
    if (wB > wA) return match.teamBId;
    return null;
  }

  const winner = walkover ? walkover : computeWinner();
  const canSave = Boolean(winner);

  function handleSave() {
    if (!canSave) return;
    if (walkover) {
      onSave(match.id, { sets: [], winnerId: walkover, walkover: true });
    } else {
      const parsedSets: SetScore[] = sets
        .filter(s => s.a !== '' && s.b !== '')
        .map(s => ({ a: parseInt(s.a), b: parseInt(s.b) }));
      onSave(match.id, { sets: parsedSets, winnerId: winner!, walkover: false });
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
    color: walkover === tid ? 'var(--neon)' : 'var(--grey-400)',
  });

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--grey-100)' }}>
      {/* Walkover / forfeit */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 5 }}>
          Walkover / Retiro
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button style={woBtn(match.teamAId)}
            onClick={() => setWalkover(prev => prev === match.teamAId ? '' : match.teamAId)}>
            {teamName(match.teamAId)} gana W.O.
          </button>
          <button style={woBtn(match.teamBId)}
            onClick={() => setWalkover(prev => prev === match.teamBId ? '' : match.teamBId)}>
            {teamName(match.teamBId)} gana W.O.
          </button>
        </div>
      </div>

      {/* Set scores */}
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
            background: 'var(--black)', color: 'var(--neon)', fontWeight: 700,
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

// ── Match card ────────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: PersonalizadoMatch;
  teamName: (id: string) => string;
  catName: (id: string) => string;
  config: ControlPanelConfig;
  editingId: string | null;
  savingId: string | null;
  onEdit: (id: string) => void;
  onSave: (matchId: string, result: MatchResult) => void;
  onCancelEdit: () => void;
}

function MatchCard({ match, teamName, catName, config, editingId, savingId, onEdit, onSave, onCancelEdit }: MatchCardProps) {
  const res = match.result;
  const isEditing = editingId === match.id;
  const isSaving = savingId === match.id;

  const setsLabel = res && !res.walkover && res.sets.length > 0
    ? res.sets.map(s => `${s.a}-${s.b}`).join(' / ')
    : null;

  return (
    <div style={{
      border: `1px solid ${res ? 'var(--grey-200)' : 'var(--grey-100)'}`,
      padding: '12px 14px',
      background: res ? '#f9faf9' : 'var(--grey-50, #fafafa)',
    }}>
      {/* Court + group label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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

      {/* Inline result form */}
      {isEditing && (
        <ResultForm
          match={match} teamName={teamName} config={config}
          saving={isSaving}
          onSave={onSave} onCancel={onCancelEdit}
        />
      )}
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

  // Group by category for display
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
  const [tournament, setTournament] = useState<PersonalizadoTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [tab, setTab] = useState<'schedule' | 'standings'>('schedule');
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadPersonalizadoById(id).then(t => { if (active) { setTournament(t); setLoading(false); } });
    return () => { active = false; };
  }, [id]);

  const teamName = useMemo(() => {
    const map = new Map<string, string>();
    for (const tm of tournament?.teams ?? []) {
      map.set(tm.id, tm.player2Name ? `${tm.player1Name} / ${tm.player2Name}` : tm.player1Name);
    }
    return (tid: string) => map.get(tid) ?? '—';
  }, [tournament]);

  const catName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of tournament?.categories ?? []) map.set(c.id, c.name);
    return (cid: string) => map.get(cid) ?? '';
  }, [tournament]);

  const matches = tournament?.config?.matches ?? [];
  const assignedCount = (tournament?.teams ?? []).filter(t => (t.status === 'pending' || t.status === 'confirmed') && t.groupId).length;
  const doneCount = matches.filter(m => m.result).length;

  async function handleGenerate() {
    if (!tournament) return;
    setWorking(true);
    const generated = generateGroupSchedule(tournament);
    const config = { ...DEFAULT_CONTROL_CONFIG, ...(tournament.config ?? {}), matches: generated };
    const res = await saveControlPanel({
      id: tournament.id,
      categories: tournament.categories,
      config,
      status: tournament.status === 'configured' || tournament.status === 'registration_open' ? 'live' : undefined,
    });
    setWorking(false);
    if (!res.ok) { showToast(res.error ?? 'No se pudo generar', 'error'); return; }
    const refreshed = await loadPersonalizadoById(id);
    setTournament(refreshed);
    showToast(`Calendario generado: ${generated.length} partidos`, 'success');
  }

  const handleSaveResult = useCallback(async (matchId: string, result: MatchResult) => {
    if (!tournament) return;
    setSavingMatchId(matchId);
    const res = await saveMatchResult({ tournamentId: tournament.id, matchId, result });
    setSavingMatchId(null);
    if (!res.ok) { showToast(res.error ?? 'Error al guardar', 'error'); return; }

    // Optimistically update local state
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
    setEditingMatchId(null);
    showToast('Resultado guardado', 'success');
  }, [tournament, showToast]);

  if (loading) return <div style={{ padding: 40, color: 'var(--grey-400)', fontSize: 14 }}>Cargando…</div>;
  if (!tournament) {
    return (
      <div style={{ padding: '40px clamp(16px,4vw,40px)', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--grey-500)' }}>Torneo no encontrado.</div>
      </div>
    );
  }

  // Group matches by time slot
  const bySlot = new Map<number, PersonalizadoMatch[]>();
  for (const m of matches) {
    const arr = bySlot.get(m.slot) ?? [];
    arr.push(m);
    bySlot.set(m.slot, arr);
  }
  const slots = [...bySlot.entries()].sort((a, b) => a[0] - b[0]);

  const tabBtn = (t: 'schedule' | 'standings'): React.CSSProperties => ({
    padding: '8px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', cursor: 'pointer',
    border: tab === t ? 'none' : '1px solid var(--grey-200)',
    background: tab === t ? 'var(--black)' : 'transparent',
    color: tab === t ? 'var(--neon)' : 'var(--grey-400)',
  });

  return (
    <div style={{ padding: '40px clamp(16px, 4vw, 40px) 120px', maxWidth: 1000, margin: '0 auto' }}>
      <Link
        href={`/dashboard/player/tournaments/personalizado/${id}`}
        style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}
      >
        ← Volver al torneo
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
            Calendario · Posiciones
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
            {tournament.name}
          </h1>
        </div>
        <button
          type="button" onClick={handleGenerate} disabled={working || assignedCount < 2}
          style={{
            padding: '12px 22px', border: 'none', background: 'var(--black)', color: 'var(--neon)',
            cursor: working || assignedCount < 2 ? 'not-allowed' : 'pointer',
            opacity: assignedCount < 2 ? 0.5 : 1,
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}
        >
          {working ? 'Generando…' : matches.length > 0 ? 'Regenerar calendario' : 'Generar calendario'}
        </button>
      </div>

      {/* Warning: no groups */}
      {assignedCount < 2 && (
        <div style={{ ...card, background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.25)', color: '#92400e', fontSize: 13, lineHeight: 1.6 }}>
          Primero asigna los equipos a sus grupos en el{' '}
          <Link href={`/dashboard/player/tournaments/personalizado/${id}/control`} style={{ color: '#92400e', fontWeight: 700 }}>Panel de Control</Link>{' '}
          (bloque J). Necesitas al menos 2 equipos asignados para generar el calendario.
        </div>
      )}

      {/* Empty state */}
      {matches.length === 0 && assignedCount >= 2 && (
        <div style={{ ...card, textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
          Aún no hay calendario. Pulsa <strong>Generar calendario</strong> para crear los partidos de la fase de grupos.
        </div>
      )}

      {/* Stats + tabs */}
      {matches.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
              {matches.length} partidos · {slots.length} franjas · {tournament.config?.courtNames?.length ?? tournament.courts} canchas
              {doneCount > 0 && <> · <span style={{ color: '#15803d', fontWeight: 700 }}>{doneCount} jugados</span></>}
            </div>
            <div style={{ display: 'flex', gap: 1 }}>
              <button style={tabBtn('schedule')} onClick={() => setTab('schedule')}>Calendario</button>
              <button style={tabBtn('standings')} onClick={() => setTab('standings')}>Posiciones</button>
            </div>
          </div>

          {/* Schedule tab */}
          {tab === 'schedule' && slots.map(([slot, slotMatches]) => (
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
                    config={tournament.config!}
                    editingId={editingMatchId} savingId={savingMatchId}
                    onEdit={setEditingMatchId}
                    onSave={handleSaveResult}
                    onCancelEdit={() => setEditingMatchId(null)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Standings tab */}
          {tab === 'standings' && (
            <StandingsView tournament={tournament} teamName={teamName} />
          )}
        </>
      )}
    </div>
  );
}
