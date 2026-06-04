'use client';

import React, { useState } from 'react';
import type { KnockoutBracket, FixedPair, GamePlayer } from '@/lib/game-engine';

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
    const names = pairIds.map(id => players.find(p => p.id === id)?.name ?? '?');
    return names.join(' / ');
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
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

export default function KnockoutBracketView({ bracket, fixedPairs, players, onScoreEntry, isEditable = false }: Props) {
  const [editTarget, setEditTarget] = useState<{ roundIdx: number; matchIdx: number } | null>(null);

  const editMatch = editTarget
    ? bracket.rounds[editTarget.roundIdx]?.matches[editTarget.matchIdx]
    : null;
  const editPair1Name = editMatch ? getPairName(editMatch.pair1, fixedPairs, players) : '';
  const editPair2Name = editMatch ? getPairName(editMatch.pair2, fixedPairs, players) : '';

  const numRounds = bracket.rounds.length;

  return (
    <div>
      {/* Bracket header */}
      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{ display: 'flex', gap: 0, minWidth: numRounds * 220 + (numRounds - 1) * 1 }}>
          {bracket.rounds.map((round, roundIdx) => {
            const matchesInRound = round.matches.length;
            const totalHeight = Math.max(matchesInRound * 88, 88);

            return (
              <div key={roundIdx} style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column' }}>
                {/* Round label */}
                <div style={{ padding: '10px 16px', background: 'var(--black)', color: 'var(--neon)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 }}>
                  {round.name}
                </div>

                {/* Matches */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: totalHeight }}>
                  {round.matches.map((match, matchIdx) => {
                    const p1Name = getPairName(match.pair1, fixedPairs, players);
                    const p2Name = getPairName(match.pair2, fixedPairs, players);
                    const p1Bye = isByeSlot(match.pair1);
                    const p2Bye = isByeSlot(match.pair2);
                    const isComplete = match.status === 'completed';
                    const canEdit = isEditable && !isComplete && match.pair1 && match.pair2 && !p1Bye && !p2Bye;

                    const p1Win = isComplete && match.winner && match.pair1 && match.winner[0] === match.pair1[0];
                    const p2Win = isComplete && match.winner && match.pair2 && match.winner[0] === match.pair2[0];

                    return (
                      <div key={matchIdx} style={{ margin: '4px 8px', position: 'relative' }}>
                        {/* Match card */}
                        <div
                          onClick={() => canEdit && setEditTarget({ roundIdx, matchIdx })}
                          style={{
                            border: `1px solid ${isComplete ? 'var(--grey-200)' : canEdit ? 'var(--grey-300)' : 'var(--grey-100)'}`,
                            background: isComplete ? '#fff' : canEdit ? '#fff' : 'var(--grey-50)',
                            cursor: canEdit ? 'pointer' : 'default',
                            overflow: 'hidden',
                            transition: 'border-color 0.15s',
                          }}
                        >
                          {/* Pair 1 */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 12px',
                            background: p1Win ? 'rgba(30,170,82,0.06)' : 'transparent',
                            borderBottom: '1px solid var(--grey-100)',
                          }}>
                            <span style={{
                              fontSize: 11, fontWeight: p1Win ? 700 : 500,
                              color: p1Bye ? 'var(--grey-300)' : match.pair1 ? 'var(--black)' : 'var(--grey-300)',
                              maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {p1Bye ? 'BYE' : match.pair1 ? p1Name : '–'}
                            </span>
                            {isComplete && !p1Bye && match.pair1 && (
                              <span style={{ fontSize: 13, fontWeight: 700, color: p1Win ? 'var(--turf-green)' : 'var(--grey-400)', flexShrink: 0 }}>
                                {match.pair1Score}
                              </span>
                            )}
                          </div>

                          {/* Pair 2 */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 12px',
                            background: p2Win ? 'rgba(30,170,82,0.06)' : 'transparent',
                          }}>
                            <span style={{
                              fontSize: 11, fontWeight: p2Win ? 700 : 500,
                              color: p2Bye ? 'var(--grey-300)' : match.pair2 ? 'var(--black)' : 'var(--grey-300)',
                              maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {p2Bye ? 'BYE' : match.pair2 ? p2Name : '–'}
                            </span>
                            {isComplete && !p2Bye && match.pair2 && (
                              <span style={{ fontSize: 13, fontWeight: 700, color: p2Win ? 'var(--turf-green)' : 'var(--grey-400)', flexShrink: 0 }}>
                                {match.pair2Score}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Edit indicator */}
                        {canEdit && (
                          <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--black)', color: 'var(--neon)', fontSize: 8, fontWeight: 700, padding: '2px 5px', letterSpacing: '0.08em' }}>
                            + RESULTADO
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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
