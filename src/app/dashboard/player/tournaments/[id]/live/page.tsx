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
import type { GameRound, GamePlayer, Standing, FixedPair } from '@/lib/game-engine';

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

// ── Podium Component ──────────────────────────────────────────────────────────

function PodiumSection({ standings, fixedPairs }: { standings: Standing[], fixedPairs?: FixedPair[] }) {
  const top3 = standings.slice(0, 3);
  if (top3.length < 1) return null;

  const medals = ['🥇', '🥈', '🥉'];
  const heights = [160, 120, 90];
  const order = [1, 0, 2]; // display order: 2nd, 1st, 3rd

  function displayName(s: Standing): string {
    if (fixedPairs?.length) {
      const pair = fixedPairs.find(p => p.player1Id === s.playerId);
      if (pair) return pair.name || `${pair.player1Name} / ${pair.player2Name}`;
    }
    return s.playerName;
  }

  function subName(s: Standing): string | null {
    if (fixedPairs?.length) {
      const pair = fixedPairs.find(p => p.player1Id === s.playerId);
      if (pair && pair.name) return `${pair.player1Name} / ${pair.player2Name}`;
    }
    return null;
  }

  return (
    <div style={{ background: 'var(--black)', padding: '40px 24px 0', marginBottom: 0 }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.4)', fontWeight: 700, textAlign: 'center', marginBottom: 32
      }}>
        🏆 TORNEO FINALIZADO — RESULTADOS
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
        {order.map(i => {
          const s = top3[i];
          if (!s) return <div key={i} style={{ width: 140 }} />;
          const isFirst = i === 0;
          const platH = heights[i];
          const platColor = i === 0 ? '#c9a227' : i === 1 ? '#9e9e9e' : '#a0522d';
          const sub = subName(s);

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 140 }}>
              <div style={{ fontSize: isFirst ? 52 : 40, marginBottom: 8 }}>{medals[i]}</div>
              <div style={{
                color: '#fff', fontSize: isFirst ? 14 : 12, fontWeight: 700,
                textAlign: 'center', marginBottom: sub ? 2 : 4, maxWidth: 132,
                wordBreak: 'break-word', lineHeight: 1.3,
              }}>{displayName(s)}</div>
              {sub && (
                <div style={{
                  color: 'rgba(255,255,255,0.45)', fontSize: 10, textAlign: 'center',
                  marginBottom: 4, maxWidth: 132, wordBreak: 'break-word',
                }}>{sub}</div>
              )}
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: isFirst ? 22 : 18,
                fontWeight: 700, color: platColor, marginBottom: 12
              }}>{s.pts} pts</div>
              <div style={{
                width: '100%', height: platH, background: platColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isFirst ? `0 -4px 20px ${platColor}66` : 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: isFirst ? 32 : 24,
                  fontWeight: 700, color: '#fff', letterSpacing: '-0.02em'
                }}>{i + 1}º</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page Component ─────────────────────────────────────────────────────────────

