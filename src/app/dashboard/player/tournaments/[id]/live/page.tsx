'use client';
import React, { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
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
import type { GameRound, GamePlayer } from '@/lib/game-engine';

// ── Types ─────────────────────────────────────────────────────────────────────

type CurrentUser = { id: string; name: string; email: string; shortId?: string; ranking?: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  round_robin: 'Round Robin',
  team_league: 'Team League',
  knockout: 'Knockout',
  world_cup: 'World Cup',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPlayerName(tournament: Tournament, playerId: string): string {
  return tournament.players.find(p => p.id === playerId)?.name ?? playerId;
}

function getPairLabel(tournament: Tournament, ids: string[]): string {
  return ids.map(id => getPlayerName(tournament, id)).join(' / ');
}

function getRestingPlayers(tournament: Tournament, round: GameRound): GamePlayer[] {
  const playingIds = new Set<string>();
  for (const match of round.courts) {
    [...match.pair1, ...match.pair2].forEach(id => playingIds.add(id));
  }
  return tournament.players.filter(p => !playingIds.has(p.id));
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const secTitle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'var(--grey-400)',
  marginBottom: 16,
  paddingBottom: 10,
  borderBottom: '1px solid var(--grey-100)',
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--grey-200)',
  padding: '20px 24px',
  marginBottom: 16,
};

// ── Page Component ─────────────────────────────────────────────────────────────

export default function LiveTorneoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Score inputs: key = `${roundNum}-${courtNum}`, value = { p1: string; p2: string }
  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});

  // ── Load user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const u = localStorage.getItem('padelmgt_user');
      if (u) setCurrentUser(JSON.parse(u) as CurrentUser);
    } catch { /* ignore */ }
  }, []);

  // ── Load tournament (with polling) ────────────────────────────────────────
  const loadTournament = useCallback(() => {
    const t = getTournament(id);
    setTournament(t ?? null);
  }, [id]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  useEffect(() => {
    const interval = setInterval(loadTournament, 5000);
    return () => clearInterval(interval);
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

  // ── Access control ────────────────────────────────────────────────────────
  const canManage = currentUser != null && (
    t.creatorId === currentUser.id ||
    t.players.find(p => p.id === currentUser.id)?.isCreator === true
  );

  if (currentUser != null && !canManage) {
    router.replace(`/dashboard/player/tournaments/${id}/view`);
    return null;
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const currentRoundNum = t.currentRound;
  const totalRounds = t.rounds.length;
  const isMexicano = t.format === 'mexicano';
  const expectedTotalRounds = isMexicano
    ? (t.pairType === 'parejas' && t.fixedPairs ? t.fixedPairs.length : t.players.length)
    : totalRounds;

  const activeRound: GameRound | undefined = t.rounds.find(r => r.num === currentRoundNum);
  const roundComplete = activeRound ? isRoundComplete(activeRound) : false;
  const gameFinished = isGameFinished(t);

  const isPointsMode = t.scoreConfig?.type === 'points';
  const ptTarget = isPointsMode ? (t.scoreConfig?.target ?? 24) : null;

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tournament/${t.code}`
    : `https://padelmgt.com/tournament/${t.code}`;

  // ── Score handlers ────────────────────────────────────────────────────────

  function handleP1Change(key: string, val: string) {
    setScoreInputs(prev => {
      const current = prev[key] ?? { p1: '', p2: '' };
      if (isPointsMode && ptTarget !== null) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 0 && n <= ptTarget) {
          return { ...prev, [key]: { p1: val, p2: String(ptTarget - n) } };
        }
      }
      return { ...prev, [key]: { ...current, p1: val } };
    });
  }

  function handleP2Change(key: string, val: string) {
    setScoreInputs(prev => {
      const current = prev[key] ?? { p1: '', p2: '' };
      if (isPointsMode && ptTarget !== null) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 0 && n <= ptTarget) {
          return { ...prev, [key]: { p1: String(ptTarget - n), p2: val } };
        }
      }
      return { ...prev, [key]: { ...current, p2: val } };
    });
  }

  function handleSaveScore(roundNum: number, courtNum: number) {
    const key = `${roundNum}-${courtNum}`;
    const raw = scoreInputs[key] ?? { p1: '', p2: '' };
    const p1 = Math.max(0, parseInt(raw.p1 || '0', 10));
    const p2 = Math.max(0, parseInt(raw.p2 || '0', 10));
    const updated = updateMatchScore(t, roundNum, courtNum, p1, p2);
    saveTournament(updated);
    setTournament(updated);
  }

  function getInputVal(
    roundNum: number,
    courtNum: number,
    side: 'p1' | 'p2',
    court: { pair1Score: number | null; pair2Score: number | null }
  ): string {
    const key = `${roundNum}-${courtNum}`;
    if (scoreInputs[key]) return scoreInputs[key][side];
    const val = side === 'p1' ? court.pair1Score : court.pair2Score;
    return val !== null ? String(val) : '';
  }

  // ── Advance to next round ─────────────────────────────────────────────────

  function handleNextRound() {
    const next = startNextRound(t);
    const withStandings = { ...next, standings: calculateStandings(next) };
    saveTournament(withStandings);
    setTournament(withStandings);
    setScoreInputs({});
  }

  // ── Finish tournament ─────────────────────────────────────────────────────

  function handleFinishTournament() {
    const standings = calculateStandings(t);
    const updated: Tournament = { ...t, status: 'finished', standings };
    saveTournament(updated);
    applyTournamentRankingResults(updated);
    router.push(`/dashboard/player/tournaments/${id}`);
  }

  // ── Copy URL ──────────────────────────────────────────────────────────────

  function handleCopyUrl() {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Sorted rounds ─────────────────────────────────────────────────────────
  const sortedRounds = [...t.rounds].sort((a, b) => a.num - b.num);

  // ── Score config label ────────────────────────────────────────────────────
  const scoreConfigLabel = isPointsMode
    ? `${ptTarget ?? 24} pts por partido`
    : `${t.scoreConfig?.setsPerMatch ?? 3} sets por partido`;

  // ── Creator player ────────────────────────────────────────────────────────
  const creatorPlayer = t.players.find(p => p.id === t.creatorId || p.isCreator);

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

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 32px' }}>

        {/* ── INFO PANEL: 3-column grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>

          {/* Col 1: Detalles del torneo */}
          <div style={card}>
            <div style={secTitle}>Detalles del Torneo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div>
                <span style={{ fontWeight: 700, color: 'var(--black)' }}>{t.name}</span>
              </div>
              <InfoRow label="Formato" value={FORMAT_LABEL[t.format] ?? t.format} />
              <InfoRow label="Modalidad" value={t.pairType === 'parejas' ? 'Parejas Fijas' : 'Individual'} />
              <InfoRow label="Mixto" value={(t as Tournament & { mixto?: boolean }).mixto ? 'Sí' : 'No'} />
              <InfoRow label="Puntuación" value={scoreConfigLabel} />
              <InfoRow label="Canchas" value={String(t.courts)} />
              <InfoRow label="Fecha" value={t.date} />
              <InfoRow label="Hora" value={t.time} />
              {t.club && <InfoRow label="Club" value={t.club} />}
              {t.city && <InfoRow label="Ciudad" value={t.city} />}
            </div>
          </div>

          {/* Col 2: Jugadores */}
          <div style={card}>
            <div style={secTitle}>Jugadores ({t.players.length}/{t.maxPlayers})</div>
            <div style={{ fontSize: 11, color: 'var(--grey-500)', marginBottom: 12 }}>
              Jugadores confirmados: <strong>{t.players.length}</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {t.players.map((p, i) => {
                const isCreatorPlayer = p.id === t.creatorId || p.isCreator;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ fontSize: 10, color: 'var(--grey-400)', minWidth: 18, textAlign: 'right', fontWeight: 700 }}>
                      {i + 1}.
                    </span>
                    <span style={{ fontWeight: isCreatorPlayer ? 700 : 400, color: 'var(--black)' }}>
                      {p.name}
                    </span>
                    {isCreatorPlayer && (
                      <span style={{ fontSize: 12, color: '#f59e0b' }}>★</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Col 3: QR Código */}
          <div style={card}>
            <div style={secTitle}>QR Código</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <QRCodeSVG value={shareUrl} size={120} />
              <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--black)', letterSpacing: '0.1em' }}>
                {t.code}
              </div>
              <button
                onClick={handleCopyUrl}
                style={{
                  padding: '7px 16px',
                  background: copied ? 'var(--turf-green)' : 'var(--black)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  transition: 'background 0.2s',
                }}>
                {copied ? '✓ Copiado' : 'Copiar URL'}
              </button>
              <div style={{ fontSize: 10, color: 'var(--grey-400)', textAlign: 'center', wordBreak: 'break-all' }}>
                {shareUrl}
              </div>
            </div>
          </div>
        </div>

        {/* ── RONDAS ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)', marginBottom: 16 }}>
            Rondas
          </div>

          {sortedRounds.map(round => {
            const isActive = round.num === currentRoundNum;
            const isCompleted = round.status === 'completed';
            const isPending = round.status === 'pending' && !isActive;
            const roundDone = isRoundComplete(round);
            const restingPlayers = getRestingPlayers(t, round);

            let sectionBg = '#fff';
            let sectionBorder = '1px solid var(--grey-200)';
            let leftBorder = 'none';

            if (isActive) {
              leftBorder = '4px solid var(--turf-green, #22c55e)';
              sectionBorder = '1px solid var(--grey-200)';
            } else if (isCompleted) {
              sectionBg = '#fafafa';
              sectionBorder = '1px solid var(--grey-100)';
            } else if (isPending) {
              sectionBg = '#fafafa';
              sectionBorder = '1px solid var(--grey-100)';
            }

            return (
              <div key={round.num} style={{
                background: sectionBg,
                border: sectionBorder,
                borderLeft: leftBorder || sectionBorder,
                marginBottom: 24,
                overflow: 'hidden',
              }}>
                {/* Round header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--grey-100)',
                  background: isActive ? '#fff' : sectionBg,
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isCompleted || isPending ? 'var(--grey-400)' : 'var(--black)' }}>
                    Ronda {round.num}
                  </span>
                  {isActive && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'var(--turf-green, #16a34a)', background: '#dcfce7', padding: '3px 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--turf-green, #16a34a)',
                        display: 'inline-block',
                        animation: 'pulse 1.5s infinite',
                      }} />
                      En Juego
                    </span>
                  )}
                  {isCompleted && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      ✓ Completada
                    </span>
                  )}
                  {isPending && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey-400)', background: 'var(--grey-100)', padding: '3px 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Pendiente
                    </span>
                  )}
                </div>

                {/* Court cards */}
                <div style={{ padding: '16px 20px' }}>
                  {round.courts.map(court => {
                    const key = `${round.num}-${court.courtNum}`;
                    const isCourtDone = court.status === 'completed';
                    const isEditable = isActive && !isCompleted;
                    const pair1Label = getPairLabel(t, court.pair1);
                    const pair2Label = getPairLabel(t, court.pair2);

                    return (
                      <div key={court.courtNum} style={{
                        border: `2px solid ${isCourtDone ? 'var(--turf-green, #22c55e)' : isPending ? 'var(--grey-100)' : 'var(--grey-200)'}`,
                        padding: '14px 18px',
                        marginBottom: 12,
                        background: isCourtDone ? 'rgba(34,197,94,0.04)' : '#fff',
                        opacity: isPending ? 0.6 : 1,
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>
                          Cancha {court.courtNum}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Pair 1 */}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', marginBottom: isEditable ? 8 : 4, lineHeight: 1.3 }}>
                              {pair1Label}
                            </div>
                            {isEditable ? (
                              <input
                                type="number"
                                min={0}
                                max={ptTarget ?? 100}
                                value={getInputVal(round.num, court.courtNum, 'p1', court)}
                                onChange={e => handleP1Change(key, e.target.value)}
                                onBlur={() => handleSaveScore(round.num, court.courtNum)}
                                style={{
                                  width: 80,
                                  padding: '8px 4px',
                                  fontSize: 28,
                                  fontFamily: 'var(--font-display)',
                                  fontWeight: 700,
                                  textAlign: 'center',
                                  border: '2px solid var(--grey-300)',
                                  outline: 'none',
                                  color: 'var(--black)',
                                  background: '#fff',
                                }}
                                onFocus={e => { e.currentTarget.style.borderColor = 'var(--black)'; }}
                                onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--grey-300)'; }}
                              />
                            ) : (
                              <div style={{
                                width: 80, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
                                color: isCourtDone ? 'var(--turf-green, #16a34a)' : 'var(--grey-300)',
                              }}>
                                {court.pair1Score !== null ? court.pair1Score : '–'}
                              </div>
                            )}
                          </div>

                          {/* VS divider */}
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-400)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                            vs
                          </div>

                          {/* Pair 2 */}
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', marginBottom: isEditable ? 8 : 4, lineHeight: 1.3 }}>
                              {pair2Label}
                            </div>
                            {isEditable ? (
                              <input
                                type="number"
                                min={0}
                                max={ptTarget ?? 100}
                                value={getInputVal(round.num, court.courtNum, 'p2', court)}
                                onChange={e => handleP2Change(key, e.target.value)}
                                onBlur={() => handleSaveScore(round.num, court.courtNum)}
                                style={{
                                  width: 80,
                                  padding: '8px 4px',
                                  fontSize: 28,
                                  fontFamily: 'var(--font-display)',
                                  fontWeight: 700,
                                  textAlign: 'center',
                                  border: '2px solid var(--grey-300)',
                                  outline: 'none',
                                  color: 'var(--black)',
                                  background: '#fff',
                                  float: 'right',
                                }}
                                onFocus={e => { e.currentTarget.style.borderColor = 'var(--black)'; }}
                                onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--grey-300)'; }}
                              />
                            ) : (
                              <div style={{
                                width: 80, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
                                color: isCourtDone ? 'var(--turf-green, #16a34a)' : 'var(--grey-300)',
                              }}>
                                {court.pair2Score !== null ? court.pair2Score : '–'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Descansan */}
                  {restingPlayers.length > 0 && (
                    <div style={{
                      padding: '8px 14px',
                      background: 'var(--grey-50)',
                      border: '1px solid var(--grey-100)',
                      fontSize: 12,
                      color: 'var(--grey-500)',
                      marginTop: 4,
                    }}>
                      Descansan — {restingPlayers.map(p => p.name).join(', ')}
                    </div>
                  )}
                </div>

                {/* Action banner: only on active round when complete */}
                {isActive && roundDone && (
                  <div style={{
                    padding: '18px 20px',
                    background: 'rgba(34,197,94,0.08)',
                    border: 'none',
                    borderTop: '2px solid rgba(34,197,94,0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--turf-green, #16a34a)' }}>
                      ✓ Ronda {currentRoundNum} completada
                    </div>
                    {!gameFinished ? (
                      <button
                        onClick={handleNextRound}
                        style={{
                          padding: '12px 24px',
                          background: 'var(--black)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-display)',
                          fontSize: 14,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}>
                        SIGUIENTE RONDA →
                      </button>
                    ) : (
                      <button
                        onClick={handleFinishTournament}
                        style={{
                          padding: '12px 24px',
                          background: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-display)',
                          fontSize: 14,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}>
                        FINALIZAR TORNEO
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── CLASIFICACIÓN ── */}
        {t.standings.length > 0 && (
          <div style={card}>
            <div style={secTitle}>Clasificación</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--grey-100)' }}>
                  {['Pos', 'Jugador', 'W', 'Pts', 'PJ', '+/-'].map(h => (
                    <th key={h} style={{
                      padding: '6px 8px',
                      textAlign: h === 'Jugador' ? 'left' : 'center',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--grey-400)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.standings.map((s, i) => {
                  const isMe = currentUser && s.playerId === currentUser.id;
                  const isCreatorRow = s.playerId === t.creatorId || s.playerId === creatorPlayer?.id;
                  return (
                    <tr key={s.playerId} style={{
                      borderBottom: '1px solid var(--grey-100)',
                      background: isCreatorRow ? 'rgba(214,255,0,0.08)' : 'transparent',
                    }}>
                      <td style={{
                        padding: '8px',
                        textAlign: 'center',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        color: i === 0 ? '#f59e0b' : 'var(--grey-400)',
                        fontSize: i === 0 ? 16 : 13,
                      }}>
                        {i === 0 ? '🥇' : i + 1}
                      </td>
                      <td style={{ padding: '8px', fontWeight: isMe ? 700 : 500 }}>
                        {s.playerName}
                        {isCreatorRow && <span style={{ marginLeft: 4, fontSize: 12, color: '#f59e0b' }}>★</span>}
                        {isMe && !isCreatorRow && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--grey-400)' }}>(tú)</span>}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{s.wins}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{s.pts}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{s.played}</td>
                      <td style={{
                        padding: '8px',
                        textAlign: 'center',
                        color: s.diff >= 0 ? 'var(--turf-green, #16a34a)' : '#dc2626',
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
      </div>

      {/* Pulse animation for active dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

// ── InfoRow helper ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--grey-400)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--black)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}
