'use client';

import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  generateGroupSchedule,
  calculateGroupStandings,
  generateBracket,
  scheduleBracket,
  saveControlPanel,
  saveMatchResult,
  DEFAULT_CONTROL_CONFIG,
  type PersonalizadoTournament,
  type PersonalizadoMatch,
  type BracketMatch,
  type MatchResult,
  type SetScore,
} from '@/lib/personalizado-store';
import { useToast } from '@/components/ToastProvider';
import { WorldCupBracket } from './WorldCupBracket';

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function fmtDay(day: string): string {
  try {
    const d = new Date(`${day}T00:00:00`);
    const s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch { return day; }
}

// ── ResultForm ────────────────────────────────────────────────────────────────

function ResultForm({ matchId, teamAId, teamBId, result, teamName, saving, onSave, onCancel }: {
  matchId: string; teamAId: string; teamBId: string; result?: MatchResult;
  teamName: (id: string) => string; saving: boolean;
  onSave: (matchId: string, result: MatchResult) => void; onCancel: () => void;
}) {
  const initial = result ? result.sets.map(s => ({ a: String(s.a), b: String(s.b) })) : [{ a: '', b: '' }, { a: '', b: '' }];
  const [sets, setSets] = useState<{ a: string; b: string }[]>(initial);
  const [walkover, setWalkover] = useState<string>(result?.walkover ? result.winnerId : '');

  const setVal = (idx: number, side: 'a' | 'b', val: string) =>
    setSets(prev => { const n = [...prev]; while (n.length <= idx) n.push({ a: '', b: '' }); n[idx] = { ...n[idx], [side]: val }; return n; });

  const scored2 = sets.slice(0, 2).filter(s => s.a !== '' && s.b !== '');
  let s2A = 0, s2B = 0;
  for (const s of scored2) { if (parseInt(s.a) > parseInt(s.b)) s2A++; else if (parseInt(s.b) > parseInt(s.a)) s2B++; }
  const needsSet3 = scored2.length === 2 && s2A === s2B;
  const hasSet3Val = sets[2]?.a !== '' || sets[2]?.b !== '';
  const showSet3 = needsSet3 || hasSet3Val;

  function computeWinner(): string | null {
    const played = sets.filter(s => s.a !== '' && s.b !== '');
    if (played.length === 0) return null;
    let wA = 0, wB = 0;
    for (const s of played) { if (parseInt(s.a) > parseInt(s.b)) wA++; else if (parseInt(s.b) > parseInt(s.a)) wB++; }
    if (wA > wB) return teamAId; if (wB > wA) return teamBId; return null;
  }
  const winner = walkover ? walkover : computeWinner();
  const canSave = Boolean(winner);
  const inputSt: React.CSSProperties = { width: 44, textAlign: 'center', border: '1px solid var(--grey-200)', padding: '5px 2px', fontSize: 14, fontWeight: 700, outline: 'none' };
  const woBtn = (tid: string): React.CSSProperties => ({ fontSize: 10, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', border: `1px solid ${walkover === tid ? 'var(--black)' : 'var(--grey-200)'}`, background: walkover === tid ? 'var(--black)' : 'transparent', color: walkover === tid ? 'var(--neon)' : 'var(--grey-400)' });

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--grey-100)' }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>Walkover / Retiro</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button style={woBtn(teamAId)} onClick={() => setWalkover(p => p === teamAId ? '' : teamAId)}>{teamName(teamAId)} gana W.O.</button>
          <button style={woBtn(teamBId)} onClick={() => setWalkover(p => p === teamBId ? '' : teamBId)}>{teamName(teamBId)} gana W.O.</button>
        </div>
      </div>
      {!walkover && (
        <div style={{ marginBottom: 8 }}>
          {[0, 1, 2].map(idx => {
            if (idx === 2 && !showSet3) return null;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--grey-400)', fontWeight: 600, width: 30, flexShrink: 0 }}>Set {idx + 1}</span>
                <input type="number" min="0" max="99" style={inputSt} value={sets[idx]?.a ?? ''} onChange={e => setVal(idx, 'a', e.target.value)} />
                <span style={{ color: 'var(--grey-300)', fontWeight: 700 }}>–</span>
                <input type="number" min="0" max="99" style={inputSt} value={sets[idx]?.b ?? ''} onChange={e => setVal(idx, 'b', e.target.value)} />
              </div>
            );
          })}
        </div>
      )}
      {winner && !walkover && <div style={{ fontSize: 11, color: 'var(--grey-500)', marginBottom: 6 }}>Gana: <strong>{teamName(winner)}</strong></div>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button disabled={!canSave || saving} onClick={() => { if (!canSave) return; walkover ? onSave(matchId, { sets: [], winnerId: walkover, walkover: true }) : onSave(matchId, { sets: sets.filter(s => s.a !== '' && s.b !== '').map(s => ({ a: parseInt(s.a), b: parseInt(s.b) }) as SetScore), winnerId: winner!, walkover: false }); }}
          style={{ fontSize: 11, padding: '6px 14px', border: 'none', cursor: canSave && !saving ? 'pointer' : 'not-allowed', background: 'var(--black)', color: 'var(--neon)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: canSave && !saving ? 1 : 0.45 }}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button disabled={saving} onClick={onCancel} style={{ fontSize: 11, padding: '6px 14px', border: '1px solid var(--grey-200)', background: 'transparent', color: 'var(--grey-500)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Standings tab ─────────────────────────────────────────────────────────────

function StandingsView({ tournament, teamName }: { tournament: PersonalizadoTournament; teamName: (id: string) => string }) {
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
    return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--grey-400)', fontSize: 14 }}>Genera el calendario primero para ver las posiciones.</div>;
  }

  const byCategory = new Map<string, typeof groups>();
  for (const g of groups) { const arr = byCategory.get(g.categoryId) ?? []; arr.push(g); byCategory.set(g.categoryId, arr); }

  const th: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { fontSize: 12, padding: '7px 8px', textAlign: 'right', borderTop: '1px solid var(--grey-100)' };

  return (
    <div>
      {[...byCategory.entries()].map(([catId, catGroups]) => (
        <div key={catId} style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>{catGroups[0].categoryName}</div>
          {catGroups.map(g => {
            const qualifyN = tournament.config?.groups.find(gc => gc.categoryId === catId)?.qualifyPerGroup ?? 2;
            const standings = calculateGroupStandings(tournament, catId, g.groupId);
            const matchesInGroup = (tournament.config?.matches ?? []).filter(m => m.categoryId === catId && m.groupId === g.groupId);
            const doneCount = matchesInGroup.filter(m => m.result).length;
            return (
              <div key={g.groupId} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Grupo {g.groupLabel}</div>
                  <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{doneCount}/{matchesInGroup.length} partidos jugados</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
                    <thead>
                      <tr>
                        <th style={{ ...th, textAlign: 'left', width: 24 }}>#</th>
                        <th style={{ ...th, textAlign: 'left' }}>Equipo</th>
                        <th style={th}>PJ</th><th style={th}>PG</th><th style={th}>PE</th><th style={th}>PP</th>
                        <th style={th}>JF</th><th style={th}>JC</th><th style={th}>+/−</th>
                        <th style={{ ...th, color: 'var(--grey-700)' }}>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row, idx) => {
                        const classified = idx < qualifyN && doneCount === matchesInGroup.length && matchesInGroup.length > 0;
                        return (
                          <tr key={row.teamId} style={{ background: classified ? 'rgba(34,197,94,0.07)' : idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                            <td style={{ ...td, textAlign: 'left', fontWeight: 700, color: classified ? '#15803d' : 'var(--grey-400)', fontSize: 11 }}>{idx + 1}</td>
                            <td style={{ ...td, textAlign: 'left', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {teamName(row.teamId)}{classified && <span style={{ marginLeft: 5, fontSize: 9, color: '#15803d', fontWeight: 700 }}>✓</span>}
                            </td>
                            <td style={td}>{row.pj}</td><td style={td}>{row.pg}</td><td style={td}>{row.pe}</td><td style={td}>{row.pp}</td>
                            <td style={td}>{row.jf}</td><td style={td}>{row.jc}</td>
                            <td style={{ ...td, color: row.diff > 0 ? '#15803d' : row.diff < 0 ? '#dc2626' : 'inherit', fontWeight: 700 }}>{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
                            <td style={{ ...td, fontWeight: 800, fontSize: 14, color: 'var(--grey-800)' }}>{row.pts}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {doneCount === matchesInGroup.length && matchesInGroup.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 10, color: '#15803d', fontWeight: 600 }}>✓ Clasifican: top {qualifyN} del grupo</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Court calendar ─────────────────────────────────────────────────────────────

const SLOT_W = 150; // px per time slot
const COURT_H = 80; // px per court row
const LABEL_W = 130; // left label column width

function CourtCalendar({ tournament, canManage, onUpdate }: {
  tournament: PersonalizadoTournament; canManage: boolean; onUpdate: (t: PersonalizadoTournament) => void;
}) {
  const { showToast } = useToast();
  const cfg = tournament.config ?? DEFAULT_CONTROL_CONFIG;
  const matches: PersonalizadoMatch[] = cfg.matches ?? [];
  const courts = cfg.courtNames.length > 0 ? cfg.courtNames : Array.from({ length: Math.max(1, tournament.courts || 1) }, (_, i) => `Cancha ${i + 1}`);

  const [generating, setGenerating] = useState(false);
  const [dragMatchId, setDragMatchId] = useState<string | null>(null);
  const [savingResultId, setSavingResultId] = useState<string | null>(null);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);

  const days = useMemo(() => [...new Set(matches.map(m => m.day))].sort(), [matches]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const activeDay = selectedDay || days[0] || '';

  const startTime = cfg.schedule.startTime || '09:00';
  const endTime = cfg.schedule.endTime ?? '21:00';
  const matchDur = cfg.schedule.matchDurationMin || 50;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  const totalSlots = Math.max(4, Math.ceil((endMins - startMins) / matchDur));

  function slotToTime(slot: number): string {
    const m = startMins + slot * matchDur;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  const dayMatches = matches.filter(m => m.day === activeDay);
  const teamMap = useMemo(() => new Map(tournament.teams.map(t => [t.id, t.player2Name ? `${t.player1Name} / ${t.player2Name}` : t.player1Name])), [tournament.teams]);
  const teamName = (id: string) => teamMap.get(id) ?? '—';

  const catMap = useMemo(() => new Map(tournament.categories.map(c => [c.id, c.name])), [tournament.categories]);

  async function handleGenerate() {
    setGenerating(true);
    const generated = generateGroupSchedule(tournament);
    if (generated.length === 0) {
      showToast('No hay equipos asignados a grupos. Completa la formación de grupos primero.', 'error');
      setGenerating(false);
      return;
    }
    const newCfg = { ...cfg, matches: generated };
    const res = await saveControlPanel({ id: tournament.id, categories: tournament.categories, config: newCfg });
    setGenerating(false);
    if (!res.ok) { showToast(res.error ?? 'Error al generar', 'error'); return; }
    onUpdate({ ...tournament, config: newCfg });
    const newDays = [...new Set(generated.map(m => m.day))].sort();
    setSelectedDay(newDays[0] ?? '');
    showToast(`Calendario generado: ${generated.length} partidos`, 'success');
  }

  function handleDrop(slotIdx: number, courtName: string) {
    if (!dragMatchId) return;
    const newTime = slotToTime(slotIdx);
    const updated = matches.map(m => m.id === dragMatchId ? { ...m, slot: slotIdx, time: newTime, courtName } : m);
    const newCfg = { ...cfg, matches: updated };
    saveControlPanel({ id: tournament.id, categories: tournament.categories, config: newCfg }).then(res => {
      if (!res.ok) showToast(res.error ?? 'Error al mover', 'error');
    });
    onUpdate({ ...tournament, config: newCfg });
    setDragMatchId(null);
  }

  async function handleSaveResult(matchId: string, result: MatchResult) {
    setSavingResultId(matchId);
    const res = await saveMatchResult({ tournamentId: tournament.id, matchId, result });
    setSavingResultId(null);
    if (!res.ok) { showToast(res.error ?? 'Error al guardar', 'error'); return; }
    const updated = matches.map(m => m.id === matchId ? { ...m, result, status: 'done' as const } : m);
    onUpdate({ ...tournament, config: { ...cfg, matches: updated } });
    setEditingResultId(null);
    showToast('Resultado guardado', 'success');
  }

  if (matches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', border: '1px solid var(--grey-100)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--black)', marginBottom: 8 }}>Calendario no generado</div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
          Configura las fechas y horarios en el Panel de Control, luego genera el calendario de partidos.
        </div>
        {canManage && (
          <button onClick={handleGenerate} disabled={generating} style={{ padding: '12px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: generating ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {generating ? 'Generando…' : '📅 Generar Calendario'}
          </button>
        )}
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${tournament.code}/live` : `/t/${tournament.code}/live`;

  return (
    <div>
      {/* Day navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {days.map(d => (
            <button key={d} onClick={() => setSelectedDay(d)} style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', border: 'none', background: activeDay === d ? 'var(--black)' : 'var(--grey-100)', color: activeDay === d ? 'var(--neon)' : 'var(--grey-500)' }}>
              {fmtDay(d)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canManage && (
            <button onClick={handleGenerate} disabled={generating} style={{ padding: '7px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', border: '1px solid var(--grey-200)', background: '#fff', color: 'var(--grey-500)' }}>
              {generating ? '…' : 'Regenerar'}
            </button>
          )}
          <button onClick={() => setShowShare(p => !p)} style={{ padding: '7px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', border: '1px solid var(--grey-200)', background: showShare ? 'var(--black)' : '#fff', color: showShare ? 'var(--neon)' : 'var(--grey-500)' }}>
            🔗 Compartir
          </button>
        </div>
      </div>

      {/* Share panel */}
      {showShare && (
        <div style={{ marginBottom: 16, padding: 20, background: '#fff', border: '1px solid var(--grey-100)', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <QRCodeSVG value={shareUrl} size={100} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 6 }}>Vista pública del calendario</div>
            <div style={{ fontSize: 12, color: 'var(--grey-500)', wordBreak: 'break-all', marginBottom: 8 }}>{shareUrl}</div>
            <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Los jugadores pueden escanear para ver cuándo les toca jugar (sin cuenta).</div>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div style={{ overflowX: 'auto', overflowY: 'visible', border: '1px solid var(--grey-100)', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${LABEL_W}px repeat(${totalSlots}, ${SLOT_W}px)`, gridTemplateRows: `40px repeat(${courts.length}, ${COURT_H}px)`, minWidth: LABEL_W + totalSlots * SLOT_W }}>
          {/* Top-left corner */}
          <div style={{ gridColumn: 1, gridRow: 1, background: '#fff', borderBottom: '2px solid var(--grey-100)', borderRight: '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--grey-400)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cancha</span>
          </div>

          {/* Time headers */}
          {Array.from({ length: totalSlots }, (_, i) => (
            <div key={i} style={{ gridColumn: i + 2, gridRow: 1, background: '#fff', borderBottom: '2px solid var(--grey-100)', borderRight: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey-500)', letterSpacing: '0.04em' }}>{slotToTime(i)}</span>
            </div>
          ))}

          {/* Court rows */}
          {courts.map((court, courtIdx) => (
            <React.Fragment key={court}>
              {/* Court label */}
              <div style={{ gridColumn: 1, gridRow: courtIdx + 2, background: 'var(--grey-50, #fafafa)', borderBottom: '1px solid var(--grey-100)', borderRight: '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-600)', letterSpacing: '0.04em' }}>{court}</span>
              </div>

              {/* Time slot cells */}
              {Array.from({ length: totalSlots }, (_, slotIdx) => {
                const match = dayMatches.find(m => m.courtName === court && m.slot === slotIdx);
                const isEditing = editingResultId === match?.id;
                const isDragging = dragMatchId === match?.id;

                return (
                  <div
                    key={slotIdx}
                    onDragOver={e => { e.preventDefault(); }}
                    onDrop={e => { e.preventDefault(); handleDrop(slotIdx, court); }}
                    style={{ gridColumn: slotIdx + 2, gridRow: courtIdx + 2, borderBottom: '1px solid var(--grey-100)', borderRight: '1px solid rgba(0,0,0,0.04)', position: 'relative', background: dragMatchId && !match ? 'rgba(214,255,0,0.04)' : 'transparent', transition: 'background 0.1s' }}
                  >
                    {match && (
                      <div
                        draggable={canManage && !isEditing}
                        onDragStart={e => { if (!canManage) return; e.dataTransfer.effectAllowed = 'move'; setDragMatchId(match.id); }}
                        onDragEnd={() => setDragMatchId(null)}
                        style={{ position: 'absolute', inset: 3, background: match.result ? '#f0fdf4' : 'var(--neon, #d6ff00)', border: `1px solid ${match.result ? '#bbf7d0' : 'rgba(0,0,0,0.15)'}`, padding: '5px 7px', cursor: canManage ? 'grab' : 'default', opacity: isDragging ? 0.4 : 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 2 }}
                        onClick={() => !isDragging && canManage && setEditingResultId(isEditing ? null : match.id)}
                      >
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.5)' }}>
                          {catMap.get(match.categoryId) ?? ''} · Gr.{match.groupLabel}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#111', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamName(match.teamAId)}</div>
                        <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.4)', fontWeight: 700 }}>vs</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#111', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamName(match.teamBId)}</div>
                        {match.result && (
                          <div style={{ fontSize: 9, color: '#15803d', fontWeight: 700, marginTop: 2 }}>
                            ✓ {match.result.walkover ? 'W.O.' : match.result.sets.map(s => `${s.a}-${s.b}`).join(' / ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Inline result form for selected match */}
      {editingResultId && (() => {
        const m = dayMatches.find(x => x.id === editingResultId);
        if (!m) return null;
        return (
          <div style={{ marginTop: 8, padding: 16, background: '#fff', border: '1px solid var(--grey-200)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 10 }}>
              Resultado — {catMap.get(m.categoryId)} · Grupo {m.groupLabel} · {m.courtName} · {m.time}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{teamName(m.teamAId)} vs {teamName(m.teamBId)}</div>
            <ResultForm
              matchId={m.id} teamAId={m.teamAId} teamBId={m.teamBId} result={m.result}
              teamName={teamName} saving={savingResultId === m.id}
              onSave={handleSaveResult} onCancel={() => setEditingResultId(null)}
            />
          </div>
        );
      })()}

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--grey-400)' }}>
        {canManage ? 'Arrastrá los partidos para cambiar de cancha u horario. Hacé clic en un partido para registrar el resultado.' : 'Vista de solo lectura.'}
      </div>
    </div>
  );
}

// ── Bracket tab ────────────────────────────────────────────────────────────────

function BracketTab({ tournament, canManage, onUpdate }: {
  tournament: PersonalizadoTournament; canManage: boolean; onUpdate: (t: PersonalizadoTournament) => void;
}) {
  const { showToast } = useToast();
  const [selectedCatId, setSelectedCatId] = useState<string>(tournament.categories[0]?.id ?? '');
  const [generating, setGenerating] = useState<string | null>(null);

  const teamMap = useMemo(() => new Map(tournament.teams.map(t => [t.id, t.player2Name ? `${t.player1Name} / ${t.player2Name}` : t.player1Name])), [tournament.teams]);
  const teamName = (id: string) => teamMap.get(id) ?? '—';

  const allBracketMatches = tournament.config?.bracketMatches ?? [];

  async function handleGenerateBracket(catId: string) {
    setGenerating(catId);
    const built = generateBracket(tournament, catId);
    const scheduled = scheduleBracket(tournament, built);
    const merged = [...allBracketMatches.filter(m => m.categoryId !== catId), ...scheduled];
    const newCfg = { ...(tournament.config ?? DEFAULT_CONTROL_CONFIG), bracketMatches: merged };
    const res = await saveControlPanel({ id: tournament.id, categories: tournament.categories, config: newCfg });
    setGenerating(null);
    if (!res.ok) { showToast(res.error ?? 'No se pudo generar el bracket', 'error'); return; }
    onUpdate({ ...tournament, config: newCfg });
    showToast(`Bracket generado: ${scheduled.length} partidos`, 'success');
  }

  function handleBracketUpdate(catId: string, newMatches: BracketMatch[]) {
    const merged = [...allBracketMatches.filter(m => m.categoryId !== catId), ...newMatches];
    onUpdate({ ...tournament, config: { ...(tournament.config ?? DEFAULT_CONTROL_CONFIG), bracketMatches: merged } });
  }

  const catBracket = allBracketMatches.filter(m => m.categoryId === selectedCatId);

  return (
    <div>
      {/* Category selector */}
      {tournament.categories.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {tournament.categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCatId(cat.id)} style={{ padding: '7px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', border: 'none', background: selectedCatId === cat.id ? 'var(--black)' : 'var(--grey-100)', color: selectedCatId === cat.id ? 'var(--neon)' : 'var(--grey-500)' }}>
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <WorldCupBracket
        tournament={tournament}
        categoryId={selectedCatId}
        bracketMatches={catBracket}
        teamName={teamName}
        canManage={canManage}
        onBracketUpdate={(newMatches) => handleBracketUpdate(selectedCatId, newMatches)}
      />

      {/* Generate bracket button (shown when bracket doesn't exist) */}
      {canManage && catBracket.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => void handleGenerateBracket(selectedCatId)}
            disabled={generating === selectedCatId}
            style={{ padding: '12px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: generating === selectedCatId ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            {generating === selectedCatId ? 'Generando…' : '🏆 Generar Bracket'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main exported component ─────────────────────────────────────────────────────

export function TournamentTabs({ tournament, canManage, onUpdate }: {
  tournament: PersonalizadoTournament;
  canManage: boolean;
  onUpdate: (t: PersonalizadoTournament) => void;
}) {
  const [activeTab, setActiveTab] = useState<'calendario' | 'clasificacion' | 'bracket'>('calendario');

  const teamMap = useMemo(() => new Map(tournament.teams.map(t => [t.id, t.player2Name ? `${t.player1Name} / ${t.player2Name}` : t.player1Name])), [tournament.teams]);
  const teamName = (id: string) => teamMap.get(id) ?? '—';

  const tabs = [
    { key: 'calendario' as const, label: '📅 Calendario' },
    { key: 'clasificacion' as const, label: '📊 Clasificación' },
    { key: 'bracket' as const, label: '🏆 Bracket' },
  ];

  return (
    <div style={{ marginTop: 8, border: '2px solid var(--black)' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--black)', background: 'var(--black)' }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{ flex: 1, padding: '12px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', border: 'none', background: activeTab === key ? '#fff' : 'transparent', color: activeTab === key ? 'var(--black)' : 'rgba(214,255,0,0.7)', transition: 'all 0.15s' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '20px clamp(12px, 3vw, 24px) 28px' }}>
        {activeTab === 'calendario' && (
          <CourtCalendar tournament={tournament} canManage={canManage} onUpdate={onUpdate} />
        )}
        {activeTab === 'clasificacion' && (
          <StandingsView tournament={tournament} teamName={teamName} />
        )}
        {activeTab === 'bracket' && (
          <BracketTab tournament={tournament} canManage={canManage} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  );
}
