'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getGameByCode, saveGame } from '@/lib/game-store';
import type { ActiveGame, GameStatus, ScoreConfig } from '@/lib/game-engine';

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_INFO: Record<GameStatus, { label: string; color: string; dot?: boolean }> = {
  created:       { label: 'Pendiente',   color: '#7c3aed' },
  starting_soon: { label: 'Por Empezar', color: '#f5a623' },
  live:          { label: 'En Vivo',     color: 'var(--turf-green)', dot: true },
  finished:      { label: 'Finalizado',  color: 'var(--grey-400)' },
};

function scoreConfigLabel(cfg: ScoreConfig): string {
  if (cfg.type === 'points') return `Por Puntos · ${cfg.target} pts`;
  return `Tradicional · ${cfg.setsPerMatch ?? 3} sets`;
}

function formatLabel(fmt: string): string {
  const map: Record<string, string> = {
    americano: 'Americano', mexicano: 'Mexicano',
    round_robin: 'Round Robin', team_league: 'Team League',
    knockout: 'Eliminatorio', world_cup: 'World Cup',
  };
  return map[fmt] ?? fmt;
}

const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10,
  borderBottom: '1px solid var(--grey-100)',
};

interface CurrentUser {
  id: string;
  name: string;
}

// ── Public view component ──────────────────────────────────────────────────────

