'use client';

import React, { useState } from 'react';
import type { KnockoutBracket, FixedPair, GamePlayer, ScoreConfig } from '@/lib/game-engine';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPairName(
  pairIds: string[] | null,
  fixedPairs?: FixedPair[],
  players?: GamePlayer[],
): string {
  if (!pairIds || pairIds.length === 0) return '???';
  if (fixedPairs) {
    const fp = fixedPairs.find(fp => fp.player1Id === pairIds[0]);
    if (fp) return fp.name?.trim() || `${fp.player1Name} / ${fp.player2Name}`;
  }
  if (players) {
    return pairIds.map(id => players.find(p => p.id === id)?.name ?? '?').join(' / ');
  }
  return pairIds[0]?.slice(0, 8) ?? '???';
}

function isByeSlot(pairIds: string[] | null): boolean {
  return pairIds !== null && pairIds.length > 0 && pairIds[0].startsWith('bye-');
}

// ── Score Entry Modal ─────────────────────────────────────────────────────────

interface ScoreModalProps {
  pair1Name: string;
  pair2Name: string;
  onConfirm: (s1: number, s2: number) => void;
  onCancel: () => void;
}

function ScoreModal({ pair1Name, pair2Name, onConfirm, onCancel }: ScoreModalProps) {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const valid = s1 !== '' && s2 !== '' && !isNaN(Number(s1)) && !isNaN(Number(s2)) && Number(s1) !== Number(s2);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', padding: 28, maxWidth: 380, width: '100%' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 18 }}>
          Ingresar resultado
        </div>
        {[{ name: pair1Name, val: s1, setVal: setS1 }, { name: pair2Name, val: s2, setVal: setS2 }].map((side, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-500)', display: 'block', marginBottom: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {side.name}
            </label>
            <input
              type="number" min="0" value={side.val}
              onChange={e => side.setVal(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700, border: '2px solid var(--grey-200)', background: '#fff', color: 'var(--black)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
        {s1 !== '' && s2 !== '' && Number(s1) === Number(s2) && (
          <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 10, fontWeight: 600 }}>
            No puede haber empate en eliminación directa.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => { if (valid) onConfirm(Number(s1), Number(s2)); }}
            disabled={!valid}
            style={{ flex: 1, padding: '11px', background: valid ? 'var(--black)' : 'var(--grey-200)', color: valid ? 'var(--neon)' : 'var(--grey-400)', border: 'none', cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Confirmar
          </button>
          <button
            onClick={onCancel}
            style={{ padding: '11px 18px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-500)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  bracket: KnockoutBracket;
  fixedPairs?: FixedPair[];
  players?: GamePlayer[];
  onScoreEntry?: (roundIdx: number, matchIdx: number, s1: number, s2: number) => void;
  isEditable?: boolean;
}

const HEADER_H = 34;
const ROUND_W   = 252;
const CONN_W    = 28;
const CHAMP_W   = 164;

export default function KnockoutBracketView({ bracket, fixedPairs, players, onScoreEntry, isEditable = false }: Props) {
  const [editTarget, setEditTarget] = useState<{ roundIdx: number; matchIdx: number } | null>(null);

  const editMatch = editTarget
    ? bracket.rounds[editTarget.roundIdx]?.matches[editTarget.matchIdx]
    : null;
  const editPair1Name = editMatch ? getPairName(editMatch.pair1, fixedPairs, players) : '';
  const editPair2Name = editMatch ? getPairName(editMatch.pair2, fixedPairs, players) : '';

  const numRounds   = bracket.rounds.length;
  const firstCount  = bracket.rounds[0]?.matches.length ?? 1;

  // Slot height grows per round so matches stay vertically centred in their bracket region.
  // Total bracket height is constant: slotH_r0 * firstCount
  const SLOT_H_0    = Math.max(72, Math.min(120, 640 / Math.max(firstCount, 1)));
  const CARD_H      = Math.min(68, SLOT_H_0 - 8);
  const TOTAL_H     = SLOT_H_0 * firstCount;

  // Champion (last round, first match winner)
  const finalMatch  = bracket.rounds[numRounds - 1]?.matches[0];
  const champion    = finalMatch?.status === 'completed' && finalMatch.winner
    ? getPairName(finalMatch.winner, fixedPairs, players)
    : null;

  const totalWidth =
    numRounds * ROUND_W +
    (numRounds - 1) * CONN_W +
    (champion ? CONN_W + CHAMP_W : 0);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: totalWidth }}>

        {bracket.rounds.map((round, roundIdx) => {
          const matchCount = round.matches.length;
          const slotH      = TOTAL_H / matchCount; // doubles each round

          return (
            <React.Fragment key={roundIdx}>

              {/* ── Connector column (between rounds) ── */}
              {roundIdx > 0 && (() => {
                const prevCount = bracket.rounds[roundIdx - 1].matches.length;
                const prevSlotH = TOTAL_H / prevCount;

                return (
                  <div style={{ flex: `0 0 ${CONN_W}px`, height: TOTAL_H + HEADER_H, position: 'relative' }}>
                    <svg
                      width={CONN_W} height={TOTAL_H}
                      style={{ position: 'absolute', top: HEADER_H, left: 0, overflow: 'visible' }}
                    >
                      {round.matches.map((_, mi) => {
                        const topY  = (mi * 2)     * prevSlotH + prevSlotH / 2;
                        const botY  = (mi * 2 + 1) * prevSlotH + prevSlotH / 2;
                        const midY  = (topY + botY) / 2;
                        const cx    = CONN_W / 2;
                        const color = '#d1d5db'; // grey-300 equivalent

                        return (
                          <g key={mi}>
                            {/* arms from previous-round matches */}
                            <line x1={-6} y1={topY} x2={cx} y2={topY}   stroke={color} strokeWidth={1.5} />
                            <line x1={-6} y1={botY} x2={cx} y2={botY}   stroke={color} strokeWidth={1.5} />
                            {/* vertical bar connecting both arms */}
                            <line x1={cx} y1={topY} x2={cx} y2={botY}   stroke={color} strokeWidth={1.5} />
                            {/* arm to next-round match center */}
                            <line x1={cx} y1={midY} x2={CONN_W + 6} y2={midY} stroke={color} strokeWidth={1.5} />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}

              {/* ── Round column ── */}
              <div style={{ flex: `0 0 ${ROUND_W}px`, height: TOTAL_H + HEADER_H, position: 'relative' }}>

                {/* Round header */}
                <div style={{
                  height: HEADER_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: roundIdx === numRounds - 1 ? 'var(--neon)' : 'var(--black)',
                  color: roundIdx === numRounds - 1 ? 'var(--black)' : 'var(--neon)',
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
                }}>
                  {round.name}
                </div>

                {/* Match cards */}
                {round.matches.map((match, matchIdx) => {
                  const p1Name   = getPairName(match.pair1, fixedPairs, players);
                  const p2Name   = getPairName(match.pair2, fixedPairs, players);
                  const p1Bye    = isByeSlot(match.pair1);
                  const p2Bye    = isByeSlot(match.pair2);
                  const isComp   = match.status === 'completed';
                  const canEdit  = isEditable && !isComp && match.pair1 && match.pair2 && !p1Bye && !p2Bye;
                  const p1Win    = isComp && match.winner && match.pair1 && match.winner[0] === match.pair1[0];
                  const p2Win    = isComp && match.winner && match.pair2 && match.winner[0] === match.pair2[0];

                  const topOffset = HEADER_H + matchIdx * slotH + (slotH - CARD_H) / 2;
                  const halfCard  = CARD_H / 2;

                  return (
                    <div
                      key={matchIdx}
                      onClick={() => canEdit && setEditTarget({ roundIdx, matchIdx })}
                      style={{
                        position: 'absolute', top: topOffset, left: 8,
                        right: roundIdx < numRounds - 1 ? 2 : 8,
                        height: CARD_H,
                        border: `1.5px solid ${isComp ? 'var(--grey-200)' : canEdit ? 'var(--grey-300)' : 'var(--grey-100)'}`,
                        background: isComp ? '#fff' : canEdit ? '#fff' : '#fafafa',
                        cursor: canEdit ? 'pointer' : 'default',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Team 1 row */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: halfCard,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0 10px 0 12px',
                        background: p1Win ? 'rgba(22,163,74,0.07)' : 'transparent',
                        borderBottom: `1px solid var(--grey-100)`,
                      }}>
                        {p1Win && (
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--turf-green)' }} />
                        )}
                        <span style={{
                          fontSize: 11, fontWeight: p1Win ? 700 : 400, lineHeight: 1.2,
                          color: p1Bye ? 'var(--grey-300)' : match.pair1 ? (p1Win ? '#15803d' : 'var(--black)') : 'var(--grey-300)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '76%',
                        }}>
                          {p1Bye ? 'BYE' : match.pair1 ? p1Name : '–'}
                        </span>
                        {isComp && !p1Bye && match.pair1 && (
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: p1Win ? 'var(--turf-green)' : 'var(--grey-400)', flexShrink: 0 }}>
                            {match.pair1Score}
                          </span>
                        )}
                      </div>

                      {/* Team 2 row */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: halfCard,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0 10px 0 12px',
                        background: p2Win ? 'rgba(22,163,74,0.07)' : 'transparent',
                      }}>
                        {p2Win && (
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--turf-green)' }} />
                        )}
                        <span style={{
                          fontSize: 11, fontWeight: p2Win ? 700 : 400, lineHeight: 1.2,
                          color: p2Bye ? 'var(--grey-300)' : match.pair2 ? (p2Win ? '#15803d' : 'var(--black)') : 'var(--grey-300)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '76%',
                        }}>
                          {p2Bye ? 'BYE' : match.pair2 ? p2Name : '–'}
                        </span>
                        {isComp && !p2Bye && match.pair2 && (
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: p2Win ? 'var(--turf-green)' : 'var(--grey-400)', flexShrink: 0 }}>
                            {match.pair2Score}
                          </span>
                        )}
                      </div>

                      {/* Editable badge */}
                      {canEdit && (
                        <div style={{
                          position: 'absolute', bottom: 0, right: 0,
                          background: 'var(--black)', color: 'var(--neon)',
                          fontSize: 7, fontWeight: 800, padding: '2px 5px', letterSpacing: '0.07em', textTransform: 'uppercase',
                        }}>
                          + resultado
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}

        {/* ── Champion box ── */}
        {champion && (
          <>
            {/* Connecting line to champion */}
            <div style={{ flex: `0 0 ${CONN_W}px`, height: TOTAL_H + HEADER_H, position: 'relative' }}>
              <svg width={CONN_W} height={TOTAL_H} style={{ position: 'absolute', top: HEADER_H, left: 0, overflow: 'visible' }}>
                <line x1={-6} y1={TOTAL_H / 2} x2={CONN_W + 6} y2={TOTAL_H / 2} stroke="#d1d5db" strokeWidth={1.5} />
              </svg>
            </div>
            <div style={{
              flex: `0 0 ${CHAMP_W}px`, height: TOTAL_H + HEADER_H,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: '100%', padding: '18px 14px', background: 'var(--neon)', textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>
                  Campeón
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--black)', lineHeight: 1.3 }}>
                  🏆 {champion}
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Score entry modal */}
      {editTarget && onScoreEntry && (
        <ScoreModal
          pair1Name={editPair1Name}
          pair2Name={editPair2Name}
          onConfirm={(s1, s2) => {
            onScoreEntry(editTarget.roundIdx, editTarget.matchIdx, s1, s2);
            setEditTarget(null);
          }}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
