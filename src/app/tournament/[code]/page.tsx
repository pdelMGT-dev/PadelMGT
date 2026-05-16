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

function isRoundBased(fmt: string) {
  return ['americano', 'mexicano', 'round_robin', 'team_league'].includes(fmt);
}

const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10,
  borderBottom: '1px solid var(--grey-100)',
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PublicTournamentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [game, setGame] = useState<ActiveGame | null>(() => {
    if (typeof window === 'undefined') return null;
    return getGameByCode(code);
  });

  const [joinName, setJoinName] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    const load = () => setGame(getGameByCode(code));
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [code]);

  if (!game) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'var(--font-body)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 12 }}>Torneo no encontrado</div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 24 }}>El código <strong>{code}</strong> no corresponde a ningún torneo activo.</div>
        <Link href="/" style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)', textDecoration: 'none' }}>← Volver al inicio</Link>
      </div>
    );
  }

  const si = STATUS_INFO[game.status];
  const isLive     = game.status === 'live';
  const isFinished = game.status === 'finished';
  const isPending  = game.status === 'created' || game.status === 'starting_soon';
  const roundBased = isRoundBased(game.format);
  const canJoin    = isPending && game.players.length < game.maxPlayers && !joined;

  function handleJoin() {
    const name = joinName.trim();
    if (!name) { setJoinError('Ingresá tu nombre para inscribirte.'); return; }
    if (!game) return;
    const newPlayer = { id: `guest-${Date.now()}`, name, ranking: 0, isCreator: false };
    const updated: ActiveGame = { ...game, players: [...game.players, newPlayer] };
    saveGame(updated);
    setGame(updated);
    setJoined(true);
    setShowJoin(false);
    setJoinName('');
    setJoinError('');
  }

  const activeRound = game.rounds.find(r => r.status === 'active') ?? null;
  const doneRounds  = game.rounds.filter(r => r.status === 'completed');

  function getName(pid: string) {
    if (!pid) return '–';
    if (pid.startsWith('bye-')) return 'BYE';
    return game!.players.find(p => p.id === pid)?.name ?? pid;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', fontFamily: 'var(--font-body)' }}>

      {/* Top bar */}
      <div style={{ background: 'var(--black)', color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>PADELMGT</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {si.dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
          <span style={{ fontSize: 11, fontWeight: 700, color: si.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{si.label}</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
            {formatLabel(game.format)} · Torneo · {game.code}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
            {game.name}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: 'var(--grey-500)' }}>
            {[game.date, game.time, game.club, game.city, scoreConfigLabel(game.scoreConfig)].map((item, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: 'var(--grey-300)' }}>·</span>}
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
          {[
            { label: 'Jugadores', value: String(game.players.length) },
            { label: 'Rondas jugadas', value: String(doneRounds.length) },
            { label: 'Formato', value: formatLabel(game.format) },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', padding: '16px 20px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Joined toast */}
        {joined && (
          <div style={{ background: 'var(--turf-green)', color: '#fff', padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>✓</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>¡Te inscribiste al torneo! El organizador recibirá tu confirmación.</span>
          </div>
        )}

        {/* Pending + join */}
        {isPending && (
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '32px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 8 }}>El torneo aún no comenzó</div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: canJoin ? 20 : 0 }}>
              {game.date} a las {game.time} · {game.players.length}/{game.maxPlayers} jugadores
            </div>
            {canJoin && !showJoin && (
              <button
                onClick={() => setShowJoin(true)}
                style={{ padding: '12px 28px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Inscribirme en este torneo →
              </button>
            )}
            {showJoin && (
              <div style={{ marginTop: 20, textAlign: 'left', maxWidth: 360, margin: '20px auto 0' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>
                  Tu nombre completo
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
                    Confirmar inscripción →
                  </button>
                  <button onClick={() => { setShowJoin(false); setJoinError(''); }} style={{ padding: '12px 16px', background: '#fff', color: 'var(--grey-500)', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active round — round-based */}
        {isLive && roundBased && activeRound && (
          <div style={{ marginBottom: 36 }}>
            <div style={secTitle}>Ronda Actual — Ronda {activeRound.num}</div>
            {activeRound.resting.length > 0 && (
              <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Descansan:</span>
                {activeRound.resting.map(pid => (
                  <span key={pid} style={{ fontSize: 12, padding: '3px 10px', background: '#fff', border: '1px solid var(--grey-200)', color: 'var(--grey-500)' }}>{getName(pid)}</span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeRound.courts.map(court => {
                const isDone = court.status === 'completed';
                return (
                  <div key={court.courtNum} style={{ background: '#fff', border: `2px solid ${isDone ? 'var(--grey-200)' : 'var(--turf-green)'}`, padding: '18px 22px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>Cancha {court.courtNum}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14 }}>
                      <div>{court.pair1.map(pid => <div key={pid} style={{ fontSize: 13, fontWeight: 700 }}>{getName(pid)}</div>)}</div>
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
                      <div style={{ textAlign: 'right' }}>{court.pair2.map(pid => <div key={pid} style={{ fontSize: 13, fontWeight: 700 }}>{getName(pid)}</div>)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--grey-400)', textAlign: 'right' }}>Actualiza cada 5 seg.</div>
          </div>
        )}

        {/* Knockout bracket — public view */}
        {isLive && !roundBased && game.bracket && (
          <div style={{ marginBottom: 36 }}>
            <div style={secTitle}>Cuadro Eliminatorio</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {game.bracket.rounds.map((bracketRound, ri) => (
                <div key={ri}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 10 }}>{bracketRound.name}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {bracketRound.matches.map((match, mi) => {
                      const isDone = match.status === 'completed';
                      const p1Names = (match.pair1 ?? []).map(pid => getName(pid)).join(' / ') || '–';
                      const p2Names = (match.pair2 ?? []).map(pid => getName(pid)).join(' / ') || '–';
                      if (p1Names === 'BYE' || p2Names === 'BYE') return null;
                      return (
                        <div key={mi} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: isDone && match.winner?.some(pid => (match.pair1 ?? []).includes(pid)) ? 700 : 400 }}>{p1Names}</div>
                          <div style={{ textAlign: 'center' }}>
                            {isDone ? (
                              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                                <span style={{ color: (match.pair1Score ?? 0) > (match.pair2Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{match.pair1Score}</span>
                                <span style={{ color: 'var(--grey-300)', margin: '0 4px' }}>–</span>
                                <span style={{ color: (match.pair2Score ?? 0) > (match.pair1Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{match.pair2Score}</span>
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: '#f5a623', fontWeight: 700 }}>VS</span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 13, fontWeight: isDone && match.winner?.some(pid => (match.pair2 ?? []).includes(pid)) ? 700 : 400 }}>{p2Names}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
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
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>Ronda {round.num}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {round.courts.map(court => (
                      <div key={court.courtNum} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
                        <div>{court.pair1.map(pid => <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>)}</div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                            <span style={{ color: (court.pair1Score ?? 0) > (court.pair2Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair1Score}</span>
                            <span style={{ color: 'var(--grey-300)', margin: '0 4px' }}>–</span>
                            <span style={{ color: (court.pair2Score ?? 0) > (court.pair1Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair2Score}</span>
                          </span>
                          <div style={{ fontSize: 9, color: 'var(--grey-300)', marginTop: 2, letterSpacing: '0.08em' }}>CANCHA {court.courtNum}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>{court.pair2.map(pid => <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finished */}
        {isFinished && (
          <div style={{ background: 'var(--black)', color: '#fff', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 8 }}>
              ¡Torneo Finalizado!
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>
              Campeón: <strong style={{ color: 'var(--neon)' }}>{game.standings[0]?.playerName ?? '—'}</strong>
              {game.standings[0] && <> · {game.standings[0].pts} pts</>}
            </div>
          </div>
        )}

        {/* Players */}
        <div style={{ marginTop: 32 }}>
          <div style={secTitle}>Participantes ({game.players.length})</div>
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