export default function LiveTorneoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [roundOpen, setRoundOpen] = useState<Record<number, boolean>>({});

  // Score inputs: key = `${roundNum}-${courtNum}`, value = { p1: string; p2: string }
  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});
  const [setInputs, setSetInputs] = useState<Record<string, Array<{ p1: string; p2: string }>>>({});

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

  // ── Auto-open active round ────────────────────────────────────────────────
  useEffect(() => {
    if (!tournament) return;
    if (tournament.status === 'finished') {
      // Open all rounds when finished
      const allOpen: Record<number, boolean> = {};
      tournament.rounds.forEach(r => { allOpen[r.num] = true; });
      setRoundOpen(allOpen);
    } else {
      const activeRound = tournament.rounds.find(r => r.status === 'active');
      if (activeRound) setRoundOpen({ [activeRound.num]: true });
    }
  }, [tournament?.currentRound, tournament?.status]);

  // ── Redirect if not live or finished ─────────────────────────────────────
  useEffect(() => {
    if (tournament && tournament.status !== 'live' && tournament.status !== 'finished') {
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
  const isFinished = t.status === 'finished';
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
  const setsPerMatch = !isPointsMode ? (t.scoreConfig?.setsPerMatch ?? 3) : 0;

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

  function handleTradSetChange(key: string, setIdx: number, side: 'p1' | 'p2', val: string, roundNum: number, courtNum: number) {
    setSetInputs(prev => {
      const current = prev[key] ?? Array.from({ length: setsPerMatch }, () => ({ p1: '', p2: '' }));
      const updated = current.map((s, i) => i === setIdx ? { ...s, [side]: val } : s);
      let w1 = 0, w2 = 0;
      for (const s of updated) {
        const a = parseInt(s.p1 || '0', 10), b = parseInt(s.p2 || '0', 10);
        if (!isNaN(a) && !isNaN(b) && (s.p1 !== '' || s.p2 !== '')) {
          if (a > b) w1++; else if (b > a) w2++;
        }
      }
      setScoreInputs(si => ({ ...si, [key]: { p1: String(w1), p2: String(w2) } }));
      return { ...prev, [key]: updated };
    });
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
    setSetInputs({});
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

      {/* ── Podium (finished mode) ── */}
      {isFinished && (
        <PodiumSection standings={calculateStandings(t)} fixedPairs={t.fixedPairs} />
      )}

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
        {!isFinished && (!finishConfirm ? (
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
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 32px' }}>

        {/* ── INFO PANEL: collapsible accordion ── */}
        <div style={{ marginBottom: 32 }}>
          {/* Accordion header */}
          <div
            onClick={() => setInfoOpen(o => !o)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 24px', background: '#fff', border: '1px solid var(--grey-200)',
              cursor: 'pointer', marginBottom: 1,
            }}
          >
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--grey-500)',
            }}>
              DETALLES DEL TORNEO
            </div>
            <span style={{
              fontSize: 18, color: 'var(--grey-400)',
              transform: infoOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>
              ▼
            </span>
          </div>

          {/* 3-column grid — collapsible */}
          {infoOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 8 }}>

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
          )}
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
                {/* Round header — clickable, always visible */}
                <div
                  onClick={() => setRoundOpen(prev => ({ ...prev, [round.num]: !prev[round.num] }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    cursor: 'pointer',
                    background: isActive ? '#fff' : 'var(--grey-50)',
                    borderLeft: isActive ? '4px solid var(--turf-green, #22c55e)' : '4px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>
                      RONDA {round.num}
                    </span>
                    {isActive && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--turf-green, #22c55e)', fontWeight: 600 }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--turf-green, #22c55e)',
                          display: 'inline-block',
                          animation: 'pulse 2s infinite',
                        }} />
                        EN JUEGO
                      </span>
                    )}
                    {isCompleted && (
                      <span style={{ fontSize: 11, color: 'var(--grey-400)', fontWeight: 600 }}>✓ COMPLETADA</span>
                    )}
                    {isPending && (
                      <span style={{ fontSize: 11, color: 'var(--grey-400)', fontWeight: 600 }}>PENDIENTE</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 14, color: 'var(--grey-400)',
                    transform: roundOpen[round.num] ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s',
                    display: 'inline-block',
                  }}>▼</span>
                </div>

                {/* Round content — collapsible */}
                {roundOpen[round.num] && (
                  <>
                    {/* Court cards */}
                    <div style={{ padding: '16px 20px' }}>
                      {round.courts.map(court => {
                        const key = `${round.num}-${court.courtNum}`;
                        const isCourtDone = court.status === 'completed';
                        const isEditable = isActive && !isCompleted && !isFinished;
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

                    {/* Action banner: only on active round when complete, hidden when finished */}
                    {!isFinished && isActive && roundDone && (
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
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* ── CLASIFICACIÓN + RANKING ── */}
        {t.standings.length > 0 && (() => {
          const POSITION_PRIZES = [250, 175, 125, 62, 25];
          function getProjectedRankingPts(position: number, standing: Standing): number {
            const positionPrize = position < POSITION_PRIZES.length ? POSITION_PRIZES[position] : 0;
            const perGameBonus = standing.wins * 3 + (standing.draws ?? 0) * 1 + (standing.losses ?? 0) * (-1);
            return positionPrize + perGameBonus;
          }

          const liveStandings = calculateStandings(t);
          const isParejas = t.pairType === 'parejas' && t.fixedPairs && t.fixedPairs.length > 0;

          const thStyle = (leftAlign?: boolean): React.CSSProperties => ({
            padding: '6px 8px',
            textAlign: leftAlign ? 'left' : 'center',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--grey-400)',
          });

          const tdCenter: React.CSSProperties = { padding: '7px 8px', textAlign: 'center', fontSize: 12 };
          const tdLeft: React.CSSProperties = { padding: '7px 8px', textAlign: 'left', fontSize: 12 };

          const tableHeader = (label: string) => (
            <div style={{
              background: 'var(--black)', color: '#fff',
              padding: '8px 12px',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              marginBottom: 0,
            }}>
              {label}
            </div>
          );

          return (
            <div style={{ marginBottom: 32 }}>
              {/* TABLE I: CLASIFICACIÓN */}
              <div style={{ ...card, marginBottom: 16, padding: 0 }}>
                {tableHeader('I — CLASIFICACIÓN')}
                <div style={{ padding: '0 0 4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--grey-100)' }}>
                        <th style={thStyle()}>POS</th>
                        <th style={thStyle(true)}>{isParejas ? 'EQUIPO' : 'JUGADOR'}</th>
                        <th style={thStyle()}>PJ</th>
                        <th style={thStyle()}>W</th>
                        <th style={thStyle()}>L</th>
                        <th style={thStyle()}>T</th>
                        <th style={thStyle()}>PTS W</th>
                        <th style={thStyle()}>PTS L</th>
                        <th style={thStyle()}>+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isParejas && t.fixedPairs ? (
                        // Parejas fijas: iterate standings in order (already sorted), find matching pair
                        liveStandings.map((s, i) => {
                          const pair = t.fixedPairs!.find(p => p.player1Id === s.playerId);
                          if (!pair) return null;
                          const isCreatorRow = pair.player1Id === t.creatorId || pair.player2Id === t.creatorId;
                          const isMe = currentUser && (pair.player1Id === currentUser.id || pair.player2Id === currentUser.id);
                          const teamLabel = pair.name || `${pair.player1Name} / ${pair.player2Name}`;
                          return (
                            <tr key={pair.pairIndex} style={{
                              borderBottom: '1px solid var(--grey-100)',
                              background: isCreatorRow ? 'rgba(214,255,0,0.08)' : 'transparent',
                            }}>
                              <td style={{ ...tdCenter, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                                {i === 0 ? '🥇' : i + 1}
                              </td>
                              <td style={{ ...tdLeft, fontWeight: isMe ? 700 : 500 }}>
                                <div>{teamLabel}{isCreatorRow && <span style={{ marginLeft: 4, fontSize: 12, color: '#f59e0b' }}>★</span>}{isMe && !isCreatorRow && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--grey-400)' }}>(tú)</span>}</div>
                                {pair.name && <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 1 }}>{pair.player1Name} / {pair.player2Name}</div>}
                              </td>
                              <td style={tdCenter}>{s.played}</td>
                              <td style={tdCenter}>{s.wins}</td>
                              <td style={tdCenter}>{s.losses ?? 0}</td>
                              <td style={tdCenter}>{s.draws ?? 0}</td>
                              <td style={tdCenter}>{s.pointsFor}</td>
                              <td style={tdCenter}>{s.pointsAgainst}</td>
                              <td style={{ ...tdCenter, color: s.diff >= 0 ? 'var(--turf-green, #16a34a)' : '#dc2626' }}>
                                {s.diff > 0 ? `+${s.diff}` : s.diff}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        // Individual
                        liveStandings.map((s, i) => {
                          const isMe = currentUser && s.playerId === currentUser.id;
                          const isCreatorRow = s.playerId === t.creatorId || s.playerId === creatorPlayer?.id;
                          return (
                            <tr key={s.playerId} style={{
                              borderBottom: '1px solid var(--grey-100)',
                              background: isCreatorRow ? 'rgba(214,255,0,0.08)' : 'transparent',
                            }}>
                              <td style={{ ...tdCenter, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                                {i === 0 ? '🥇' : i + 1}
                              </td>
                              <td style={{ ...tdLeft, fontWeight: isMe ? 700 : 500 }}>
                                {s.playerName}
                                {isCreatorRow && <span style={{ marginLeft: 4, fontSize: 12, color: '#f59e0b' }}>★</span>}
                                {isMe && !isCreatorRow && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--grey-400)' }}>(tú)</span>}
                              </td>
                              <td style={tdCenter}>{s.played}</td>
                              <td style={tdCenter}>{s.wins}</td>
                              <td style={tdCenter}>{s.losses ?? 0}</td>
                              <td style={tdCenter}>{s.draws ?? 0}</td>
                              <td style={tdCenter}>{s.pointsFor}</td>
                              <td style={tdCenter}>{s.pointsAgainst}</td>
                              <td style={{ ...tdCenter, color: s.diff >= 0 ? 'var(--turf-green, #16a34a)' : '#dc2626' }}>
                                {s.diff > 0 ? `+${s.diff}` : s.diff}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLE II: RANKING */}
              <div style={{ ...card, padding: 0 }}>
                {tableHeader('II — RANKING')}
                <div style={{ padding: '0 0 4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--grey-100)' }}>
                        <th style={thStyle()}>POS</th>
                        <th style={thStyle(true)}>JUGADOR</th>
                        <th style={thStyle()}>+/-</th>
                        <th style={thStyle()}>RNK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveStandings.map((s, i) => {
                        const isMe = currentUser && s.playerId === currentUser.id;
                        const isCreatorRow = s.playerId === t.creatorId || s.playerId === creatorPlayer?.id;
                        const rnk = getProjectedRankingPts(i, s);
                        return (
                          <tr key={s.playerId} style={{
                            borderBottom: '1px solid var(--grey-100)',
                            background: isCreatorRow ? 'rgba(214,255,0,0.08)' : 'transparent',
                          }}>
                            <td style={{ ...tdCenter, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                              {i === 0 ? '🥇' : i + 1}
                            </td>
                            <td style={{ ...tdLeft, fontWeight: isMe ? 700 : 500 }}>
                              {s.playerName}
                              {isCreatorRow && <span style={{ marginLeft: 4, fontSize: 12, color: '#f59e0b' }}>★</span>}
                              {isMe && !isCreatorRow && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--grey-400)' }}>(tú)</span>}
                            </td>
                            <td style={{ ...tdCenter, color: s.diff >= 0 ? 'var(--turf-green, #16a34a)' : '#dc2626' }}>
                              {s.diff > 0 ? `+${s.diff}` : s.diff}
                            </td>
                            <td style={{ ...tdCenter, fontWeight: 700, color: 'var(--black)' }}>
                              {rnk > 0 ? `+${rnk}` : rnk}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
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
