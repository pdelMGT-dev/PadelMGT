'use client';

import Link from 'next/link';
import { use, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

type GameStatus = 'created' | 'starting_soon' | 'live' | 'finished';
type PairType   = 'fixed' | 'exchange';

type PlayerEntry = {
  id: string;
  name: string;
  isMe?: boolean;
};

type CourtLive = {
  courtNum: number;
  pair1: [string, string];
  pair2: [string, string];
  score: { p1: number; p2: number } | null;
};

type Round = {
  roundNum: number;
  status: 'done' | 'live';
  courts: CourtLive[];
};

type Standing = {
  playerId: string;
  name: string;
  isMe: boolean;
  wins: number;
  pts: number;
  gamesPlayed: number;
};

type GameDetail = {
  id: string;
  code: string;
  name: string;
  date: string;
  time: string;
  club: string;
  city: string;
  levelLabel: string;
  pairType: PairType;
  scoreConfig: string;
  status: GameStatus;
  players: PlayerEntry[];
  rounds: Round[];
  standings: Standing[];
};

// ── Mock data ──────────────────────────────────────────────────────────────────

const GAMES: Record<string, GameDetail> = {
  g1: {
    id: 'g1', code: 'JR-2026-3841', name: 'Express Nocturno',
    date: '14 May 2026', time: '20:00', club: 'Padel Arena', city: 'Buenos Aires',
    levelLabel: 'Todos', pairType: 'exchange', scoreConfig: 'Por Puntos · 16 pts',
    status: 'live',
    players: [
      { id: 'me',  name: 'Diego García',   isMe: true },
      { id: 'f1',  name: 'Ana Rodríguez' },
      { id: 'f2',  name: 'Marcos Herrera' },
      { id: 'f3',  name: 'Carlos Vargas' },
    ],
    rounds: [
      {
        roundNum: 1, status: 'done',
        courts: [
          { courtNum: 1, pair1: ['Diego García', 'Marcos Herrera'], pair2: ['Ana Rodríguez', 'Carlos Vargas'], score: { p1: 16, p2: 11 } },
        ],
      },
      {
        roundNum: 2, status: 'live',
        courts: [
          { courtNum: 1, pair1: ['Diego García', 'Carlos Vargas'], pair2: ['Ana Rodríguez', 'Marcos Herrera'], score: null },
        ],
      },
    ],
    standings: [
      { playerId: 'me', name: 'Diego García',   isMe: true,  wins: 1, pts: 48, gamesPlayed: 1 },
      { playerId: 'f2', name: 'Marcos Herrera', isMe: false, wins: 1, pts: 45, gamesPlayed: 1 },
      { playerId: 'f1', name: 'Ana Rodríguez',  isMe: false, wins: 0, pts: 30, gamesPlayed: 1 },
      { playerId: 'f3', name: 'Carlos Vargas',  isMe: false, wins: 0, pts: 28, gamesPlayed: 1 },
    ],
  },

  g2: {
    id: 'g2', code: 'JR-2026-5519', name: 'Juego Rápido Tarde',
    date: '15 May 2026', time: '17:00', club: 'Club Barrio Norte', city: 'Buenos Aires',
    levelLabel: 'Intermedio', pairType: 'exchange', scoreConfig: 'Tradicional · 6 games/set',
    status: 'starting_soon',
    players: [
      { id: 'me', name: 'Diego García', isMe: true },
      { id: 'f1', name: 'Ana Rodríguez' },
      { id: 'f4', name: 'Sofía López' },
      { id: 'f6', name: 'Diego Fernández' },
    ],
    rounds: [],
    standings: [
      { playerId: 'me', name: 'Diego García',     isMe: true,  wins: 0, pts: 0, gamesPlayed: 0 },
      { playerId: 'f1', name: 'Ana Rodríguez',    isMe: false, wins: 0, pts: 0, gamesPlayed: 0 },
      { playerId: 'f4', name: 'Sofía López',      isMe: false, wins: 0, pts: 0, gamesPlayed: 0 },
      { playerId: 'f6', name: 'Diego Fernández',  isMe: false, wins: 0, pts: 0, gamesPlayed: 0 },
    ],
  },

  g3: {
    id: 'g3', code: 'JR-2026-4827', name: 'Juego del Sábado',
    date: '20 May 2026', time: '11:00', club: 'Club Barrio Norte', city: 'Buenos Aires',
    levelLabel: 'Intermedio', pairType: 'fixed', scoreConfig: 'Por Puntos · 16 pts',
    status: 'created',
    players: [
      { id: 'me', name: 'Diego García', isMe: true },
      { id: 'f1', name: 'Ana Rodríguez' },
    ],
    rounds: [],
    standings: [
      { playerId: 'me', name: 'Diego García',  isMe: true,  wins: 0, pts: 0, gamesPlayed: 0 },
      { playerId: 'f1', name: 'Ana Rodríguez', isMe: false, wins: 0, pts: 0, gamesPlayed: 0 },
    ],
  },

  g4: {
    id: 'g4', code: 'JR-2026-2234', name: 'Americano Viernes',
    date: '8 May 2026', time: '19:00', club: 'Padel Arena', city: 'Buenos Aires',
    levelLabel: 'Avanzado', pairType: 'exchange', scoreConfig: 'Por Puntos · 16 pts',
    status: 'finished',
    players: [
      { id: 'me',  name: 'Diego García',   isMe: true },
      { id: 'f1',  name: 'Ana Rodríguez' },
      { id: 'f2',  name: 'Marcos Herrera' },
      { id: 'f3',  name: 'Carlos Vargas' },
      { id: 'f4',  name: 'Sofía López' },
      { id: 'f5',  name: 'Laura Torres' },
      { id: 'f6',  name: 'Diego Fernández' },
      { id: 'p7',  name: 'Pedro Morales' },
    ],
    rounds: [
      {
        roundNum: 1, status: 'done',
        courts: [
          { courtNum: 1, pair1: ['Diego García', 'Marcos Herrera'],   pair2: ['Ana Rodríguez', 'Carlos Vargas'],   score: { p1: 16, p2: 11 } },
          { courtNum: 2, pair1: ['Sofía López', 'Pedro Morales'],     pair2: ['Laura Torres', 'Diego Fernández'],  score: { p1: 13, p2: 16 } },
        ],
      },
      {
        roundNum: 2, status: 'done',
        courts: [
          { courtNum: 1, pair1: ['Diego García', 'Sofía López'],      pair2: ['Marcos Herrera', 'Pedro Morales'],  score: { p1: 16, p2: 14 } },
          { courtNum: 2, pair1: ['Ana Rodríguez', 'Laura Torres'],    pair2: ['Carlos Vargas', 'Diego Fernández'], score: { p1: 16, p2: 10 } },
        ],
      },
      {
        roundNum: 3, status: 'done',
        courts: [
          { courtNum: 1, pair1: ['Diego García', 'Laura Torres'],     pair2: ['Sofía López', 'Ana Rodríguez'],     score: { p1: 12, p2: 16 } },
          { courtNum: 2, pair1: ['Marcos Herrera', 'Diego Fernández'],pair2: ['Carlos Vargas', 'Pedro Morales'],   score: { p1: 16, p2: 9  } },
        ],
      },
    ],
    standings: [
      { playerId: 'f2',  name: 'Marcos Herrera',  isMe: false, wins: 2, pts: 136, gamesPlayed: 3 },
      { playerId: 'me',  name: 'Diego García',    isMe: true,  wins: 2, pts: 130, gamesPlayed: 3 },
      { playerId: 'f1',  name: 'Ana Rodríguez',   isMe: false, wins: 2, pts: 126, gamesPlayed: 3 },
      { playerId: 'f4',  name: 'Sofía López',     isMe: false, wins: 1, pts: 118, gamesPlayed: 3 },
      { playerId: 'f6',  name: 'Diego Fernández', isMe: false, wins: 1, pts: 110, gamesPlayed: 3 },
      { playerId: 'p7',  name: 'Pedro Morales',   isMe: false, wins: 1, pts: 108, gamesPlayed: 3 },
      { playerId: 'f5',  name: 'Laura Torres',    isMe: false, wins: 1, pts: 104, gamesPlayed: 3 },
      { playerId: 'f3',  name: 'Carlos Vargas',   isMe: false, wins: 0, pts: 90,  gamesPlayed: 3 },
    ],
  },

  g5: {
    id: 'g5', code: 'JR-2026-1198', name: 'Express del Club',
    date: '2 May 2026', time: '10:00', club: 'Club La Cantera', city: 'Córdoba',
    levelLabel: 'Todos', pairType: 'exchange', scoreConfig: 'Por Puntos · 12 pts',
    status: 'finished',
    players: [
      { id: 'me', name: 'Diego García',   isMe: true },
      { id: 'f1', name: 'Ana Rodríguez' },
      { id: 'f2', name: 'Marcos Herrera' },
      { id: 'f3', name: 'Carlos Vargas' },
      { id: 'f4', name: 'Sofía López' },
      { id: 'f5', name: 'Laura Torres' },
    ],
    rounds: [
      {
        roundNum: 1, status: 'done',
        courts: [
          { courtNum: 1, pair1: ['Diego García', 'Ana Rodríguez'],   pair2: ['Marcos Herrera', 'Carlos Vargas'], score: { p1: 12, p2: 8  } },
          { courtNum: 2, pair1: ['Sofía López', 'Laura Torres'],     pair2: [], score: { p1: 12, p2: 7 } } as unknown as CourtLive,
        ],
      },
      {
        roundNum: 2, status: 'done',
        courts: [
          { courtNum: 1, pair1: ['Diego García', 'Marcos Herrera'], pair2: ['Sofía López', 'Ana Rodríguez'],    score: { p1: 9,  p2: 12 } },
          { courtNum: 2, pair1: ['Carlos Vargas', 'Laura Torres'],  pair2: [], score: { p1: 7, p2: 12 } } as unknown as CourtLive,
        ],
      },
      {
        roundNum: 3, status: 'done',
        courts: [
          { courtNum: 1, pair1: ['Diego García', 'Carlos Vargas'],  pair2: ['Ana Rodríguez', 'Laura Torres'],   score: { p1: 12, p2: 10 } },
          { courtNum: 2, pair1: ['Marcos Herrera', 'Sofía López'],  pair2: [], score: { p1: 12, p2: 6 } } as unknown as CourtLive,
        ],
      },
    ],
    standings: [
      { playerId: 'f2', name: 'Marcos Herrera', isMe: false, wins: 2, pts: 96, gamesPlayed: 3 },
      { playerId: 'f1', name: 'Ana Rodríguez',  isMe: false, wins: 2, pts: 92, gamesPlayed: 3 },
      { playerId: 'me', name: 'Diego García',   isMe: true,  wins: 2, pts: 88, gamesPlayed: 3 },
      { playerId: 'f4', name: 'Sofía López',    isMe: false, wins: 1, pts: 80, gamesPlayed: 3 },
      { playerId: 'f5', name: 'Laura Torres',   isMe: false, wins: 1, pts: 74, gamesPlayed: 3 },
      { playerId: 'f3', name: 'Carlos Vargas',  isMe: false, wins: 0, pts: 58, gamesPlayed: 3 },
    ],
  },
};

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_INFO: Record<GameStatus, { label: string; color: string }> = {
  created:       { label: 'Creado',      color: '#7c3aed'           },
  starting_soon: { label: 'Por Empezar', color: '#f5a623'           },
  live:          { label: 'En Vivo',     color: 'var(--turf-green)' },
  finished:      { label: 'Finalizado',  color: 'var(--grey-400)'   },
};

// ── Shared styles ──────────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

export default function QuickGameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const game = GAMES[id];

  // Score entry state: keyed by `${roundNum}-${courtNum}`
  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});
  const [savedScores, setSavedScores] = useState<Record<string, { p1: number; p2: number }>>({});

  if (!game) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--grey-400)', marginBottom: 16 }}>Juego no encontrado.</p>
        <Link href="/dashboard/player/quick-game" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600 }}>← Mis Juegos Rápidos</Link>
      </div>
    );
  }

  const si = STATUS_INFO[game.status];
  const isLive     = game.status === 'live';
  const isFinished = game.status === 'finished';
  const isPending  = game.status === 'created' || game.status === 'starting_soon';

  const liveRound = game.rounds.find(r => r.status === 'live') ?? null;
  const doneRounds = game.rounds.filter(r => r.status === 'done');

  function getScoreKey(roundNum: number, courtNum: number) {
    return `${roundNum}-${courtNum}`;
  }

  function handleScoreChange(key: string, side: 'p1' | 'p2', val: string) {
    setScoreInputs(prev => ({
      ...prev,
      [key]: { ...(prev[key] || { p1: '', p2: '' }), [side]: val },
    }));
  }

  function handleRegister(key: string) {
    const raw = scoreInputs[key] || { p1: '', p2: '' };
    const p1 = parseInt(raw.p1 || '0', 10);
    const p2 = parseInt(raw.p2 || '0', 10);
    setSavedScores(prev => ({ ...prev, [key]: { p1, p2 } }));
    setScoreInputs(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  return (
    <div style={{ padding: '40px 40px 80px', maxWidth: 960 }}>

      {/* Finished banner */}
      {isFinished && (
        <div style={{ background: 'var(--turf-green)', color: '#fff', padding: '14px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Juego finalizado</span>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <Link href="/dashboard/player/quick-game" style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Mis Juegos Rápidos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: 'rgba(124,58,237,0.09)', color: '#7c3aed', letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}>
            {game.code}
          </span>
          {!isFinished && (
            <Link
              href={`/dashboard/player/quick-game/${id}/edit`}
              style={{ padding: '8px 18px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-block' }}
            >
              Editar / Gestionar
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
          {game.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLive && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 12, fontWeight: 700, color: si.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {si.label}
          </span>
        </div>
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 32, fontSize: 12, color: 'var(--grey-500)' }}>
        {[
          game.date,
          game.time,
          game.club,
          game.city,
          game.levelLabel,
          game.pairType === 'exchange' ? 'Intercambio' : 'Pareja Fija',
          game.scoreConfig,
        ].map((item, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ color: 'var(--grey-300)' }}>·</span>}
            {item}
          </span>
        ))}
      </div>

      {/* Pending panel */}
      {isPending && (
        <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '24px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            {game.status === 'starting_soon' ? '⏱' : '📋'}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4 }}>
              El juego aún no comenzó
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>
              Fecha de inicio: {game.date} a las {game.time}
            </div>
            {game.status === 'created' && game.players.length < 4 && (
              <div style={{ fontSize: 12, color: '#f5a623', marginTop: 6, fontWeight: 600 }}>
                Faltan jugadores — compartí el código {game.code} para que se unan.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live round */}
      {isLive && liveRound && (
        <div style={{ marginBottom: 36 }}>
          <div style={secTitle}>Ronda Actual — Ronda {liveRound.roundNum}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {liveRound.courts.map(court => {
              const key = getScoreKey(liveRound.roundNum, court.courtNum);
              const saved = savedScores[key] ?? court.score;
              const inputs = scoreInputs[key] || { p1: '', p2: '' };
              const showInput = saved === null;

              return (
                <div
                  key={court.courtNum}
                  style={{ background: '#fff', border: '2px solid var(--turf-green)', padding: '20px 24px' }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 14 }}>
                    Cancha {court.courtNum}
                  </div>

                  {/* Matchup */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{court.pair1[0]}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey-600)' }}>{court.pair1[1]}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {saved !== null ? (
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
                          <span style={{ color: saved!.p1 > saved!.p2 ? 'var(--turf-green)' : 'var(--grey-400)' }}>{saved!.p1}</span>
                          <span style={{ color: 'var(--grey-300)', margin: '0 6px' }}>–</span>
                          <span style={{ color: saved!.p2 > saved!.p1 ? 'var(--turf-green)' : 'var(--grey-400)' }}>{saved!.p2}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--grey-300)', letterSpacing: '0.04em' }}>VS</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{court.pair2[0]}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey-600)' }}>{court.pair2[1]}</div>
                    </div>
                  </div>

                  {/* Score input */}
                  {showInput && (
                    <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                        Registrar score:
                      </span>
                      <input
                        type="number" min={0} max={99}
                        value={inputs.p1}
                        onChange={e => handleScoreChange(key, 'p1', e.target.value)}
                        placeholder="0"
                        style={{ ...inp, width: 72, textAlign: 'center', padding: '8px 10px' }}
                      />
                      <span style={{ color: 'var(--grey-400)', fontWeight: 700 }}>–</span>
                      <input
                        type="number" min={0} max={99}
                        value={inputs.p2}
                        onChange={e => handleScoreChange(key, 'p2', e.target.value)}
                        placeholder="0"
                        style={{ ...inp, width: 72, textAlign: 'center', padding: '8px 10px' }}
                      />
                      <button
                        onClick={() => handleRegister(key)}
                        style={{ padding: '9px 20px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}
                      >
                        Registrar
                      </button>
                    </div>
                  )}

                  {saved !== null && (
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

      {/* Standings */}
      {game.standings.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={secTitle}>Clasificación</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--grey-50)', borderBottom: '2px solid var(--grey-200)' }}>
                {['Pos', 'Jugador', 'Victorias', 'Pts', 'PJ'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Pos' ? 'center' : 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {game.standings.map((s, i) => (
                <tr
                  key={s.playerId}
                  style={{ borderBottom: '1px solid var(--grey-100)', background: s.isMe ? 'rgba(214,255,0,0.05)' : i % 2 === 0 ? '#fff' : 'var(--grey-50)' }}
                >
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: i === 0 ? 'var(--neon)' : 'var(--grey-300)' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 13, fontWeight: s.isMe ? 700 : 500, color: 'var(--black)' }}>{s.name}</span>
                    {s.isMe && (
                      <span style={{ marginLeft: 8, fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700, verticalAlign: 'middle' }}>TÚ</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{s.wins}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--black)' }}>{s.pts}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--grey-400)' }}>{s.gamesPlayed}</td>
                </tr>
              ))}
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
              <div key={round.roundNum}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>
                  Ronda {round.roundNum}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {round.courts.map(court => (
                    <div
                      key={court.courtNum}
                      style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{court.pair1[0]}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>{court.pair1[1]}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        {court.score ? (
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                            <span style={{ color: court.score.p1 > court.score.p2 ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.score.p1}</span>
                            <span style={{ color: 'var(--grey-300)', margin: '0 4px' }}>–</span>
                            <span style={{ color: court.score.p2 > court.score.p1 ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.score.p2}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--grey-300)' }}>–</span>
                        )}
                        <div style={{ fontSize: 9, color: 'var(--grey-300)', marginTop: 2, letterSpacing: '0.08em' }}>CANCHA {court.courtNum}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{court.pair2[0]}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>{court.pair2[1]}</div>
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
