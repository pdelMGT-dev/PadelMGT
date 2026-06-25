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

const CARD_W = 220;
const CARD_H = 64;
const BASE_GAP = 26;        // vertical gap between cards in the outer (first) round
const COL_GAP = 44;         // horizontal space between rounds (holds connectors)
const FINAL_W = 248;        // emphasized center Final card width
const LABEL_H = 22;         // height reserved for the round label row on top of each column

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

  const side = (teamId?: string, placeholder?: string, which: 'a' | 'b' = 'a', prov = false) => {
    const isWinner = done && m.result!.winnerId === teamId;
    const name = teamId ? teamName(teamId) : (placeholder ?? 'Por definir');
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', height: CARD_H / 2, borderBottom: which === 'a' ? '1px solid var(--grey-100)' : 'none' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
          <span style={{ fontSize: 11.5, fontWeight: isWinner ? 800 : 600, color: teamId ? (prov ? '#b45309' : isWinner ? 'var(--black)' : 'var(--grey-500)') : 'var(--grey-300)', fontStyle: teamId ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: CARD_W - 70 }}>
            {name}
          </span>
          {teamId && prov && !done && (
            <span title="Clasificado provisional — confirmá el grupo para bloquear" style={{ flexShrink: 0, fontSize: 7, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '1px 4px', borderRadius: 3, background: 'rgba(180,83,9,0.12)', color: '#b45309' }}>Prov.</span>
          )}
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
      {side(m.teamAId, m.placeholderA, 'a', m.provisionalA)}
      {side(m.teamBId, m.placeholderB, 'b', m.provisionalB)}
    </div>
  );
}

