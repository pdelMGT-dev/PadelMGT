'use client';
import React, { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTournament, saveTournament } from '@/lib/tournament-store';
import type { Tournament } from '@/lib/tournament-store';
import { applyTournamentRankingResults } from '@/lib/ranking-store';
import {
  updateMatchScore,
  startNextRound,
  isRoundComplete,
  isGameFinished,
  calculateStandings,
} from '@/lib/game-engine';
import type { GameRound } from '@/lib/game-engine';

// ── Types ─────────────────────────────────────────────────────────────────────

type CurrentUser = { id: string; name: string; email: string; shortId?: string; ranking?: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPlayerName(tournament: Tournament, playerId: string): string {
  return tournament.players.find(p => p.id === playerId)?.name ?? playerId;
}

function getPairLabel(tournament: Tournament, ids: string[]): string {
  return ids.map(id => getPlayerName(tournament, id)).join(' / ');
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)',
};

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 16,
};

// ── Page Component ─────────────────────────────────────────────────────────────

export default function LiveTorneoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);
  const [viewingRound, setViewingRound] = useState<number | null>(null);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState<Set<number>>(new Set());

  // Score inputs: key = `${roundNum}-${courtNum}`, value = { p1: string; p2: string }
  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});

  // ── Load user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const u = localStorage.getItem('padelmgt_user');
      if (u) setCurrentUser(JSON.parse(u) as CurrentUser);
    } catch { /* ignore */ }
  }, []);

  // ── Load tournament ───────────────────────────────────────────────────────
  const loadTournament = useCallback(() => {
    const t = getTournament(id);
    setTournament(t ?? null);
  }, [id]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  // ── Redirect if not live ──────────────────────────────────────────────────
  useEffect(() => {
    if (tournament && tournament.status !== 'live') {
      router.replace(`/dashboard/player/tournaments/${id}`);
    }
  }, [tournament, id, router]);

  // ── Guard: loading ────────────────────────────────────────────────────────
  if (tournament === undefined) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--grey-400)' }}>
        Cargando...
      </div>
    );
  }

  // ── Guard: not found ──────────────────────────────────────────────────────
  if (tournament === null) {
    return (
      <div style={{ padding: '80px 40px', maxWidth: 500, textAlign: 'center', margin: '0 auto' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
          Torneo no encontrado
        </div>
        <Link href="/dashboard/player/tournaments"
          style={{ padding: '11px 24px', background: 'var(--black)', color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
          ← Mis Torneos
        </Link>
      </div>
    );
  }

  const t = tournament;
  const isCreator = currentUser != null && t.creatorId === currentUser.id;
  const isCoCreator = currentUser != null && (t.coCreatorIds ?? []).includes(currentUser.id);
  const hasAccess = isCreator || isCoCreator;

  // ── Guard: no access ──────────────────────────────────────────────────────
  if (currentUser != null && !hasAccess) {
    return (
      <div style={{ padding: '80px 40px', maxWidth: 500, textAlign: 'center', margin: '0 auto' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
          Acceso denegado
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 28 }}>
          Solo el creador y co-creadores pueden gestionar este torneo.
        </div>
        <Link href={`/dashboard/player/tournaments/${id}`}
          style={{ padding: '11px 24px', background: 'var(--black)', color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
          ← Gestionar
        </Link>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const currentRoundNum = t.currentRound;
  const activeRound: GameRound | undefined = t.rounds.find(r => r.num === currentRoundNum);
  const totalRounds = t.rounds.length;
  const isMexicano = t.format === 'mexicano';

  // For mexicano, total rounds = number of players (or fixedPairs count for parejas)
  const expectedTotalRounds = isMexicano
    ? (t.pairType === 'parejas' && t.fixedPairs ? t.fixedPairs.length : t.players.length)
    : totalRounds;

  const roundComplete = activeRound ? isRoundComplete(activeRound) : false;
  const gameFinished = isGameFinished(t);
  const isLastRound = currentRoundNum >= expectedTotalRounds;
  const completedRounds = t.rounds.filter(r => r.status === 'completed');

  // The round being displayed in the score entry section
  const displayRoundNum = viewingRound ?? currentRoundNum;
  const displayRound: GameRound | undefined = t.rounds.find(r => r.num === displayRoundNum);
  const isViewingCurrent = displayRoundNum === currentRoundNum;

  // ── Score handler ─────────────────────────────────────────────────────────

  function handleScoreChange(roundNum: number, courtNum: number, side: 'p1' | 'p2', value: string) {
    const key = `${roundNum}-${courtNum}`;
    setScoreInputs(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? { p1: '', p2: '' }), [side]: value },
    }));
  }

  function handleScoreCommit(roundNum: number, courtNum: number) {
    const key = `${roundNum}-${courtNum}`;
    const inputs = scoreInputs[key];
    if (!inputs) return;
    const p1 = parseInt(inputs.p1, 10);
    const p2 = parseInt(inputs.p2, 10);
    if (isNaN(p1) || isNaN(p2)) return;

    const updated = updateMatchScore(t, roundNum, courtNum, p1, p2);
    saveTournament(updated);
    setTournament(updated);
  }

  // ── Advance to next round ─────────────────────────────────────────────────

  function handleNextRound() {
    const next = startNextRound(t);
    const withStandings = { ...next, standings: calculateStandings(next) };
    saveTournament(withStandings);
    setTournament(withStandings);
    setViewingRound(null);
    setScoreInputs({});
  }

  // ── Finish tournament ─────────────────────────────────────────────────────

  function handleFinishTournament() {
    const updated: Tournament = { ...t, status: 'finished' };
    saveTournament(updated);
    applyTournamentRankingResults(updated);
    setTournament(updated);
    router.push(`/dashboard/player/tournaments/${id}`);
  }

  function toggleHistory(roundNum: number) {
    setHistoryOpen(prev => {
      const next = new Set(prev);
      if (next.has(roundNum)) { next.delete(roundNum); } else { next.add(roundNum); }
      return next;
    });
  }

  // ── Score input key helper ────────────────────────────────────────────────

  function getInputVal(roundNum: number, courtNum: number, side: 'p1' | 'p2', court: { pair1Score: number | null; pair2Score: number | null }): string {
    const key = `${roundNum}-${courtNum}`;
    if (scoreInputs[key]) return scoreInputs[key][side];
    const val = side === 'p1' ? court.pair1Score : court.pair2Score;
    return val !== null ? String(val) : '';
  }

  return (
    <div style={{ paddingBottom: 80 }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 32px', background: 'var(--black)', color: '#fff',
        position: 'sticky', top: 0, zIndex: 20, gap: 16,
      }}>
        <Link href={`/dashboard/player/tournaments/${id}`}
          style={{ fontSize: 12, color: 'var(--grey-300)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
          ← Gestionar
        </Link>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#fff', lineHeight: 1.2 }}>
            {t.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 2 }}>
            Ronda {currentRoundNum} / {expectedTotalRounds}
          </div>
        </div>
        {!finishConfirm ? (
          <button
            onClick={() => setFinishConfirm(true)}
            style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            Finalizar Torneo
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#fca5a5', fontWeight: 700 }}>¿Seguro?</span>
            <button onClick={handleFinishTournament}
              style={{ padding: '7px 12px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
              Sí
            </button>
            <button onClick={() => setFinishConfirm(false)}
              style={{ padding: '7px 10px', background: 'transparent', color: 'var(--grey-300)', border: '1px solid var(--grey-500)', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
              No
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 32px' }}>

        {/* ── Round progress pills ── */}
        <div style={{ overflowX: 'auto', paddingBottom: 4, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
            {t.rounds.map(r => {
              const isActive = r.num === currentRoundNum;
              const isDone = r.status === 'completed';
              const isViewing = r.num === displayRoundNum;
              let bg = 'transparent';
              let color = 'var(--grey-400)';
              let border = '1px solid var(--grey-200)';
              if (isActive) { bg = 'var(--black)'; color = '#fff'; border = '1px solid var(--black)'; }
              if (isDone) { bg = 'var(--turf-green)'; color = '#fff'; border = '1px solid var(--turf-green)'; }
              if (isViewing && !isActive) { border = '2px solid var(--black)'; }

              return (
                <button
                  key={r.num}
                  onClick={() => setViewingRound(r.num === currentRoundNum ? null : r.num)}
                  style={{
                    padding: '6px 14px', background: bg, color, border,
                    cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 12,
                    fontWeight: 700, letterSpacing: '0.06em',
                  }}>
                  R{r.num}{isDone ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Current / selected round score entry ── */}
        {displayRound && (
          <div style={{ ...card, padding: '0', overflow: 'hidden' }}>
            <div style={{
              padding: '14px 24px', borderBottom: '1px solid var(--grey-100)',
              background: displayRound.status === 'completed' ? 'rgba(0,180,0,0.04)' : '#fff',
            }}>
              <div style={secTitle}>
                Ronda {displayRound.num} — {displayRound.status === 'completed' ? 'COMPLETADA' : 'EN JUEGO'}
              </div>

              {/* Resting players */}
              {displayRound.resting && displayRound.resting.length > 0 && (
                <div style={{
                  padding: '8px 14px', background: 'var(--grey-50)', border: '1px solid var(--grey-100)',
                  fontSize: 12, color: 'var(--grey-500)', marginBottom: 16,
                }}>
                  Descansan: {displayRound.resting.map(pid => getPlayerName(t, pid)).join(', ')}
                </div>
              )}
            </div>

            <div style={{ padding: '20px 24px' }}>
              {displayRound.courts.map(court => {
                const isCompleted = court.status === 'completed';
                const isCurrentEditable = isViewingCurrent && !isCompleted;
                const pair1Label = getPairLabel(t, court.pair1);
                const pair2Label = getPairLabel(t, court.pair2);

                return (
                  <div key={court.courtNum} style={{
                    border: `2px solid ${isCompleted ? 'var(--turf-green)' : 'var(--grey-200)'}`,
                    padding: '16px 20px',
                    marginBottom: 16,
                    background: isCompleted ? 'rgba(0,180,0,0.03)' : '#fff',
                  }}>
                    <div style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 14,
                    }}>
                      Cancha {court.courtNum}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Pair 1 */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)', marginBottom: 8, lineHeight: 1.3 }}>
                          {pair1Label}
                        </div>
                        {isCurrentEditable ? (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={getInputVal(displayRound.num, court.courtNum, 'p1', court)}
                            onChange={e => handleScoreChange(displayRound.num, court.courtNum, 'p1', e.target.value)}
                            onBlur={() => handleScoreCommit(displayRound.num, court.courtNum)}
                            style={{
                              width: 64, padding: '10px 8px', fontSize: 20, fontFamily: 'var(--font-display)',
                              fontWeight: 700, textAlign: 'center', border: '2px solid var(--grey-300)',
                              outline: 'none', color: 'var(--black)', background: '#fff',
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 64, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
                            color: isCompleted ? 'var(--turf-green)' : 'var(--grey-300)',
                          }}>
                            {court.pair1Score !== null ? court.pair1Score : '–'}
                          </div>
                        )}
                      </div>

                      {/* VS divider */}
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--grey-400)',
                        letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
                      }}>
                        vs
                      </div>

                      {/* Pair 2 */}
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)', marginBottom: 8, lineHeight: 1.3 }}>
                          {pair2Label}
                        </div>
                        {isCurrentEditable ? (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={getInputVal(displayRound.num, court.courtNum, 'p2', court)}
                            onChange={e => handleScoreChange(displayRound.num, court.courtNum, 'p2', e.target.value)}
                            onBlur={() => handleScoreCommit(displayRound.num, court.courtNum)}
                            style={{
                              width: 64, padding: '10px 8px', fontSize: 20, fontFamily: 'var(--font-display)',
                              fontWeight: 700, textAlign: 'center', border: '2px solid var(--grey-300)',
                              outline: 'none', color: 'var(--black)', background: '#fff',
                              float: 'right',
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 64, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
                            color: isCompleted ? 'var(--turf-green)' : 'var(--grey-300)',
                          }}>
                            {court.pair2Score !== null ? court.pair2Score : '–'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Action banner: round complete ── */}
        {roundComplete && isViewingCurrent && (
          <div style={{
            padding: '20px 24px', background: 'rgba(0,180,0,0.08)',
            border: '2px solid rgba(0,180,0,0.3)', marginBottom: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--turf-green)', marginBottom: 4 }}>
                ✓ Ronda {currentRoundNum} completada
              </div>
              {isMexicano && isLastRound && (
                <div style={{ fontSize: 11, color: 'var(--grey-500)', fontStyle: 'italic' }}>
                  Torneo casi finalizado
                </div>
              )}
            </div>
            {!gameFinished && !isLastRound ? (
              <button
                onClick={handleNextRound}
                style={{
                  padding: '12px 24px', background: 'var(--black)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)',
                  fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                SIGUIENTE RONDA →
              </button>
            ) : (
              <button
                onClick={handleFinishTournament}
                style={{
                  padding: '12px 24px', background: '#dc2626', color: '#fff',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)',
                  fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                FINALIZAR TORNEO
              </button>
            )}
          </div>
        )}

        {/* ── Standings table ── */}
        {t.standings.length > 0 && (
          <div style={card}>
            <div style={secTitle}>Clasificación</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--grey-100)' }}>
                  {['Pos', 'Jugador', 'W', 'Pts', 'PJ', '+/-'].map(h => (
                    <th key={h} style={{
                      padding: '6px 8px', textAlign: h === 'Jugador' ? 'left' : 'center',
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: 'var(--grey-400)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.standings.map((s, i) => {
                  const isMe = currentUser && s.playerId === currentUser.id;
                  return (
                    <tr key={s.playerId} style={{
                      borderBottom: '1px solid var(--grey-100)',
                      background: isMe ? 'rgba(214,255,0,0.08)' : 'transparent',
                    }}>
                      <td style={{
                        padding: '8px', textAlign: 'center', fontFamily: 'var(--font-display)',
                        fontWeight: 700, color: i === 0 ? 'var(--turf-green)' : 'var(--grey-400)',
                      }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '8px', fontWeight: isMe ? 700 : 500 }}>
                        {s.playerName}{isMe && ' ★'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{s.wins}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{s.pts}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{s.played}</td>
                      <td style={{
                        padding: '8px', textAlign: 'center',
                        color: s.diff >= 0 ? 'var(--turf-green)' : '#dc2626',
                      }}>
                        {s.diff > 0 ? `+${s.diff}` : s.diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Round history ── */}
        {completedRounds.length > 0 && (
          <div style={card}>
            <div style={secTitle}>Historial de rondas</div>
            {completedRounds.map(r => (
              <div key={r.num} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => toggleHistory(r.num)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--grey-50)', border: '1px solid var(--grey-100)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--black)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                  <span>Ronda {r.num}</span>
                  <span style={{ fontSize: 16, color: 'var(--grey-400)' }}>
                    {historyOpen.has(r.num) ? '▲' : '▼'}
                  </span>
                </button>

                {historyOpen.has(r.num) && (
                  <div style={{ border: '1px solid var(--grey-100)', borderTop: 'none', padding: '12px 14px' }}>
                    {r.courts.map(court => (
                      <div key={court.courtNum} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: '1px solid var(--grey-50)', fontSize: 13,
                      }}>
                        <span style={{ fontSize: 10, color: 'var(--grey-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 60 }}>
                          C{court.courtNum}
                        </span>
                        <span style={{ flex: 1, fontSize: 12 }}>
                          {getPairLabel(t, court.pair1)}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, padding: '0 12px', color: 'var(--black)' }}>
                          {court.pair1Score ?? '–'} – {court.pair2Score ?? '–'}
                        </span>
                        <span style={{ flex: 1, textAlign: 'right', fontSize: 12 }}>
                          {getPairLabel(t, court.pair2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
