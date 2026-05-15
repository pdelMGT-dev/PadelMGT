'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

type GameStatus = 'created' | 'starting_soon' | 'live' | 'finished';
type PairType   = 'fixed' | 'exchange';
type ScoreType  = 'points' | 'traditional';
type Level      = 'all' | 'beginner' | 'intermediate' | 'advanced';

type MockPlayer = {
  id: string;
  name: string;
  ranking: number;
  isCreator?: boolean;
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
  level: Level;
  pairType: PairType;
  scoreConfig: string;
  status: GameStatus;
  initialPlayerIds: string[];
};

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_PLAYERS: MockPlayer[] = [
  { id: 'me', name: 'Diego García',    ranking: 47, isCreator: true },
  { id: 'p1', name: 'Ana Rodríguez',   ranking: 34 },
  { id: 'p2', name: 'Marcos Herrera',  ranking: 12 },
  { id: 'p3', name: 'Carlos Vargas',   ranking: 89 },
  { id: 'p4', name: 'Sofía López',     ranking: 56 },
  { id: 'p5', name: 'Diego Fernández', ranking: 45 },
];

const FRIENDS: MockPlayer[] = MOCK_PLAYERS.filter(p => !p.isCreator);

const GAMES: Record<string, GameDetail> = {
  g1: {
    id: 'g1', code: 'JR-2026-3841', name: 'Express Nocturno',
    date: '2026-05-14', time: '20:00', club: 'Padel Arena', city: 'Buenos Aires',
    levelLabel: 'Todos', level: 'all', pairType: 'exchange',
    scoreConfig: 'Por Puntos · 16 pts',
    status: 'live',
    initialPlayerIds: ['me', 'p1', 'p2', 'p3'],
  },
  g2: {
    id: 'g2', code: 'JR-2026-5519', name: 'Juego Rápido Tarde',
    date: '2026-05-15', time: '17:00', club: 'Club Barrio Norte', city: 'Buenos Aires',
    levelLabel: 'Intermedio', level: 'intermediate', pairType: 'exchange',
    scoreConfig: 'Tradicional · 6 games/set',
    status: 'starting_soon',
    initialPlayerIds: ['me', 'p1', 'p4', 'p5'],
  },
  g3: {
    id: 'g3', code: 'JR-2026-4827', name: 'Juego del Sábado',
    date: '2026-05-20', time: '11:00', club: 'Club Barrio Norte', city: 'Buenos Aires',
    levelLabel: 'Intermedio', level: 'intermediate', pairType: 'fixed',
    scoreConfig: 'Por Puntos · 16 pts',
    status: 'created',
    initialPlayerIds: ['me', 'p2'],
  },
  g4: {
    id: 'g4', code: 'JR-2026-2234', name: 'Americano Viernes',
    date: '2026-05-08', time: '19:00', club: 'Padel Arena', city: 'Buenos Aires',
    levelLabel: 'Avanzado', level: 'advanced', pairType: 'exchange',
    scoreConfig: 'Por Puntos · 16 pts',
    status: 'finished',
    initialPlayerIds: ['me', 'p1', 'p2', 'p3', 'p4', 'p5'],
  },
  g5: {
    id: 'g5', code: 'JR-2026-1198', name: 'Express del Club',
    date: '2026-05-02', time: '10:00', club: 'Club La Cantera', city: 'Córdoba',
    levelLabel: 'Todos', level: 'all', pairType: 'exchange',
    scoreConfig: 'Por Puntos · 12 pts',
    status: 'finished',
    initialPlayerIds: ['me', 'p1', 'p2', 'p3', 'p4', 'p5'],
  },
};

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_INFO: Record<GameStatus, { label: string; color: string }> = {
  created:       { label: 'Creado',      color: '#7c3aed'           },
  starting_soon: { label: 'Por Empezar', color: '#f5a623'           },
  live:          { label: 'En Vivo',     color: 'var(--turf-green)' },
  finished:      { label: 'Finalizado',  color: 'var(--grey-400)'   },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseScoreConfig(scoreConfig: string): {
  scoreType: ScoreType;
  gamesPerSet: number;
  tiebreak: number;
  deuce: string;
  targetPoints: number;
} {
  const isPorPuntos = scoreConfig.startsWith('Por Puntos');
  const pointsMatch = scoreConfig.match(/(\d+)\s*pts/);
  const gamesMatch  = scoreConfig.match(/(\d+)\s*games\/set/);
  return {
    scoreType:    isPorPuntos ? 'points' : 'traditional',
    gamesPerSet:  gamesMatch  ? parseInt(gamesMatch[1],  10) : 6,
    tiebreak:     7,
    deuce:        'advantage',
    targetPoints: pointsMatch ? parseInt(pointsMatch[1], 10) : 16,
  };
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 13,
  border: '1px solid var(--grey-200)',
  background: '#fff',
  color: 'var(--black)',
  outline: 'none',
  fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
};

const inpDisabled: React.CSSProperties = {
  ...inp,
  background: 'var(--grey-50)',
  color: 'var(--grey-400)',
  cursor: 'not-allowed',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--grey-500)',
  marginBottom: 6,
  display: 'block',
};

const fieldGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

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

// ── Sub-components ─────────────────────────────────────────────────────────────

function PlayerAvatar({ name, isCreator }: { name: string; isCreator?: boolean }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: isCreator ? 'var(--neon)' : 'var(--grey-100)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700,
      color: isCreator ? 'var(--black)' : 'var(--grey-500)',
      flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function QuickGameEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();
  const game    = GAMES[id];

  // Resolve initial players from ids
  const initialPlayers = (game?.initialPlayerIds ?? [])
    .map(pid => MOCK_PLAYERS.find(p => p.id === pid))
    .filter((p): p is MockPlayer => p !== undefined);

  // Parse score config for defaults
  const parsed = game ? parseScoreConfig(game.scoreConfig) : {
    scoreType: 'points' as ScoreType,
    gamesPerSet: 6,
    tiebreak: 7,
    deuce: 'advantage',
    targetPoints: 16,
  };

  // ── Editable state ───────────────────────────────────────────────────────────
  const [gameName,     setGameName]     = useState(game?.name  ?? '');
  const [gameDate,     setGameDate]     = useState(game?.date  ?? '');
  const [gameTime,     setGameTime]     = useState(game?.time  ?? '');
  const [players,      setPlayers]      = useState<MockPlayer[]>(initialPlayers);
  const [scoreType,    setScoreType]    = useState<ScoreType>(parsed.scoreType);
  const [gamesPerSet,  setGamesPerSet]  = useState(parsed.gamesPerSet);
  const [tiebreak,     setTiebreak]     = useState<7 | 10>(parsed.tiebreak === 10 ? 10 : 7);
  const [deuce,        setDeuce]        = useState(parsed.deuce);
  const [targetPoints, setTargetPoints] = useState(parsed.targetPoints);
  const [pairType,     setPairType]     = useState<PairType>(game?.pairType ?? 'exchange');
  const [level,        setLevel]        = useState<Level>(game?.level ?? 'all');

  // ── Player panel state ───────────────────────────────────────────────────────
  const [addPanelOpen,  setAddPanelOpen]  = useState(false);
  const [addTab,        setAddTab]        = useState<'friends' | 'search'>('friends');
  const [searchQuery,   setSearchQuery]   = useState('');

  if (!game) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--grey-400)', marginBottom: 16 }}>Juego no encontrado.</p>
        <Link href="/dashboard/player/quick-game" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600 }}>
          ← Mis Juegos Rápidos
        </Link>
      </div>
    );
  }

  const si         = STATUS_INFO[game.status];
  const isLive     = game.status === 'live';
  const isFinished = game.status === 'finished';
  const isEditable = game.status === 'created' || game.status === 'starting_soon';

  // ── Player helpers ───────────────────────────────────────────────────────────

  function removePlayer(pid: string) {
    setPlayers(prev => prev.filter(p => p.id !== pid));
  }

  function addPlayer(player: MockPlayer) {
    if (!players.find(p => p.id === player.id)) {
      setPlayers(prev => [...prev, player]);
    }
    setAddPanelOpen(false);
    setSearchQuery('');
  }

  const currentIds = new Set(players.map(p => p.id));

  const filteredFriends = FRIENDS.filter(f => !currentIds.has(f.id));

  const filteredSearch = searchQuery.trim().length > 0
    ? MOCK_PLAYERS.filter(
        p => !currentIds.has(p.id) &&
             p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // ── Actions ──────────────────────────────────────────────────────────────────

  function handleSave() {
    localStorage.setItem(
      'qg_notification',
      JSON.stringify({ type: 'updated', message: `Juego "${gameName}" actualizado correctamente.` })
    );
    router.push('/dashboard/player/quick-game');
  }

  function handleCancel() {
    localStorage.setItem(
      'qg_notification',
      JSON.stringify({ type: 'cancelled', message: `El juego "${game.name}" fue cancelado. Los jugadores fueron notificados.` })
    );
    localStorage.setItem('qg_cancelled', game.id);
    router.push('/dashboard/player/quick-game');
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '40px 40px 80px', maxWidth: 960 }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <Link
          href={`/dashboard/player/quick-game/${id}`}
          style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Detalle del juego
        </Link>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px',
          background: `${si.color}18`,
          color: si.color,
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-body)',
          textTransform: 'uppercase',
        }}>
          {si.label}
        </span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
          Juego Rápido
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
          GESTIONAR JUEGO
        </h1>

        {isEditable ? (
          <div style={{ maxWidth: 480 }}>
            <span style={labelStyle}>Nombre del juego</span>
            <input
              type="text"
              value={gameName}
              onChange={e => setGameName(e.target.value)}
              style={inp}
              placeholder="Nombre del juego"
            />
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--grey-600)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
            {game.name}
          </div>
        )}
      </div>

      {/* Status info panel */}
      {isFinished && (
        <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '18px 24px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--grey-500)', marginBottom: 4 }}>
              Juego finalizado · No se puede editar
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
              Este juego ya finalizó. Los datos se muestran en modo lectura.
            </div>
          </div>
        </div>
      )}

      {isLive && (
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', padding: '18px 24px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--black)', marginBottom: 4 }}>
              En juego · Solo el creador puede corregir scores
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>
              El juego está en curso. Las ediciones de nombre, fecha y jugadores no están disponibles. Usá la vista de detalle para registrar o corregir scores.
            </div>
          </div>
        </div>
      )}

      {/* ── Editable form — created / starting_soon ───────────────────────────── */}
      {isEditable && (
        <>
          {/* Date / Time */}
          <div style={{ marginBottom: 36 }}>
            <div style={secTitle}>Fecha y hora</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 480 }}>
              <div style={fieldGroup}>
                <span style={labelStyle}>Fecha</span>
                <input
                  type="date"
                  value={gameDate}
                  onChange={e => setGameDate(e.target.value)}
                  style={inp}
                />
              </div>
              <div style={fieldGroup}>
                <span style={labelStyle}>Hora</span>
                <input
                  type="time"
                  value={gameTime}
                  onChange={e => setGameTime(e.target.value)}
                  style={inp}
                />
              </div>
            </div>
          </div>

          {/* Score config */}
          <div style={{ marginBottom: 36 }}>
            <div style={secTitle}>Configuración de score</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>

              {/* Score type */}
              <div style={fieldGroup}>
                <span style={labelStyle}>Tipo de score</span>
                <select
                  value={scoreType}
                  onChange={e => setScoreType(e.target.value as ScoreType)}
                  style={inp}
                >
                  <option value="traditional">Tradicional</option>
                  <option value="points">Por Puntos</option>
                </select>
              </div>

              {scoreType === 'traditional' && (
                <>
                  <div style={fieldGroup}>
                    <span style={labelStyle}>Games por set</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={gamesPerSet}
                      onChange={e => setGamesPerSet(parseInt(e.target.value, 10) || 6)}
                      style={inp}
                    />
                  </div>
                  <div style={fieldGroup}>
                    <span style={labelStyle}>Tiebreak a</span>
                    <select
                      value={tiebreak}
                      onChange={e => setTiebreak(parseInt(e.target.value, 10) as 7 | 10)}
                      style={inp}
                    >
                      <option value={7}>7</option>
                      <option value={10}>10</option>
                    </select>
                  </div>
                  <div style={fieldGroup}>
                    <span style={labelStyle}>Deuce</span>
                    <select
                      value={deuce}
                      onChange={e => setDeuce(e.target.value)}
                      style={inp}
                    >
                      <option value="advantage">Ventaja</option>
                      <option value="gold">Punto de Oro</option>
                    </select>
                  </div>
                </>
              )}

              {scoreType === 'points' && (
                <div style={fieldGroup}>
                  <span style={labelStyle}>Puntos objetivo</span>
                  <input
                    type="number"
                    min={1}
                    value={targetPoints}
                    onChange={e => setTargetPoints(parseInt(e.target.value, 10) || 16)}
                    style={inp}
                  />
                </div>
              )}

              {/* Pair type */}
              <div style={fieldGroup}>
                <span style={labelStyle}>Parejas / Rotación</span>
                <select
                  value={pairType}
                  onChange={e => setPairType(e.target.value as PairType)}
                  style={inp}
                >
                  <option value="fixed">Parejas fijas</option>
                  <option value="exchange">Rotación</option>
                </select>
              </div>

              {/* Level */}
              <div style={fieldGroup}>
                <span style={labelStyle}>Nivel</span>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value as Level)}
                  style={inp}
                >
                  <option value="all">All</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzado</option>
                </select>
              </div>

            </div>
          </div>

          {/* Player management */}
          <div style={{ marginBottom: 36 }}>
            <div style={secTitle}>Jugadores ({players.length})</div>

            {/* Player list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxWidth: 480 }}>
              {players.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: p.isCreator ? 'rgba(214,255,0,0.05)' : '#fff',
                    border: `1px solid ${p.isCreator ? 'rgba(214,255,0,0.3)' : 'var(--grey-200)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PlayerAvatar name={p.name} isCreator={p.isCreator} />
                    <span style={{ fontSize: 13, fontWeight: p.isCreator ? 700 : 500, color: 'var(--black)' }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>#{p.ranking}</span>
                    {p.isCreator && (
                      <span style={{ fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700 }}>
                        TÚ
                      </span>
                    )}
                  </div>
                  {!p.isCreator && (
                    <button
                      onClick={() => removePlayer(p.id)}
                      aria-label={`Eliminar a ${p.name}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-400)', lineHeight: 1, padding: '2px 6px', display: 'flex', alignItems: 'center' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add player trigger */}
            <button
              onClick={() => setAddPanelOpen(prev => !prev)}
              style={{
                padding: '9px 20px',
                background: addPanelOpen ? 'var(--grey-50)' : '#fff',
                color: 'var(--black)',
                border: '1px dashed var(--grey-300)',
                cursor: 'pointer',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', gap: 8,
                maxWidth: 480,
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              {addPanelOpen ? 'Cerrar panel' : 'Agregar jugador'}
            </button>

            {/* Add player panel */}
            {addPanelOpen && (
              <div style={{
                border: '1px solid var(--grey-200)',
                background: '#fff',
                maxWidth: 480,
                marginTop: 8,
              }}>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--grey-200)' }}>
                  {(['friends', 'search'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setAddTab(tab); setSearchQuery(''); }}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: addTab === tab ? 'var(--neon)' : 'var(--grey-50)',
                        color: 'var(--black)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontFamily: 'var(--font-body)',
                        borderBottom: addTab === tab ? '2px solid var(--black)' : '2px solid transparent',
                      }}
                    >
                      {tab === 'friends' ? 'Mis Amistades' : 'Buscar en plataforma'}
                    </button>
                  ))}
                </div>

                <div style={{ padding: '16px' }}>
                  {addTab === 'friends' && (
                    filteredFriends.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--grey-400)', margin: 0 }}>
                        Todos tus amigos ya están en el juego.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredFriends.map(f => (
                          <div
                            key={f.id}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--grey-50)', border: '1px solid var(--grey-100)' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <PlayerAvatar name={f.name} />
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{f.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>#{f.ranking}</span>
                            </div>
                            <button
                              onClick={() => addPlayer(f)}
                              style={{ padding: '5px 14px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}
                            >
                              Agregar
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {addTab === 'search' && (
                    <>
                      <input
                        type="text"
                        placeholder="Buscar jugador por nombre..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ ...inp, marginBottom: 12 }}
                        autoFocus
                      />
                      {searchQuery.trim().length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--grey-400)', margin: 0 }}>
                          Ingresá un nombre para buscar.
                        </p>
                      ) : filteredSearch.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--grey-400)', margin: 0 }}>
                          No se encontraron jugadores.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {filteredSearch.map(f => (
                            <div
                              key={f.id}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--grey-50)', border: '1px solid var(--grey-100)' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <PlayerAvatar name={f.name} />
                                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{f.name}</span>
                                <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>#{f.ranking}</span>
                              </div>
                              <button
                                onClick={() => addPlayer(f)}
                                style={{ padding: '5px 14px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}
                              >
                                Agregar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Read-only player list — live / finished ───────────────────────────── */}
      {(isLive || isFinished) && (
        <div style={{ marginBottom: 36 }}>
          <div style={secTitle}>Jugadores ({initialPlayers.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480, marginBottom: 24 }}>
            {initialPlayers.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: p.isCreator ? 'rgba(214,255,0,0.05)' : 'var(--grey-50)',
                  border: `1px solid ${p.isCreator ? 'rgba(214,255,0,0.3)' : 'var(--grey-100)'}`,
                }}
              >
                <PlayerAvatar name={p.name} isCreator={p.isCreator} />
                <span style={{ fontSize: 13, fontWeight: p.isCreator ? 700 : 500, color: isFinished ? 'var(--grey-500)' : 'var(--black)' }}>
                  {p.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>#{p.ranking}</span>
                {p.isCreator && (
                  <span style={{ fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700 }}>TÚ</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Game config section ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <div style={secTitle}>Configuración del juego</div>

        {/* Code + pair type + score — always read-only */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 20, maxWidth: 640 }}>
          {[
            { label: 'Código',         value: game.code },
            { label: 'Tipo de pareja', value: game.pairType === 'exchange' ? 'Intercambio' : 'Pareja Fija' },
            { label: 'Score',          value: game.scoreConfig },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--grey-50)', padding: '14px 16px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 6 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-600)', fontFamily: item.label === 'Código' ? 'var(--font-body)' : undefined }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Club / City — read-only in all cases */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 640 }}>
          <div style={fieldGroup}>
            <span style={labelStyle}>Club</span>
            <input type="text" value={game.club} readOnly style={inpDisabled} />
          </div>
          <div style={fieldGroup}>
            <span style={labelStyle}>Ciudad</span>
            <input type="text" value={game.city} readOnly style={inpDisabled} />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
        <button
          onClick={isEditable ? handleSave : undefined}
          disabled={!isEditable}
          style={{
            padding: '12px 32px',
            background: isEditable ? 'var(--black)' : 'var(--grey-200)',
            color: isEditable ? '#fff' : 'var(--grey-400)',
            border: 'none',
            cursor: isEditable ? 'pointer' : 'not-allowed',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-body)',
          }}
        >
          Guardar cambios
        </button>

        {(isLive || isFinished) && (
          <span style={{ fontSize: 12, color: 'var(--grey-400)', fontStyle: 'italic' }}>
            {isFinished
              ? 'El juego finalizado no se puede editar.'
              : 'No se puede editar mientras el juego está en curso.'}
          </span>
        )}
      </div>

      {/* Danger zone */}
      {isEditable && (
        <div style={{ borderTop: '1px solid #fca5a5', paddingTop: 28 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 16 }}>
            Zona de peligro
          </div>
          <div style={{ background: '#fff', border: '1px solid #fca5a5', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, maxWidth: 640 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', marginBottom: 4 }}>Cancelar juego</div>
              <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                Esta acción no se puede deshacer. Se notificará a todos los jugadores.
              </div>
            </div>
            <button
              onClick={handleCancel}
              style={{ padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}
            >
              Cancelar juego
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
