'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, Medal, RefreshCw } from 'lucide-react';
import {
  generateBracket,
  generateBracketSkeleton,
  scheduleBracket,
  saveControlPanel,
  DEFAULT_CONTROL_CONFIG,
  type PersonalizadoTournament,
  type BracketMatch,
  type MatchResult,
} from '@/lib/personalizado-store';
import { useToast } from '@/components/ToastProvider';
import { ScoreEntry } from './ScoreEntry';

const CARD_W = 236;
const CARD_H = 64;
const BASE_GAP = 22;
const COL_GAP = 48; // horizontal space between rounds (holds connectors)

// Apply a result to a category's bracket and propagate the winner (and the semifinal loser into
// the 3rd-place match) to the next round. `matches` must already be the single category's array.
function applyResult(matches: BracketMatch[], matchId: string, result: MatchResult): BracketMatch[] {
  let bracket = matches.map(m => m.id === matchId ? { ...m, result, status: 'done' as const } : m);
  const played = bracket.find(m => m.id === matchId);
  if (played && played.teamAId && played.teamBId) {
    const winnerId = result.winnerId;
    const loserId = winnerId === played.teamAId ? played.teamBId : played.teamAId;
    const finalRound = Math.max(...bracket.map(m => m.round));
    const isSemi = played.round === finalRound - 1 && finalRound >= 1;
    const nextRound = played.round + 1;
    const nextSlot = Math.floor(played.slotIndex / 2);
    const side: 'A' | 'B' = played.slotIndex % 2 === 0 ? 'A' : 'B';
    bracket = bracket.map(m => {
      if (m.round === nextRound && m.slotIndex === nextSlot && m.roundLabel !== '3er Puesto') {
        return side === 'A' ? { ...m, teamAId: winnerId, placeholderA: undefined } : { ...m, teamBId: winnerId, placeholderB: undefined };
      }
      if (isSemi && m.roundLabel === '3er Puesto') {
        return side === 'A' ? { ...m, teamAId: loserId, placeholderA: undefined } : { ...m, teamBId: loserId, placeholderB: undefined };
      }
      return m;
    });
  }
  return bracket;
}

