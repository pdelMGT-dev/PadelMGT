'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import {
  getGame,
  saveGame,
  updateMatchScore as engineUpdateScore,
  startGame as engineStartGame,
  startNextRound as engineStartNextRound,
  isGameFinished,
} from '@/lib/game-store';
import { isRoundComplete } from '@/lib/game-engine';
import type { ActiveGame, GameStatus, ScoreConfig } from '@/lib/game-engine';

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_INFO: Record<GameStatus, { label: string; color: string }> = {
  created:       { label: 'Creado',      color: '#7c3aed'           },
  starting_soon: { label: 'Por Empezar', color: '#f5a623'           },
  live:          { label: 'En Vivo',     color: 'var(--turf-green)' },
  finished:      { label: 'Finalizado',  color: 'var(--grey-400)'   },
};

function scoreConfigLabel(cfg: ScoreConfig): string {
  if (cfg.type === 'points') return `Por Puntos · ${cfg.target} pts`;
  return `Tradicional · ${cfg.setsPerMatch ?? 3} sets · ${cfg.gamesPerSet ?? 6} games`;
}

function formatLabel(fmt: string): string {
  const map: Record<string, string> = {
    americano: 'Americano', mexicano: 'Mexicano',
    round_robin: 'Round Robin', team_league: 'Team League',
    knockout: 'Eliminatorio', world_cup: 'World Cup',
  };
  return map[fmt] ?? fmt;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: '1px solid var(--grey-200)', background: '#fff',
  color: 'var(--black)', outline: 'none', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
};