export default function PublicQuickGamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [game, setGame] = useState<ActiveGame | null>(() => {
    if (typeof window === 'undefined') return null;
    return getGameByCode(code);
  });

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [joinName, setJoinName] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Read current user from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      const parsed: CurrentUser | null = JSON.parse(raw || 'null');
      setCurrentUser(parsed);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  // Poll every 5 seconds for live updates (localStorage simulation of real-time)
  useEffect(() => {
    const load = () => setGame(getGameByCode(code));
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [code]);

  if (!game) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'var(--font-body)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 12 }}>Juego no encontrado</div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 24 }}>El código <strong>{code}</strong> no corresponde a ningún juego activo.</div>
        <Link href="/" style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)', textDecoration: 'none' }}>← Volver al inicio</Link>
      </div>
    );
  }

  const si = STATUS_INFO[game.status];
  const isLive     = game.status === 'live';
  const isFinished = game.status === 'finished';
  const isPending  = game.status === 'created' || game.status === 'starting_soon';

  // Detect whether the current user is already in the game
  const alreadyInGame = currentUser != null && game.players.some(p => p.id === currentUser.id);

  const canJoin = isPending && game.players.length < game.maxPlayers && !joined && !alreadyInGame;

  // Determine if a player is in the game (either just joined this session or was already there)
  const playerIsInGame = joined || alreadyInGame;

  // Find the current player's isCreator flag (if they are in the game)
  const playerEntry = currentUser != null
    ? game.players.find(p => p.id === currentUser.id)
    : null;
  const isCreator = playerEntry?.isCreator === true;

  // canLeave: pending game, player is in game, player is not the creator
  const canLeave = isPending && playerIsInGame && !isCreator;

  function handleJoin() {
    if (!game) return;

    if (currentUser) {
      // Logged-in user joins with their existing id and name
      const newPlayer = { id: currentUser.id, name: currentUser.name, ranking: 0, isCreator: false };
      const updated: ActiveGame = { ...game, players: [...game.players, newPlayer] };
      saveGame(updated);
      setGame(updated);
      setJoined(true);
      setShowJoin(false);
      setJoinError('');
    } else {
      // Guest flow
      const name = joinName.trim();
      if (!name) { setJoinError('Ingresá tu nombre para unirte.'); return; }
      const newPlayer = { id: `guest-${Date.now()}`, name, ranking: 0, isCreator: false };
      const updated: ActiveGame = { ...game, players: [...game.players, newPlayer] };
      saveGame(updated);
      setGame(updated);
      setJoined(true);
      setShowJoin(false);
      setJoinName('');
      setJoinError('');
    }
  }

  function handleLeave() {
    if (!game || !currentUser) return;
    const updated: ActiveGame = {
      ...game,
      players: game.players.filter(p => p.id !== currentUser.id),
    };
    saveGame(updated);
    setGame(updated);
    setJoined(false);
  }

  const activeRound = game.rounds.find(r => r.status === 'active') ?? null;
  const doneRounds  = game.rounds.filter(r => r.status === 'completed');

  function getName(pid: string) {
    return game!.players.find(p => p.id === pid)?.name ?? pid;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', fontFamily: 'var(--font-body)' }}>

      {/* Top bar */}
      <div style={{ background: 'var(--black)', color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
          PADELMGT
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {si.dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
          <span style={{ fontSize: 11, fontWeight: 700, color: si.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{si.label}</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
            Juego Rápido · {game.code}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
            {game.name}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: 'var(--grey-500)' }}>
            {[
              game.date, game.time, game.club, game.city,
              formatLabel(game.format),
              scoreConfigLabel(game.scoreConfig),
            ].map((item, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: 'var(--grey-300)' }}>·</span>}
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Joined toast */}
        {joined && (
          <div style={{ background: 'var(--turf-green)', color: '#fff', padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>✓</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>¡Te uniste al juego! El organizador recibirá tu confirmación.</span>
          </div>
        )}

        {/* Pending state + join */}
        {isPending && (
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '32px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 8 }}>
              El juego aún no comenzó
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: canJoin || alreadyInGame ? 20 : 0 }}>
              {game.date} a las {game.time} · {game.players.length}/{game.maxPlayers} jugadores confirmados
            </div>

            {/* Already-in badge */}
            {alreadyInGame && !joined && (
              <div style={{
                display: 'inline-block',
                padding: '8px 20px',
                background: 'rgba(40,167,69,0.1)',
                border: '1px solid rgba(40,167,69,0.3)',
                color: 'var(--turf-green)',
                fontSize: 13,
                fontWeight: 700,
                marginBottom: canLeave ? 16 : 0,
              }}>
                Ya estás en este juego ✓
              </div>
            )}

            {/* Join button for logged-in user (not already in game) */}
            {canJoin && currentUser && !showJoin && (
              <button
                onClick={handleJoin}
                style={{ padding: '12px 28px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Unirme como {currentUser.name} →
              </button>
            )}

            {/* Join button for guest (not logged in, not already in game) */}
            {canJoin && !currentUser && !showJoin && (
              <button
                onClick={() => setShowJoin(true)}
                style={{ padding: '12px 28px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Unirme a este juego →
              </button>
            )}

            {/* Guest name input form */}
            {showJoin && !currentUser && (
              <div style={{ marginTop: 20, textAlign: 'left', maxWidth: 360, margin: '20px auto 0' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>
                  Tu nombre
                </label>
                <input
                  type="text"
                  value={joinName}
                  onChange={e => { setJoinName(e.target.value); setJoinError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder="Ej: María García"
                  autoFocus
                  style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid var(--grey-200)', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box', marginBottom: 8 }}
                />
                {joinError && <div style={{ fontSize: 12, color: '#e53e3e', marginBottom: 8 }}>{joinError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleJoin} style={{ flex: 1, padding: '12px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Confirmar →
                  </button>
                  <button onClick={() => { setShowJoin(false); setJoinError(''); }} style={{ padding: '12px 16px', background: '#fff', color: 'var(--grey-500)', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Leave button */}
            {canLeave && (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={handleLeave}
                  style={{ padding: '10px 22px', background: '#fff8f8', border: '1px solid #feb2b2', color: '#c53030', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  Salirse del juego
                </button>
              </div>
            )}
          </div>
        )}

        {/* Finished — final standings */}
        {isFinished && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ background: 'var(--black)', color: '#fff', padding: '20px 24px', marginBottom: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 6 }}>Juego Finalizado</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{game.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{game.date} · {game.club}, {game.city}</div>
            </div>
            {game.standings.length > 0 ? (
              <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--grey-100)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>Clasificación Final</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--grey-50)', borderBottom: '2px solid var(--grey-200)' }}>
                      {['Pos', 'Jugador', 'W', 'Pts', 'PJ', '+/−'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Pos' ? 'center' : 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {game.standings.map((s, i) => {
                      const isMe = currentUser != null && s.playerId === currentUser.id;
                      return (
                        <tr key={s.playerId} style={{ borderBottom: '1px solid var(--grey-100)', background: isMe ? 'rgba(214,255,0,0.06)' : i % 2 === 0 ? '#fff' : 'var(--grey-50)' }}>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: i === 0 ? '#d4a017' : i === 1 ? 'var(--grey-400)' : i === 2 ? '#cd7f32' : 'var(--grey-300)' }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontSize: 13, fontWeight: isMe ? 700 : 500 }}>{s.playerName}</span>
                            {isMe && <span style={{ marginLeft: 8, fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700 }}>TÚ</span>}
                          </td>
                          <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{s.wins}</td>
                          <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>{s.pts}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey-400)' }}>{s.played}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: s.diff >= 0 ? 'var(--turf-green)' : '#e53e3e' }}>
                            {s.diff >= 0 ? '+' : ''}{s.diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '32px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
                No hay datos de clasificación disponibles.
              </div>
            )}
          </div>
        )}

        {/* Live round */}
        {isLive && activeRound && (
          <div style={{ marginBottom: 36 }}>
            <div style={secTitle}>Ronda Actual — Ronda {activeRound.num}</div>
            {activeRound.resting.length > 0 && (
              <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Descansan:</span>
                {activeRound.resting.map(pid => (
                  <span key={pid} style={{ fontSize: 12, padding: '3px 10px', background: '#fff', border: '1px solid var(--grey-200)', color: 'var(--grey-500)' }}>
                    {getName(pid)}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeRound.courts.map(court => {
                const isDone = court.status === 'completed';
                return (
                  <div key={court.courtNum} style={{ background: '#fff', border: `2px solid ${isDone ? 'var(--grey-200)' : 'var(--turf-green)'}`, padding: '18px 22px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>
                      Cancha {court.courtNum}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14 }}>
                      <div>
                        {court.pair1.map(pid => <div key={pid} style={{ fontSize: 13, fontWeight: 700 }}>{getName(pid)}</div>)}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        {isDone ? (
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>
                            <span style={{ color: (court.pair1Score ?? 0) > (court.pair2Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair1Score}</span>
                            <span style={{ color: 'var(--grey-300)', margin: '0 6px' }}>–</span>
                            <span style={{ color: (court.pair2Score ?? 0) > (court.pair1Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair2Score}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: '#f5a623', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>En juego</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {court.pair2.map(pid => <div key={pid} style={{ fontSize: 13, fontWeight: 700 }}>{getName(pid)}</div>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--grey-400)', textAlign: 'right' }}>
              Actualiza cada 5 seg.
            </div>
          </div>
        )}

        {/* Standings */}
        {game.standings.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={secTitle}>Clasificación</div>
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--grey-50)', borderBottom: '2px solid var(--grey-200)' }}>
                    {['Pos', 'Jugador', 'Victorias', 'Pts', 'PJ', '+/-'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Pos' ? 'center' : 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {game.standings.map((s, i) => (
                    <tr key={s.playerId} style={{ borderBottom: '1px solid var(--grey-100)', background: i % 2 === 0 ? '#fff' : 'var(--grey-50)' }}>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: i === 0 ? 'var(--neon)' : 'var(--grey-300)' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{s.playerName}</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{s.wins}</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>{s.pts}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--grey-400)' }}>{s.played}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: s.diff >= 0 ? 'var(--turf-green)' : '#e53e3e', fontWeight: 600 }}>
                        {s.diff >= 0 ? '+' : ''}{s.diff}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Round history */}
        {doneRounds.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={secTitle}>Rondas Jugadas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {doneRounds.map(round => (
                <div key={round.num}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>
                    Ronda {round.num}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {round.courts.map(court => (
                      <div key={court.courtNum} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
                        <div>
                          {court.pair1.map(pid => <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>)}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          {court.pair1Score !== null && (
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                              <span style={{ color: (court.pair1Score ?? 0) > (court.pair2Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair1Score}</span>
                              <span style={{ color: 'var(--grey-300)', margin: '0 4px' }}>–</span>
                              <span style={{ color: (court.pair2Score ?? 0) > (court.pair1Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair2Score}</span>
                            </span>
                          )}
                          <div style={{ fontSize: 9, color: 'var(--grey-300)', marginTop: 2, letterSpacing: '0.08em' }}>CANCHA {court.courtNum}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {court.pair2.map(pid => <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finished footer */}
        {isFinished && (
          <div style={{ background: 'var(--black)', color: '#fff', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 8 }}>
              ¡Juego Finalizado!
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>
              Ganador: <strong style={{ color: 'var(--neon)' }}>{game.standings[0]?.playerName ?? '—'}</strong> con {game.standings[0]?.pts ?? 0} pts
            </div>
          </div>
        )}

        {/* Players */}
        <div style={{ marginTop: 32 }}>
          <div style={secTitle}>Jugadores ({game.players.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {game.players.map(p => (
              <div key={p.id} style={{ padding: '8px 14px', background: '#fff', border: '1px solid var(--grey-200)', fontSize: 13, fontWeight: p.isCreator ? 700 : 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.name}
                {p.isCreator && <span style={{ fontSize: 9, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '2px 5px', fontWeight: 700 }}>ORG</span>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