// ── BracketCard ───────────────────────────────────────────────────────────────
// Defined outside WorldCupBracket to avoid "components created during render" lint error.
function BracketCard({
  m, isThird, editingId, setEditingId, canManage, isSkeleton, editResults, teamName,
}: {
  m: BracketMatch; isThird?: boolean; editingId: string | null;
  setEditingId: (id: string | null) => void; canManage: boolean;
  isSkeleton: boolean; editResults: boolean; teamName: (id: string) => string;
}) {
  const bothKnown = !!m.teamAId && !!m.teamBId;
  const done = !!m.result;
  const live = m.status === 'playing';
  const clickable = canManage && !isSkeleton && bothKnown && (!done || editResults);
  const accent = done ? '#0a0a0a' : live ? '#16a34a' : '#3b82f6';

  const side = (teamId?: string, placeholder?: string, which: 'a' | 'b' = 'a') => {
    const isWinner = done && m.result!.winnerId === teamId;
    const name = teamId ? teamName(teamId) : (placeholder ?? 'Por definir');
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', height: CARD_H / 2, borderBottom: which === 'a' ? '1px solid var(--grey-100)' : 'none' }}>
        <span style={{ fontSize: 11.5, fontWeight: isWinner ? 800 : 600, color: teamId ? (isWinner ? 'var(--black)' : 'var(--grey-500)') : 'var(--grey-300)', fontStyle: teamId ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: CARD_W - 56 }}>
          {name}
        </span>
        {done && !m.result!.walkover && (
          <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {m.result!.sets.map((s, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 800, color: (which === 'a' ? s.a > s.b : s.b > s.a) ? 'var(--black)' : 'var(--grey-300)', fontVariantNumeric: 'tabular-nums', width: 12, textAlign: 'center' }}>{which === 'a' ? s.a : s.b}</span>
            ))}
          </span>
        )}
        {done && m.result!.walkover && isWinner && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--black)' }}>W.O.</span>}
      </div>
    );
  };

  return (
    <div
      onClick={() => clickable && setEditingId(editingId === m.id ? null : m.id)}
      style={{ width: CARD_W, height: CARD_H, background: '#fff', border: `1px solid var(--grey-200)`, borderLeft: `3px solid ${accent}`, boxShadow: editingId === m.id ? '0 0 0 2px var(--neon)' : '0 1px 2px rgba(0,0,0,0.04)', cursor: clickable ? 'pointer' : 'default', position: 'relative' }}
    >
      {(live || isThird) && (
        <span style={{ position: 'absolute', top: -8, left: 6, fontSize: 7, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 5px', background: isThird ? '#b45309' : '#16a34a', color: '#fff' }}>{isThird ? '3er Puesto' : 'En vivo'}</span>
      )}
      {side(m.teamAId, m.placeholderA, 'a')}
      {side(m.teamBId, m.placeholderB, 'b')}
    </div>
  );
}

export function WorldCupBracket({
  tournament, categoryId, bracketMatches, teamName, canManage, canEditResults, onBracketUpdate, onUpdate,
}: {
  tournament: PersonalizadoTournament;
  categoryId: string;
  bracketMatches: BracketMatch[];
  teamName: (id: string) => string;
  canManage: boolean;
  canEditResults?: boolean;
  onBracketUpdate: (newMatches: BracketMatch[]) => void;
  onUpdate?: (t: PersonalizadoTournament) => void;
}) {
  const { showToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editResults = canEditResults ?? canManage;
  const setsCount = tournament.config?.scoreElimination?.sets ?? 1;

  const isSkeleton = bracketMatches.length === 0;
  const display = useMemo(
    () => isSkeleton ? generateBracketSkeleton(tournament, categoryId) : bracketMatches,
    [isSkeleton, bracketMatches, tournament, categoryId],
  );

  const { rounds, thirdPlace, finalRoundIdx } = useMemo(() => {
    const main = display.filter(m => m.roundLabel !== '3er Puesto');
    const third = display.find(m => m.roundLabel === '3er Puesto') ?? null;
    const maxRound = main.length ? Math.max(...main.map(m => m.round)) : 0;
    const byRound: BracketMatch[][] = [];
    for (let r = 0; r <= maxRound; r++) byRound.push(main.filter(m => m.round === r).sort((a, b) => a.slotIndex - b.slotIndex));
    return { rounds: byRound, thirdPlace: third, finalRoundIdx: maxRound };
  }, [display]);

  async function persist(newCat: BracketMatch[]) {
    const others = (tournament.config?.bracketMatches ?? []).filter(m => m.categoryId !== categoryId);
    const newCfg = { ...(tournament.config ?? DEFAULT_CONTROL_CONFIG), bracketMatches: [...others, ...newCat] };
    onBracketUpdate(newCat);
    if (onUpdate) onUpdate({ ...tournament, config: newCfg });
    const res = await saveControlPanel({ id: tournament.id, categories: tournament.categories, config: newCfg });
    if (!res.ok) showToast(res.error ?? 'No se pudo guardar', 'error');
  }

  async function handleGenerate() {
    setGenerating(true);
    const built = scheduleBracket(tournament, generateBracket(tournament, categoryId));
    if (built.length === 0) { showToast('Aún no hay equipos suficientes para el bracket.', 'error'); setGenerating(false); return; }
    await persist(built);
    setGenerating(false);
    showToast('Bracket generado', 'success');
  }

  async function handleSaveResult(matchId: string, result: MatchResult) {
    setSaving(true);
    const newCat = applyResult(bracketMatches, matchId, result);
    await persist(newCat);
    setSaving(false);
    setEditingId(null);
    showToast('Resultado guardado', 'success');
  }

  if (display.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', border: '1px solid var(--grey-100)' }}>
        <Trophy size={34} style={{ color: 'var(--grey-300)', marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Bracket no disponible</div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>Define los grupos y la cantidad de clasificados por grupo en el Panel de Control.</div>
      </div>
    );
  }

  // Champion / podium
  const finalMatch = rounds[finalRoundIdx]?.[0];
  const champion = finalMatch?.result?.winnerId;
  const runnerUp = champion && finalMatch ? (champion === finalMatch.teamAId ? finalMatch.teamBId : finalMatch.teamAId) : undefined;
  const third = thirdPlace?.result?.winnerId;

  const totalHeight = (rounds[0]?.length ?? 1) * (CARD_H + BASE_GAP);

  return (
    <div>
      {/* Manager actions */}
      {canManage && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          <button onClick={handleGenerate} disabled={generating} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: isSkeleton ? 'var(--black)' : '#fff', color: isSkeleton ? 'var(--neon)' : 'var(--grey-500)', border: isSkeleton ? 'none' : '1px solid var(--grey-200)', cursor: generating ? 'wait' : 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isSkeleton ? <Trophy size={14} /> : <RefreshCw size={13} />}
            {generating ? 'Generando…' : isSkeleton ? 'Generar Bracket' : 'Regenerar Bracket'}
          </button>
        </div>
      )}
      {isSkeleton && <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--grey-400)', marginBottom: 14, fontStyle: 'italic' }}>Vista previa — las posiciones se reemplazan por los equipos al completar la fase de grupos.</div>}

      {/* Champion banner */}
      {champion && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 28px', background: 'var(--black)', color: 'var(--neon)' }}>
            <Trophy size={22} />
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7 }}>Campeón</div>
              <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{teamName(champion)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Bracket — horizontal scroll, centered */}
      <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: COL_GAP, minHeight: totalHeight, padding: '8px 4px' }}>
          {rounds.map((roundMatches, r) => (
            <div key={r} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: totalHeight }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', textAlign: 'center', marginBottom: 6, height: 12 }}>
                {roundMatches[0]?.roundLabel ?? ''}
              </div>
              {roundMatches.map(m => <BracketCard key={m.id} m={m} editingId={editingId} setEditingId={setEditingId} canManage={canManage} isSkeleton={isSkeleton} editResults={editResults} teamName={teamName} />)}
            </div>
          ))}
        </div>
      </div>

      {/* 3rd place + podium */}
      {thirdPlace && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b45309', marginBottom: 6 }}>Partido por el 3er Puesto</div>
            <BracketCard m={thirdPlace} isThird editingId={editingId} setEditingId={setEditingId} canManage={canManage} isSkeleton={isSkeleton} editResults={editResults} teamName={teamName} />
          </div>

          {champion && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 8 }}>
              {[
                { pos: 2, id: runnerUp, h: 56, bg: '#cbd5e1', icon: <Medal size={18} color="#64748b" /> },
                { pos: 1, id: champion, h: 78, bg: 'var(--neon, #d6ff00)', icon: <Trophy size={20} color="var(--black)" /> },
                { pos: 3, id: third, h: 42, bg: '#fcd9a8', icon: <Medal size={16} color="#b45309" /> },
              ].map(p => (
                <div key={p.pos} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 130 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130, color: p.id ? 'var(--black)' : 'var(--grey-300)' }}>{p.id ? teamName(p.id) : '—'}</div>
                  <div style={{ width: '100%', height: p.h, background: p.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    {p.icon}
                    <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>{p.pos}°</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline editor */}
      {editingId && (() => {
        const m = display.find(x => x.id === editingId);
        if (!m || !m.teamAId || !m.teamBId) return null;
        const readOnly = m.result && !editResults;
        return (
          <div style={{ marginTop: 20, padding: 18, background: '#fff', border: '2px solid var(--black)', maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>{m.roundLabel}</span>
              <button onClick={() => setEditingId(null)} style={{ marginLeft: 'auto', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-400)' }}>Cerrar ✕</button>
            </div>
            {readOnly ? (
              <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>
                {teamName(m.teamAId)} vs {teamName(m.teamBId)} — {m.result!.walkover ? 'W.O.' : m.result!.sets.map(s => `${s.a}-${s.b}`).join(' ')}.
                <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 6 }}>Solo el creador puede modificar un resultado guardado.</div>
              </div>
            ) : (
              <ScoreEntry
                teamAId={m.teamAId} teamBId={m.teamBId}
                teamAName={teamName(m.teamAId)} teamBName={teamName(m.teamBId)}
                setsCount={setsCount} result={m.result} saving={saving}
                onSave={(res) => handleSaveResult(m.id, res)} onCancel={() => setEditingId(null)}
              />
            )}
          </div>
        );
      })()}
    </div>
  );
}