const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10,
  borderBottom: '1px solid var(--grey-100)',
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function QuickGameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [game, setGame] = useState<ActiveGame | null>(() => {
    if (typeof window === 'undefined') return null;
    return getGame(id);
  });

  useEffect(() => {
    if (!game) setGame(getGame(id));
  }, [id, game]);

  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (game?.code) setShareUrl(`${window.location.origin}/quick-game/${game.code}`);
  }, [game?.code]);

  if (!game) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--grey-400)', marginBottom: 16 }}>Juego no encontrado.</p>
        <Link href="/dashboard/player/quick-game" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600 }}>← Mis Juegos Rápidos</Link>
      </div>
    );
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const si = STATUS_INFO[game.status];
  const isLive     = game.status === 'live';
  const isFinished = game.status === 'finished';
  const isPending  = game.status === 'created' || game.status === 'starting_soon';
  const canStart   = isPending && game.players.length >= 4;

  const activeRound = game.rounds.find(r => r.status === 'active') ?? null;
  const doneRounds  = game.rounds.filter(r => r.status === 'completed');

  const activeRoundComplete = activeRound ? isRoundComplete(activeRound) : false;
  const gameComplete        = isGameFinished(game);

  const hasMoreRounds = !gameComplete && activeRoundComplete && (
    game.format === 'mexicano' ||                          // mexicano generates on demand
    game.rounds.some(r => r.num > (activeRound?.num ?? 0) && r.status === 'pending')
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function getName(pid: string) {
    return game!.players.find(p => p.id === pid)?.name ?? pid;
  }

  function handleStartGame() {
    const started = engineStartGame(game!);
    saveGame(started);
    setGame(started);
    showToast('¡Juego iniciado!');
  }

  function handleRegister(roundNum: number, courtNum: number) {
    const key = `${roundNum}-${courtNum}`;
    const raw = scoreInputs[key] ?? { p1: '', p2: '' };
    const p1 = Math.max(0, parseInt(raw.p1 || '0', 10));
    const p2 = Math.max(0, parseInt(raw.p2 || '0', 10));

    const updated = engineUpdateScore(game!, roundNum, courtNum, p1, p2);
    saveGame(updated);
    setGame(updated);
    setScoreInputs(prev => { const n = { ...prev }; delete n[key]; return n; });

    const round = updated.rounds.find(r => r.num === roundNum);
    if (round && isRoundComplete(round)) {
      if (isGameFinished(updated)) showToast('¡Juego finalizado! Ver clasificación final.');
      else showToast('Ronda completa — podés iniciar la siguiente.');
    }
  }

  function handleNextRound() {
    const next = engineStartNextRound(game!);
    saveGame(next);
    setGame(next);
    setScoreInputs({});
    showToast(`Ronda ${next.currentRound} iniciada`);
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '40px 40px 80px', maxWidth: 960 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: 'var(--black)', color: '#fff', padding: '14px 22px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', maxWidth: 360 }}>
          {toast}
        </div>
      )}

      {/* Finished banner */}
      {isFinished && (
        <div style={{ background: 'var(--turf-green)', color: '#fff', padding: '14px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Juego finalizado</span>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <Link href="/dashboard/player/quick-game" style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.04em' }}>
          ← Mis Juegos Rápidos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: 'rgba(124,58,237,0.09)', color: '#7c3aed', letterSpacing: '0.08em' }}>
            {game.code}
          </span>
          {!isFinished && (
            <Link
              href={`/dashboard/player/quick-game/${id}/edit`}
              style={{ padding: '8px 18px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-block' }}
            >
              Gestionar
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 10 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
          {game.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLive && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 12, fontWeight: 700, color: si.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{si.label}</span>
        </div>
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 32, fontSize: 12, color: 'var(--grey-500)' }}>
        {[
          game.date, game.time, game.club, game.city,
          formatLabel(game.format),
          game.pairType === 'parejas' ? 'Parejas Fijas' : 'Individual',
          game.mixto ? 'Mixto' : null,
          scoreConfigLabel(game.scoreConfig),
        ].filter(Boolean).map((item, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ color: 'var(--grey-300)' }}>·</span>}
            {item}
          </span>
        ))}
      </div>

      {/* Share link */}
      {shareUrl && (
        <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '14px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', flexShrink: 0 }}>
            Enlace público
          </div>
          <code style={{ fontSize: 12, color: 'var(--grey-600)', flex: 1, wordBreak: 'break-all' }}>{shareUrl}</code>
          <button
            onClick={handleCopy}
            style={{ padding: '7px 16px', background: copied ? 'var(--turf-green)' : 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0, transition: 'background 0.2s' }}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
          <Link
            href={`/quick-game/${game.code}`}
            target="_blank"
            style={{ padding: '7px 16px', border: '1px solid var(--grey-300)', color: 'var(--grey-600)', textDecoration: 'none', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}
          >
            Ver público →
          </Link>
        </div>
      )}

      {/* Pending / Start panel */}
      {isPending && (
        <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '24px', marginBottom: 32, display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            {canStart ? '▶' : '⏳'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4 }}>
              {canStart ? 'Listo para empezar' : 'Esperando jugadores'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: canStart ? 16 : 0 }}>
              {canStart
                ? `${game.players.length} jugadores confirmados · ${game.courts} ${game.courts === 1 ? 'cancha' : 'canchas'}`
                : `${game.players.length} de ${game.maxPlayers} jugadores. Compartí el código `}
              {!canStart && (
                <strong style={{ color: '#7c3aed' }}>{game.code}</strong>
              )}
            </div>
            {canStart && (
              <button
                onClick={handleStartGame}
                style={{ padding: '12px 28px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Iniciar Juego →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Players list (when pending) */}
      {isPending && game.players.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={secTitle}>Jugadores ({game.players.length}/{game.maxPlayers})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {game.players.map(p => (
              <div key={p.id} style={{ padding: '8px 14px', background: '#fff', border: '1px solid var(--grey-200)', fontSize: 13, fontWeight: p.isCreator ? 700 : 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.name}
                {p.isCreator && <span style={{ fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 5px', fontWeight: 700 }}>ORG</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active round — score entry */}
      {isLive && activeRound && !activeRoundComplete && (
        <div style={{ marginBottom: 36 }}>
          <div style={secTitle}>Ronda Actual — Ronda {activeRound.num}</div>

          {/* Resting players */}
          {activeRound.resting.length > 0 && (
            <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Descansan:</span>
              {activeRound.resting.map(pid => (
                <span key={pid} style={{ fontSize: 12, padding: '3px 10px', border: '1px solid var(--grey-200)', color: 'var(--grey-500)' }}>
                  {getName(pid)}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeRound.courts.map(court => {
              const key = `${activeRound.num}-${court.courtNum}`;
              const isDone   = court.status === 'completed';
              const inputs   = scoreInputs[key] ?? { p1: '', p2: '' };

              return (
                <div
                  key={court.courtNum}
                  style={{ background: '#fff', border: `2px solid ${isDone ? 'var(--grey-200)' : 'var(--turf-green)'}`, padding: '20px 24px' }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 14 }}>
                    Cancha {court.courtNum}
                  </div>

                  {/* Matchup */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div>
                      {court.pair1.map(pid => (
                        <div key={pid} style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{getName(pid)}</div>
                      ))}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {isDone ? (
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
                          <span style={{ color: (court.pair1Score ?? 0) > (court.pair2Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair1Score}</span>
                          <span style={{ color: 'var(--grey-300)', margin: '0 6px' }}>–</span>
                          <span style={{ color: (court.pair2Score ?? 0) > (court.pair1Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair2Score}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--grey-300)', letterSpacing: '0.04em' }}>VS</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {court.pair2.map(pid => (
                        <div key={pid} style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{getName(pid)}</div>
                      ))}
                    </div>
                  </div>

                  {/* Score input */}
                  {!isDone ? (
                    <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                        Registrar score:
                      </span>
                      <input
                        type="number" min={0} max={999}
                        value={inputs.p1}
                        onChange={e => setScoreInputs(prev => ({ ...prev, [key]: { ...(prev[key] ?? { p1: '', p2: '' }), p1: e.target.value } }))}
                        placeholder="0"
                        style={{ ...inp, width: 72, textAlign: 'center', padding: '8px 10px' }}
                      />
                      <span style={{ color: 'var(--grey-400)', fontWeight: 700 }}>–</span>
                      <input
                        type="number" min={0} max={999}
                        value={inputs.p2}
                        onChange={e => setScoreInputs(prev => ({ ...prev, [key]: { ...(prev[key] ?? { p1: '', p2: '' }), p2: e.target.value } }))}
                        placeholder="0"
                        style={{ ...inp, width: 72, textAlign: 'center', padding: '8px 10px' }}
                      />
                      <button
                        onClick={() => handleRegister(activeRound.num, court.courtNum)}
                        style={{ padding: '9px 20px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}
                      >
                        Registrar
                      </button>
                    </div>
                  ) : (
                    <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 10, fontSize: 11, color: 'var(--turf-green)', fontWeight: 600 }}>
                      ✓ Score registrado
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Round complete — next round button */}
      {isLive && activeRoundComplete && !gameComplete && (
        <div style={{ marginBottom: 32, padding: '24px', background: 'rgba(40,167,69,0.06)', border: '1px solid rgba(40,167,69,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4 }}>
              Ronda {activeRound?.num} completada
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>Todos los scores registrados. Podés iniciar la siguiente ronda.</div>
          </div>
          {hasMoreRounds && (
            <button
              onClick={handleNextRound}
              style={{ padding: '12px 28px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}
            >
              Siguiente Ronda →
            </button>
          )}
        </div>
      )}

      {/* Standings */}
      {game.standings.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={secTitle}>Clasificación</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--grey-50)', borderBottom: '2px solid var(--grey-200)' }}>
                {['Pos', 'Jugador', 'Victorias', 'Pts', 'PJ', '+/-'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Pos' ? 'center' : 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {game.standings.map((s, i) => {
                const isMe = game.players.find(p => p.id === s.playerId)?.isCreator ?? false;
                return (
                  <tr
                    key={s.playerId}
                    style={{ borderBottom: '1px solid var(--grey-100)', background: isMe ? 'rgba(214,255,0,0.05)' : i % 2 === 0 ? '#fff' : 'var(--grey-50)' }}
                  >
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: i === 0 ? 'var(--neon)' : 'var(--grey-300)' }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 13, fontWeight: isMe ? 700 : 500, color: 'var(--black)' }}>{s.playerName}</span>
                      {isMe && <span style={{ marginLeft: 8, fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700, verticalAlign: 'middle' }}>TÚ</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{s.wins}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>{s.pts}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--grey-400)' }}>{s.played}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: s.diff >= 0 ? 'var(--turf-green)' : '#e53e3e', fontWeight: 600 }}>
                      {s.diff >= 0 ? '+' : ''}{s.diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Round history */}
      {doneRounds.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={secTitle}>Historial de Rondas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {doneRounds.map(round => (
              <div key={round.num}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>
                  Ronda {round.num}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {round.courts.map(court => (
                    <div
                      key={court.courtNum}
                      style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}
                    >
                      <div>
                        {court.pair1.map(pid => (
                          <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>
                        ))}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        {court.pair1Score !== null ? (
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                            <span style={{ color: (court.pair1Score ?? 0) > (court.pair2Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair1Score}</span>
                            <span style={{ color: 'var(--grey-300)', margin: '0 4px' }}>–</span>
                            <span style={{ color: (court.pair2Score ?? 0) > (court.pair1Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair2Score}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--grey-300)' }}>–</span>
                        )}
                        <div style={{ fontSize: 9, color: 'var(--grey-300)', marginTop: 2, letterSpacing: '0.08em' }}>CANCHA {court.courtNum}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {court.pair2.map(pid => (
                          <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