// ── BracketColumn ─────────────────────────────────────────────────────────────
// Renders one round's cards for a single side (left or right), vertically centered
// inside `colHeight`, plus the thin L-shaped connectors that link each card to the
// next round (toward the center). `depth` is how many rounds in from the outer edge
// this column is (0 = outermost), used to compute spacing/centering generically.
function BracketColumn({
  matches, side, depth, colHeight, label,
  editingId, setEditingId, canManage, isSkeleton, editResults, teamName,
}: {
  matches: BracketMatch[];
  side: 'left' | 'right';
  depth: number;
  colHeight: number;
  label: string;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  canManage: boolean;
  isSkeleton: boolean;
  editResults: boolean;
  teamName: (id: string) => string;
}) {
  // Each round halves the card count, so the vertical slot for one card spans
  // 2^depth of the outer slot height. Center each card within its slot.
  const slotH = (CARD_H + BASE_GAP) * Math.pow(2, depth);
  const total = colHeight;
  // A pair of adjacent cards merges into one card of the next (inner) round, so we
  // draw a vertical link joining their stubs whenever this column has >1 card.
  const pairs = matches.length > 1;
  // Connector points toward center: left cards connect on their right edge, right on left.
  const connectorOnInnerSide = side === 'left';

  return (
    <div style={{ position: 'relative', width: CARD_W, height: total + LABEL_H, flexShrink: 0 }}>
      <div style={{ height: LABEL_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{label}</span>
      </div>
      <div style={{ position: 'relative', height: total }}>
        {matches.map((m, i) => {
          const top = i * slotH + (slotH - CARD_H) / 2;
          return (
            <div key={m.id} style={{ position: 'absolute', top, left: 0, width: CARD_W }}>
              {/* Connector: short horizontal stub out of every card toward center */}
              <div style={{
                position: 'absolute', top: CARD_H / 2 - 0.5, height: 1, width: COL_GAP / 2,
                background: 'var(--grey-200)',
                ...(connectorOnInnerSide ? { left: CARD_W } : { right: CARD_W }),
              }} />
              {/* Vertical link joining each pair of stubs to the next (center) round */}
              {pairs && i % 2 === 0 && i + 1 < matches.length && (
                <div style={{
                  position: 'absolute', top: CARD_H / 2, width: 1, height: slotH,
                  background: 'var(--grey-200)',
                  ...(connectorOnInnerSide ? { left: CARD_W + COL_GAP / 2 } : { right: CARD_W + COL_GAP / 2 }),
                }} />
              )}
              <BracketCard m={m} editingId={editingId} setEditingId={setEditingId} canManage={canManage} isSkeleton={isSkeleton} editResults={editResults} teamName={teamName} />
            </div>
          );
        })}
      </div>
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

  // Split each round into left / right halves (Final stays in the center).
  const sideRounds = useMemo(() => {
    const left: BracketMatch[][] = [];
    const right: BracketMatch[][] = [];
    for (let r = 0; r < finalRoundIdx; r++) {
      const rm = rounds[r] ?? [];
      const mid = Math.ceil(rm.length / 2);
      left.push(rm.slice(0, mid));
      right.push(rm.slice(mid));
    }
    return { left, right };
  }, [rounds, finalRoundIdx]);

  const outerCount = sideRounds.left[0]?.length ?? 1;
  // Column body height = outer-round cards stacked with gaps (drives vertical centering for all rounds).
  const colHeight = Math.max(outerCount * (CARD_H + BASE_GAP), CARD_H + BASE_GAP);
  // Number of side rounds (R16/QF/SF…). 0 means only a Final exists.
  const sideCount = sideRounds.left.length;

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

      {/* Bracket — mirrored / converging layout (ESPN-style).
          Left half flows L→R toward center, right half mirrors R→L. The Final sits
          in the CENTER column with the champion banner above it; the 3rd-place match
          and podium sit below the Final. Horizontally scrollable on narrow screens. */}
      <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          gap: COL_GAP, padding: '8px 4px',
          minWidth: (sideCount * 2 * CARD_W) + FINAL_W + (sideCount * 2 + 1) * COL_GAP + 16,
        }}>
          {/* LEFT side — outer round first, flowing toward the center */}
          {sideRounds.left.map((roundMatches, idx) => (
            <BracketColumn
              key={`L${idx}`}
              matches={roundMatches}
              side="left"
              depth={idx}
              colHeight={colHeight}
              label={roundMatches[0]?.roundLabel ?? rounds[idx]?.[0]?.roundLabel ?? ''}
              editingId={editingId} setEditingId={setEditingId} canManage={canManage}
              isSkeleton={isSkeleton} editResults={editResults} teamName={teamName}
            />
          ))}

          {/* CENTER column — Final + champion banner, then 3rd place + podium below */}
          <div style={{ width: FINAL_W, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ height: LABEL_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--black)', fontFamily: 'var(--font-display)' }}>
                {rounds[finalRoundIdx]?.[0]?.roundLabel ?? 'Final'}
              </span>
            </div>

            {/* Center stack, vertically centered against the side columns */}
            <div style={{ minHeight: colHeight, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 8 }}>
              {/* Champion banner */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 22px', minWidth: FINAL_W, justifyContent: 'center', background: champion ? 'var(--black)' : 'var(--grey-100)', color: champion ? 'var(--neon)' : 'var(--grey-400)' }}>
                <Trophy size={20} />
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.75 }}>Campeón</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{champion ? teamName(champion) : 'Por definir'}</div>
                </div>
              </div>

              {/* Final card — emphasized */}
              {rounds[finalRoundIdx]?.[0] && (
                <div style={{ position: 'relative', width: FINAL_W }}>
                  <div style={{ position: 'absolute', inset: -4, border: '2px solid var(--black)', pointerEvents: 'none' }} />
                  <div style={{ position: 'relative' }}>
                    <BracketCard m={rounds[finalRoundIdx][0]} editingId={editingId} setEditingId={setEditingId} canManage={canManage} isSkeleton={isSkeleton} editResults={editResults} teamName={teamName} />
                  </div>
                </div>
              )}

              {/* 3rd-place match — directly below the Final */}
              {thirdPlace && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b45309', marginBottom: 8 }}>Partido por el 3er Puesto</div>
                  <BracketCard m={thirdPlace} isThird editingId={editingId} setEditingId={setEditingId} canManage={canManage} isSkeleton={isSkeleton} editResults={editResults} teamName={teamName} />
                </div>
              )}

              {/* Podium */}
              {champion && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 12 }}>
                  {[
                    { pos: 2, id: runnerUp, h: 52, bg: '#cbd5e1', icon: <Medal size={16} color="#64748b" /> },
                    { pos: 1, id: champion, h: 74, bg: 'var(--neon, #d6ff00)', icon: <Trophy size={18} color="var(--black)" /> },
                    { pos: 3, id: third, h: 40, bg: '#fcd9a8', icon: <Medal size={15} color="#b45309" /> },
                  ].map(p => (
                    <div key={p.pos} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: FINAL_W / 3 - 4 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, marginBottom: 4, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: FINAL_W / 3 - 4, color: p.id ? 'var(--black)' : 'var(--grey-300)' }}>{p.id ? teamName(p.id) : '—'}</div>
                      <div style={{ width: '100%', height: p.h, background: p.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        {p.icon}
                        <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>{p.pos}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT side — MIRRORED: inner round (SF) closest to center, outer (R16) far right.
              We render in reverse so the column adjacent to center is the innermost round. */}
          {sideRounds.right.map((_, idx) => {
            const roundIdx = sideCount - 1 - idx; // 0 = outermost; render innermost first
            const r = sideRounds.right[roundIdx] ?? [];
            return (
              <BracketColumn
                key={`R${roundIdx}`}
                matches={r}
                side="right"
                depth={roundIdx}
                colHeight={colHeight}
                label={r[0]?.roundLabel ?? rounds[roundIdx]?.[0]?.roundLabel ?? ''}
                editingId={editingId} setEditingId={setEditingId} canManage={canManage}
                isSkeleton={isSkeleton} editResults={editResults} teamName={teamName}
              />
            );
          })}
        </div>
      </div>

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
