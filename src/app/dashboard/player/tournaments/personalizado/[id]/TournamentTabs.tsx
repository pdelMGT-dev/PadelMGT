'use client';

import React, { useState, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CalendarDays, BarChart3, Trophy, Plus, Minus, Share2, RefreshCw,
  ChevronDown, ChevronRight, Play, GripVertical, Move,
} from 'lucide-react';
import {
  generateGroupSchedule,
  generateBracket,
  scheduleAllBrackets,
  calculateGroupStandings,
  computeQualifiedTable,
  saveControlPanel,
  saveMatchResult,
  DEFAULT_CONTROL_CONFIG,
  type PersonalizadoTournament,
  type PersonalizadoMatch,
  type BracketMatch,
  type MatchResult,
} from '@/lib/personalizado-store';
import { useToast } from '@/components/ToastProvider';
import { ScoreEntry } from './ScoreEntry';
import { WorldCupBracket } from './WorldCupBracket';

function fmtDay(day: string): string {
  try {
    const d = new Date(`${day}T00:00:00`);
    const s = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    return s.charAt(0).toUpperCase() + s.slice(1).replace('.', '');
  } catch { return day; }
}
function fmtDayLong(day: string): string {
  try {
    const d = new Date(`${day}T00:00:00`);
    const s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch { return day; }
}

// Match status → calendar colors. Blue = scheduled, Green = live, Black/neon = done.
function matchVisual(m: { result?: unknown; status: string }) {
  if (m.result || m.status === 'done') return { bg: '#0a0a0a', fg: 'var(--neon, #d6ff00)', sub: 'rgba(214,255,0,0.6)', label: 'FINAL', done: true, live: false };
  if (m.status === 'playing') return { bg: '#16a34a', fg: '#ffffff', sub: 'rgba(255,255,255,0.8)', label: 'EN VIVO', done: false, live: true };
  return { bg: '#3b82f6', fg: '#ffffff', sub: 'rgba(255,255,255,0.78)', label: '', done: false, live: false };
}

const scoreStr = (r: MatchResult) => r.walkover ? 'W.O.' : r.sets.map(s => `${s.a}-${s.b}`).join(' ');

// ── Standings tab ─────────────────────────────────────────────────────────────

function StandingsView({ tournament, teamName }: { tournament: PersonalizadoTournament; teamName: (id: string) => string }) {
  const cats = useMemo(() => {
    const result: { categoryId: string; categoryName: string; groups: { groupId: string; groupLabel: string }[] }[] = [];
    const catSeen = new Map<string, Set<string>>();
    for (const m of tournament.config?.matches ?? []) {
      let entry = result.find(r => r.categoryId === m.categoryId);
      if (!entry) {
        const cat = tournament.categories.find(c => c.id === m.categoryId);
        entry = { categoryId: m.categoryId, categoryName: cat?.name ?? m.categoryId, groups: [] };
        result.push(entry);
        catSeen.set(m.categoryId, new Set());
      }
      const seen = catSeen.get(m.categoryId)!;
      if (!seen.has(m.groupId)) { seen.add(m.groupId); entry.groups.push({ groupId: m.groupId, groupLabel: m.groupLabel }); }
    }
    return result;
  }, [tournament]);

  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() => Object.fromEntries(cats.map(c => [c.categoryId, true])));
  const [openMatches, setOpenMatches] = useState<Record<string, boolean>>({});
  const [openQualified, setOpenQualified] = useState<Record<string, boolean>>({});

  if (cats.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--grey-400)', fontSize: 14 }}>Genera el calendario primero para ver las posiciones.</div>;
  }

  const th: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-400)', padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { fontSize: 12, padding: '7px 8px', textAlign: 'right', borderTop: '1px solid var(--grey-100)' };

  return (
    <div>
      {cats.map(cat => {
        const catOpen = openCats[cat.categoryId] ?? true;
        const qualifyN = tournament.config?.groups.find(gc => gc.categoryId === cat.categoryId)?.qualifyPerGroup ?? 2;
        const qualified = computeQualifiedTable(tournament, cat.categoryId);
        const qOpen = openQualified[cat.categoryId] ?? false;
        return (
          <div key={cat.categoryId} style={{ marginBottom: 22, border: '1px solid var(--grey-200)', background: '#fff' }}>
            {/* Category header (collapsible) */}
            <button
              onClick={() => setOpenCats(p => ({ ...p, [cat.categoryId]: !catOpen }))}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 16px', background: catOpen ? 'var(--black)' : '#fff', color: catOpen ? 'var(--neon)' : 'var(--black)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              {catOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{cat.categoryName}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, opacity: 0.7 }}>{cat.groups.length} grupos</span>
            </button>

            {catOpen && (
              <div style={{ padding: '14px 16px' }}>
                {cat.groups.map(g => {
                  const standings = calculateGroupStandings(tournament, cat.categoryId, g.groupId);
                  const groupMatches = (tournament.config?.matches ?? []).filter(m => m.categoryId === cat.categoryId && m.groupId === g.groupId);
                  const doneCount = groupMatches.filter(m => m.result).length;
                  const mKey = `${cat.categoryId}|${g.groupId}`;
                  const matchesOpen = openMatches[mKey] ?? false;
                  return (
                    <div key={g.groupId} style={{ marginBottom: 16, border: '1px solid var(--grey-100)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--grey-50, #fafafa)' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>Grupo {g.groupLabel}</div>
                        <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{doneCount}/{groupMatches.length} jugados</div>
                      </div>
                      <div style={{ overflowX: 'auto', padding: '0 12px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                          <thead>
                            <tr>
                              <th style={{ ...th, textAlign: 'left', width: 22 }}>#</th>
                              <th style={{ ...th, textAlign: 'left' }}>Equipo</th>
                              <th style={th}>PJ</th><th style={th}>PG</th><th style={th}>PP</th>
                              <th style={th}>JF</th><th style={th}>JC</th><th style={th}>+/−</th>
                              <th style={{ ...th, color: 'var(--grey-700)' }}>Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings.map((row, idx) => {
                              const cls = idx < qualifyN;
                              return (
                                <tr key={row.teamId} style={{ background: cls ? 'rgba(34,197,94,0.07)' : idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                                  <td style={{ ...td, textAlign: 'left', fontWeight: 700, color: cls ? '#15803d' : 'var(--grey-400)', fontSize: 11 }}>{idx + 1}</td>
                                  <td style={{ ...td, textAlign: 'left', fontWeight: 600, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamName(row.teamId)}</td>
                                  <td style={td}>{row.pj}</td><td style={td}>{row.pg}</td><td style={td}>{row.pp}</td>
                                  <td style={td}>{row.jf}</td><td style={td}>{row.jc}</td>
                                  <td style={{ ...td, color: row.diff > 0 ? '#15803d' : row.diff < 0 ? '#dc2626' : 'inherit', fontWeight: 700 }}>{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
                                  <td style={{ ...td, fontWeight: 800, fontSize: 14, color: 'var(--grey-800)' }}>{row.pts}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* Matches in group (collapsible) */}
                      <button
                        onClick={() => setOpenMatches(p => ({ ...p, [mKey]: !matchesOpen }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', marginTop: 4, background: 'none', border: 'none', borderTop: '1px solid var(--grey-100)', cursor: 'pointer', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-400)' }}
                      >
                        {matchesOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Partidos del grupo
                      </button>
                      {matchesOpen && (
                        <div style={{ padding: '0 12px 10px' }}>
                          {groupMatches.map(m => (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--grey-50, #f4f4f4)', fontSize: 12, gap: 8 }}>
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: m.result && m.result.winnerId === m.teamAId ? 700 : 500, color: m.result && m.result.winnerId === m.teamAId ? 'var(--black)' : 'var(--grey-500)' }}>{teamName(m.teamAId)}</span>
                              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: m.result ? 'var(--black)' : 'var(--grey-300)', minWidth: 60, textAlign: 'center' }}>{m.result ? scoreStr(m.result) : 'vs'}</span>
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: m.result && m.result.winnerId === m.teamBId ? 700 : 500, color: m.result && m.result.winnerId === m.teamBId ? 'var(--black)' : 'var(--grey-500)' }}>{teamName(m.teamBId)}</span>
                            </div>
                          ))}
                          {groupMatches.length === 0 && <div style={{ fontSize: 11, color: 'var(--grey-300)', padding: '8px 0' }}>Sin partidos.</div>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Consolidated qualified table (collapsible) */}
                {qualified.length > 0 && (
                  <div style={{ marginTop: 8, border: '1px solid rgba(34,197,94,0.3)' }}>
                    <button
                      onClick={() => setOpenQualified(p => ({ ...p, [cat.categoryId]: !qOpen }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      {qOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      <Trophy size={14} color="#15803d" />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#15803d' }}>Clasificados a Eliminatoria ({qualified.length})</span>
                    </button>
                    {qOpen && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
                          <thead>
                            <tr>
                              <th style={{ ...th, textAlign: 'left', width: 28 }}>#</th>
                              <th style={{ ...th, textAlign: 'left' }}>Equipo</th>
                              <th style={{ ...th, textAlign: 'left' }}>Posición</th>
                            </tr>
                          </thead>
                          <tbody>
                            {qualified.map(q => (
                              <tr key={q.teamId}>
                                <td style={{ ...td, textAlign: 'left', fontWeight: 700, color: 'var(--grey-400)', fontSize: 11 }}>{q.seed}</td>
                                <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{teamName(q.teamId)}</td>
                                <td style={{ ...td, textAlign: 'left', fontSize: 11, color: q.wildcard ? '#b45309' : 'var(--grey-500)', fontWeight: 600 }}>{q.positionLabel}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Court calendar ─────────────────────────────────────────────────────────────

const SLOT_W = 158;
const COURT_H = 84;
const HEADER_H = 38;

function CourtCalendar({ tournament, canManage, canEditResults, onUpdate }: {
  tournament: PersonalizadoTournament; canManage: boolean; canEditResults: boolean; onUpdate: (t: PersonalizadoTournament) => void;
}) {
  const { showToast } = useToast();
  const cfg = tournament.config ?? DEFAULT_CONTROL_CONFIG;
  const matches: PersonalizadoMatch[] = useMemo(() => cfg.matches ?? [], [cfg.matches]);
  const scheduledBracketMatches = useMemo(
    () => (cfg.bracketMatches ?? []).filter(m => !!m.day && !!m.time && m.slot !== undefined && !!m.courtName) as (BracketMatch & { day: string; time: string; slot: number; courtName: string })[],
    [cfg.bracketMatches]
  );
  const courts = cfg.courtNames.length > 0 ? cfg.courtNames : Array.from({ length: Math.max(1, tournament.courts || 1) }, (_, i) => `Cancha ${i + 1}`);
  const setsCount = cfg.scoreQualification?.sets ?? 1;

  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragMatchId, setDragMatchId] = useState<string | null>(null);
  const [savingResultId, setSavingResultId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [labelW, setLabelW] = useState(140);
  const resizing = useRef(false);

  const days = useMemo(() => {
    const all = [...matches.map(m => m.day), ...scheduledBracketMatches.map(m => m.day)];
    return [...new Set(all)].sort();
  }, [matches, scheduledBracketMatches]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const activeDay = selectedDay && days.includes(selectedDay) ? selectedDay : days[0] || '';

  const startTime = cfg.schedule.startTime || '09:00';
  const endTime = cfg.schedule.endTime ?? '21:00';
  const matchDur = cfg.schedule.matchDurationMin || 50;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  const totalSlots = Math.max(6, Math.ceil((endMins - startMins) / matchDur));

  const slotToTime = (slot: number) => {
    const m = startMins + slot * matchDur;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };

  const dayGroupMatches = matches.filter(m => m.day === activeDay);
  const dayBracketMatches = scheduledBracketMatches.filter(m => m.day === activeDay);
  const teamMap = useMemo(() => new Map(tournament.teams.map(t => [t.id, t.player2Name ? `${t.player1Name} / ${t.player2Name}` : t.player1Name])), [tournament.teams]);
  const teamName = (id: string) => teamMap.get(id) ?? '—';
  const catMap = useMemo(() => new Map(tournament.categories.map(c => [c.id, c.name])), [tournament.categories]);

  // Resizer for the sticky court column.
  function startResize(e: React.MouseEvent) {
    e.preventDefault(); resizing.current = true;
    const startX = e.clientX, startW = labelW;
    const move = (ev: MouseEvent) => { if (resizing.current) setLabelW(Math.max(90, Math.min(280, startW + ev.clientX - startX))); };
    const up = () => { resizing.current = false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  }

  async function persist(newCfg: typeof cfg, optimistic = true) {
    if (optimistic) onUpdate({ ...tournament, config: newCfg });
    const res = await saveControlPanel({ id: tournament.id, categories: tournament.categories, config: newCfg });
    if (!res.ok) showToast(res.error ?? 'No se pudo guardar', 'error');
    return res.ok;
  }

  async function handleGenerate() {
    setGenerating(true);
    const generated = generateGroupSchedule(tournament);
    if (generated.length === 0) {
      showToast('No hay equipos asignados a grupos. Completa la formación de grupos primero.', 'error');
      setGenerating(false); return;
    }
    const allBracketUnscheduled = tournament.categories.flatMap(cat => generateBracket(tournament, cat.id));
    const tempT = { ...tournament, config: { ...cfg, matches: generated } };
    const bracketMatches = scheduleAllBrackets(tempT, allBracketUnscheduled);
    const newCfg = { ...cfg, matches: generated, bracketMatches };
    const ok = await persist(newCfg);
    setGenerating(false);
    if (ok) {
      setSelectedDay([...new Set(generated.map(m => m.day))].sort()[0] ?? '');
      showToast(`Calendario regenerado: ${generated.length} clasificación + ${bracketMatches.length} eliminatoria`, 'success');
    }
  }

  function updateMatch(matchId: string, patch: Partial<PersonalizadoMatch>) {
    const updated = matches.map(m => m.id === matchId ? { ...m, ...patch } : m);
    void persist({ ...cfg, matches: updated });
  }

  function handleDropOnCell(slotIdx: number, courtName: string) {
    if (!dragMatchId) return;
    updateMatch(dragMatchId, { slot: slotIdx, time: slotToTime(slotIdx), courtName });
    setDragMatchId(null);
  }

  function handleDropOnDay(day: string) {
    if (!dragMatchId) return;
    // first free (slot, court) on the target day
    const occupied = new Set(matches.filter(m => m.day === day && m.id !== dragMatchId).map(m => `${m.courtName}|${m.slot}`));
    for (let s = 0; s < totalSlots; s++) {
      for (const c of courts) {
        if (!occupied.has(`${c}|${s}`)) { updateMatch(dragMatchId, { day, slot: s, time: slotToTime(s), courtName: c }); setDragMatchId(null); return; }
      }
    }
    updateMatch(dragMatchId, { day, slot: 0, time: slotToTime(0), courtName: courts[0] });
    setDragMatchId(null);
  }

  async function handleStartLive(matchId: string) {
    setBusy(true);
    updateMatch(matchId, { status: 'playing' });
    setEditingId(matchId);
    setBusy(false);
  }

  async function handleSaveResult(matchId: string, result: MatchResult) {
    setSavingResultId(matchId);
    const updated = matches.map(m => m.id === matchId ? { ...m, result, status: 'done' as const } : m);
    onUpdate({ ...tournament, config: { ...cfg, matches: updated } });
    const res = await saveMatchResult({ tournamentId: tournament.id, matchId, result });
    if (!res.ok) { await persist({ ...cfg, matches: updated }, false); } // ensure persisted even if endpoint differs
    setSavingResultId(null);
    setEditingId(null);
    showToast('Resultado guardado', 'success');
  }

  async function handleAddCourt() {
    setBusy(true);
    await persist({ ...cfg, courtNames: [...courts, `Cancha ${courts.length + 1}`] });
    setBusy(false);
    showToast('Cancha añadida. Podés regenerar el calendario para reubicar los juegos.', 'success');
  }
  async function handleRemoveCourt() {
    if (courts.length <= 1) { showToast('Debe haber al menos una cancha', 'error'); return; }
    setBusy(true);
    await persist({ ...cfg, courtNames: courts.slice(0, -1) });
    setBusy(false);
    showToast('Cancha eliminada. Regenerá el calendario para reubicar los juegos sin jugar.', 'success');
  }

  if (matches.length === 0 && scheduledBracketMatches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', border: '1px solid var(--grey-100)' }}>
        <CalendarDays size={34} style={{ color: 'var(--grey-300)', marginBottom: 12 }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--black)', marginBottom: 8 }}>Calendario no generado</div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', maxWidth: 420, margin: '0 auto 24px' }}>
          El calendario se genera desde el botón principal del torneo, una vez que todas las categorías tienen sus grupos formados.
        </div>
        {canManage && (
          <button onClick={handleGenerate} disabled={generating} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: generating ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <CalendarDays size={16} /> {generating ? 'Generando…' : 'Generar Calendario'}
          </button>
        )}
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${tournament.code}/live` : `/t/${tournament.code}/live`;
  const editing = editingId ? dayGroupMatches.find(m => m.id === editingId) ?? matches.find(m => m.id === editingId) : null;

  return (
    <div>
      {/* Top bar: days + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {days.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              onDragOver={e => { if (dragMatchId) e.preventDefault(); }}
              onDrop={e => { e.preventDefault(); handleDropOnDay(d); }}
              title={fmtDayLong(d)}
              style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', border: dragMatchId ? '1px dashed var(--neon)' : '1px solid transparent', background: activeDay === d ? 'var(--black)' : 'var(--grey-100)', color: activeDay === d ? 'var(--neon)' : 'var(--grey-500)' }}
            >
              {fmtDay(d)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canManage && (
            <button onClick={handleGenerate} disabled={generating} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', border: '1px solid var(--grey-200)', background: '#fff', color: 'var(--grey-500)' }}>
              <RefreshCw size={13} /> {generating ? '…' : 'Regenerar'}
            </button>
          )}
          <button onClick={() => setShowShare(p => !p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', border: '1px solid var(--grey-200)', background: showShare ? 'var(--black)' : '#fff', color: showShare ? 'var(--neon)' : 'var(--grey-500)' }}>
            <Share2 size={13} /> Compartir
          </button>
        </div>
      </div>

      {dragMatchId && <div style={{ marginBottom: 10, fontSize: 11, color: 'var(--grey-400)', fontStyle: 'italic' }}>Soltá sobre una celda para mover, o sobre una fecha de arriba para cambiar de día.</div>}

      {/* Share panel */}
      {showShare && (
        <div style={{ marginBottom: 16, padding: 20, background: '#fff', border: '1px solid var(--grey-100)', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <QRCodeSVG value={shareUrl} size={100} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 6 }}>Vista pública del calendario</div>
            <div style={{ fontSize: 12, color: 'var(--grey-500)', wordBreak: 'break-all', marginBottom: 8 }}>{shareUrl}</div>
            <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Los jugadores escanean para ver cuándo y dónde les toca jugar (sin cuenta).</div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
        {[['#3b82f6', 'Clasificación'], ['#7c3aed', 'Eliminatoria'], ['#16a34a', 'En vivo'], ['#0a0a0a', 'Finalizado']].map(([c, l]) => (
          <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: 'var(--grey-500)' }}>
            <span style={{ width: 12, height: 12, background: c, borderRadius: 2 }} /> {l}
          </span>
        ))}
      </div>

      {/* Calendar grid — fixed courts column on the left + horizontally scrollable time grid */}
      <div style={{ display: 'flex', border: '1px solid var(--grey-200)', background: '#fff', overflow: 'hidden' }}>

        {/* Fixed left column: court labels */}
        <div style={{ flexShrink: 0, width: labelW, borderRight: '1px solid var(--grey-200)', zIndex: 2, background: '#fff', position: 'relative' }}>
          <div style={{ height: HEADER_H, background: '#fff', borderBottom: '2px solid var(--grey-200)', display: 'flex', alignItems: 'center', paddingLeft: 12, position: 'relative' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--grey-400)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cancha</span>
            <div onMouseDown={startResize} style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', cursor: 'col-resize' }} />
          </div>
          {courts.map(court => (
            <div key={court} style={{ height: COURT_H, background: 'var(--grey-50, #fafafa)', borderBottom: '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey-700)' }}>{court}</span>
            </div>
          ))}
        </div>

        {/* Scrollable right area: time headers + match slots */}
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${totalSlots}, ${SLOT_W}px)`, gridTemplateRows: `${HEADER_H}px repeat(${courts.length}, ${COURT_H}px)`, width: totalSlots * SLOT_W }}>
            {/* Time headers */}
            {Array.from({ length: totalSlots }, (_, i) => (
              <div key={i} style={{ background: '#fff', borderBottom: '2px solid var(--grey-200)', borderRight: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey-500)' }}>{slotToTime(i)}</span>
              </div>
            ))}

            {/* Court rows */}
            {courts.map(court => (
              <React.Fragment key={court}>
                {Array.from({ length: totalSlots }, (_, slotIdx) => {
                  const groupMatch = dayGroupMatches.find(m => m.courtName === court && m.slot === slotIdx);
                  const bracketMatch = dayBracketMatches.find(m => m.courtName === court && m.slot === slotIdx);
                  const gvis = groupMatch ? matchVisual(groupMatch) : null;
                  const bvis = bracketMatch
                    ? bracketMatch.result || bracketMatch.status === 'done'
                      ? { bg: '#4c1d95', fg: '#f5f3ff', sub: 'rgba(245,243,255,0.7)', label: 'FINAL' }
                      : bracketMatch.status === 'playing'
                        ? { bg: '#16a34a', fg: '#ffffff', sub: 'rgba(255,255,255,0.8)', label: 'EN VIVO' }
                        : { bg: '#7c3aed', fg: '#ffffff', sub: 'rgba(255,255,255,0.78)', label: '' }
                    : null;
                  return (
                    <div
                      key={slotIdx}
                      onDragOver={e => { e.preventDefault(); }}
                      onDrop={e => { e.preventDefault(); if (!bracketMatch) handleDropOnCell(slotIdx, court); }}
                      style={{ borderBottom: '1px solid var(--grey-100)', borderRight: '1px solid rgba(0,0,0,0.04)', position: 'relative', background: dragMatchId && !groupMatch && !bracketMatch ? 'rgba(59,130,246,0.05)' : 'transparent' }}
                    >
                      {groupMatch && gvis && (
                        <div
                          draggable={canManage && editingId !== groupMatch.id}
                          onDragStart={e => { if (!canManage) return; e.dataTransfer.effectAllowed = 'move'; setDragMatchId(groupMatch.id); }}
                          onDragEnd={() => setDragMatchId(null)}
                          onClick={() => canManage && setEditingId(editingId === groupMatch.id ? null : groupMatch.id)}
                          style={{ position: 'absolute', inset: 3, background: gvis.bg, color: gvis.fg, border: editingId === groupMatch.id ? '2px solid var(--neon)' : '1px solid rgba(0,0,0,0.12)', padding: '5px 8px', cursor: canManage ? 'pointer' : 'default', opacity: dragMatchId === groupMatch.id ? 0.4 : 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1 }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: gvis.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catMap.get(groupMatch.categoryId) ?? ''} · Gr.{groupMatch.groupLabel}</span>
                            {gvis.label && <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.08em', color: gvis.fg }}>{gvis.label}</span>}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamName(groupMatch.teamAId)}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamName(groupMatch.teamBId)}</div>
                          {groupMatch.result && <div style={{ fontSize: 10, fontWeight: 800, marginTop: 1, color: gvis.fg }}>{scoreStr(groupMatch.result)}</div>}
                        </div>
                      )}
                      {bracketMatch && bvis && (
                        <div
                          style={{ position: 'absolute', inset: 3, background: bvis.bg, color: bvis.fg, border: '1px solid rgba(0,0,0,0.12)', padding: '5px 8px', cursor: 'default', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1 }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: bvis.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catMap.get(bracketMatch.categoryId) ?? ''} · {bracketMatch.roundLabel}</span>
                            {bvis.label && <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.08em', color: bvis.fg }}>{bvis.label}</span>}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bracketMatch.teamAId ? teamName(bracketMatch.teamAId) : (bracketMatch.placeholderA ?? 'Por definir')}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bracketMatch.teamBId ? teamName(bracketMatch.teamBId) : (bracketMatch.placeholderB ?? 'Por definir')}</div>
                          {bracketMatch.result && <div style={{ fontSize: 10, fontWeight: 800, marginTop: 1, color: bvis.fg }}>{scoreStr(bracketMatch.result)}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Court +/- */}
      {canManage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Canchas:</span>
          <button onClick={handleRemoveCourt} disabled={busy || courts.length <= 1} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid var(--grey-200)', background: '#fff', cursor: courts.length <= 1 ? 'not-allowed' : 'pointer', opacity: courts.length <= 1 ? 0.4 : 1 }}><Minus size={14} /></button>
          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{courts.length}</span>
          <button onClick={handleAddCourt} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer' }}><Plus size={14} /></button>
          <span style={{ fontSize: 10, color: 'var(--grey-400)' }}>Se guarda en el Panel de Control.</span>
        </div>
      )}

      {/* Inline editor for the selected match */}
      {editing && (() => {
        const vis = matchVisual(editing);
        const readOnly = editing.result && !canEditResults;
        return (
          <div style={{ marginTop: 12, padding: 18, background: '#fff', border: `2px solid ${vis.bg}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: vis.bg, padding: '3px 8px' }}>{vis.done ? 'FINALIZADO' : vis.live ? 'EN VIVO' : 'PAUTADO'}</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>
                {catMap.get(editing.categoryId)} · Grupo {editing.groupLabel} · {editing.courtName} · {editing.time}
              </span>
              <button onClick={() => setEditingId(null)} style={{ marginLeft: 'auto', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-400)' }}>Cerrar ✕</button>
            </div>

            {/* Move to day */}
            {canManage && days.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                <Move size={13} color="var(--grey-400)" />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Mover a:</span>
                {days.map(d => (
                  <button key={d} disabled={d === editing.day} onClick={() => handleDropOnDayFor(editing.id, d)} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', cursor: d === editing.day ? 'default' : 'pointer', border: '1px solid var(--grey-200)', background: d === editing.day ? 'var(--grey-100)' : '#fff', color: d === editing.day ? 'var(--grey-400)' : 'var(--black)' }}>{fmtDay(d)}</button>
                ))}
              </div>
            )}

            {readOnly ? (
              <div>
                <div style={{ fontSize: 14, marginBottom: 4 }}><strong>{teamName(editing.teamAId)}</strong> vs <strong>{teamName(editing.teamBId)}</strong></div>
                <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>Resultado: {editing.result && scoreStr(editing.result)} · Gana {editing.result && teamName(editing.result.winnerId)}</div>
                <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 8 }}>Solo el creador del torneo puede modificar un resultado guardado.</div>
              </div>
            ) : (
              <>
                {canManage && !editing.result && editing.status !== 'playing' && (
                  <button onClick={() => handleStartLive(editing.id)} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <Play size={14} /> Marcar En Vivo
                  </button>
                )}
                <ScoreEntry
                  teamAId={editing.teamAId} teamBId={editing.teamBId}
                  teamAName={teamName(editing.teamAId)} teamBName={teamName(editing.teamBId)}
                  setsCount={setsCount} result={editing.result} saving={savingResultId === editing.id}
                  onSave={(r) => handleSaveResult(editing.id, r)} onCancel={() => setEditingId(null)}
                />
              </>
            )}
          </div>
        );
      })()}

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--grey-400)' }}>
        {canManage ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><GripVertical size={12} /> Arrastrá los partidos para cambiar de cancha, horario o día. Hacé clic para registrar el resultado.</span>
        ) : 'Vista de solo lectura.'}
      </div>
    </div>
  );

  function handleDropOnDayFor(matchId: string, day: string) {
    const occupied = new Set(matches.filter(m => m.day === day && m.id !== matchId).map(m => `${m.courtName}|${m.slot}`));
    for (let s = 0; s < totalSlots; s++) {
      for (const c of courts) {
        if (!occupied.has(`${c}|${s}`)) { updateMatch(matchId, { day, slot: s, time: slotToTime(s), courtName: c }); setSelectedDay(day); return; }
      }
    }
    updateMatch(matchId, { day, slot: 0, time: slotToTime(0), courtName: courts[0] }); setSelectedDay(day);
  }
}

// ── Bracket tab ────────────────────────────────────────────────────────────────

function BracketTab({ tournament, canManage, canEditResults, onUpdate }: {
  tournament: PersonalizadoTournament; canManage: boolean; canEditResults: boolean; onUpdate: (t: PersonalizadoTournament) => void;
}) {
  const [selectedCatId, setSelectedCatId] = useState<string>(tournament.categories[0]?.id ?? '');
  const teamMap = useMemo(() => new Map(tournament.teams.map(t => [t.id, t.player2Name ? `${t.player1Name} / ${t.player2Name}` : t.player1Name])), [tournament.teams]);
  const teamName = (id: string) => teamMap.get(id) ?? '—';
  const allBracketMatches = tournament.config?.bracketMatches ?? [];

  function handleBracketUpdate(catId: string, newMatches: BracketMatch[]) {
    const merged = [...allBracketMatches.filter(m => m.categoryId !== catId), ...newMatches];
    onUpdate({ ...tournament, config: { ...(tournament.config ?? DEFAULT_CONTROL_CONFIG), bracketMatches: merged } });
  }

  const catBracket = allBracketMatches.filter(m => m.categoryId === selectedCatId);

  return (
    <div>
      {tournament.categories.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
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
        canEditResults={canEditResults}
        onBracketUpdate={(newMatches) => handleBracketUpdate(selectedCatId, newMatches)}
        onUpdate={onUpdate}
      />
    </div>
  );
}

// ── Main exported component ─────────────────────────────────────────────────────

export function TournamentTabs({ tournament, canManage, canEditResults, onUpdate }: {
  tournament: PersonalizadoTournament;
  canManage: boolean;
  canEditResults?: boolean;
  onUpdate: (t: PersonalizadoTournament) => void;
}) {
  const [activeTab, setActiveTab] = useState<'calendario' | 'clasificacion' | 'bracket'>('calendario');
  const editResults = canEditResults ?? canManage;

  const teamMap = useMemo(() => new Map(tournament.teams.map(t => [t.id, t.player2Name ? `${t.player1Name} / ${t.player2Name}` : t.player1Name])), [tournament.teams]);
  const teamName = (id: string) => teamMap.get(id) ?? '—';

  const tabs = [
    { key: 'calendario' as const, label: 'Calendario', Icon: CalendarDays },
    { key: 'clasificacion' as const, label: 'Clasificación', Icon: BarChart3 },
    { key: 'bracket' as const, label: 'Bracket', Icon: Trophy },
  ];

  return (
    <div style={{ marginTop: 8, border: '2px solid var(--black)' }}>
      <div style={{ display: 'flex', borderBottom: '2px solid var(--black)', background: 'var(--black)' }}>
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', border: 'none', background: activeTab === key ? '#fff' : 'transparent', color: activeTab === key ? 'var(--black)' : 'rgba(214,255,0,0.7)' }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px clamp(12px, 3vw, 24px) 28px' }}>
        {activeTab === 'calendario' && <CourtCalendar tournament={tournament} canManage={canManage} canEditResults={editResults} onUpdate={onUpdate} />}
        {activeTab === 'clasificacion' && <StandingsView tournament={tournament} teamName={teamName} />}
        {activeTab === 'bracket' && <BracketTab tournament={tournament} canManage={canManage} canEditResults={editResults} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}
