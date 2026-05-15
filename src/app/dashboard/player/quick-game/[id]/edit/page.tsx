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
};

// ── Mock data ──────────────────────────────────────────────────────────────────

const GAMES: Record<string, GameDetail> = {
  g1: {
    id: 'g1', code: 'JR-2026-3841', name: 'Express Nocturno',
    date: '2026-05-14', time: '20:00', club: 'Padel Arena', city: 'Buenos Aires',
    levelLabel: 'Todos', pairType: 'exchange', scoreConfig: 'Por Puntos · 16 pts',
    status: 'live',
    players: [
      { id: 'me', name: 'Diego García', isMe: true },
      { id: 'f1', name: 'Ana Rodríguez' },
      { id: 'f2', name: 'Marcos Herrera' },
      { id: 'f3', name: 'Carlos Vargas' },
    ],
  },
  g2: {
    id: 'g2', code: 'JR-2026-5519', name: 'Juego Rápido Tarde',
    date: '2026-05-15', time: '17:00', club: 'Club Barrio Norte', city: 'Buenos Aires',
    levelLabel: 'Intermedio', pairType: 'exchange', scoreConfig: 'Tradicional · 6 games/set',
    status: 'starting_soon',
    players: [
      { id: 'me', name: 'Diego García', isMe: true },
      { id: 'f1', name: 'Ana Rodríguez' },
      { id: 'f4', name: 'Sofía López' },
      { id: 'f6', name: 'Diego Fernández' },
    ],
  },
  g3: {
    id: 'g3', code: 'JR-2026-4827', name: 'Juego del Sábado',
    date: '2026-05-20', time: '11:00', club: 'Club Barrio Norte', city: 'Buenos Aires',
    levelLabel: 'Intermedio', pairType: 'fixed', scoreConfig: 'Por Puntos · 16 pts',
    status: 'created',
    players: [
      { id: 'me', name: 'Diego García', isMe: true },
      { id: 'f1', name: 'Ana Rodríguez' },
    ],
  },
  g4: {
    id: 'g4', code: 'JR-2026-2234', name: 'Americano Viernes',
    date: '2026-05-08', time: '19:00', club: 'Padel Arena', city: 'Buenos Aires',
    levelLabel: 'Avanzado', pairType: 'exchange', scoreConfig: 'Por Puntos · 16 pts',
    status: 'finished',
    players: [
      { id: 'me', name: 'Diego García', isMe: true },
      { id: 'f1', name: 'Ana Rodríguez' },
      { id: 'f2', name: 'Marcos Herrera' },
      { id: 'f3', name: 'Carlos Vargas' },
      { id: 'f4', name: 'Sofía López' },
      { id: 'f5', name: 'Laura Torres' },
      { id: 'f6', name: 'Diego Fernández' },
      { id: 'p7', name: 'Pedro Morales' },
    ],
  },
  g5: {
    id: 'g5', code: 'JR-2026-1198', name: 'Express del Club',
    date: '2026-05-02', time: '10:00', club: 'Club La Cantera', city: 'Córdoba',
    levelLabel: 'Todos', pairType: 'exchange', scoreConfig: 'Por Puntos · 12 pts',
    status: 'finished',
    players: [
      { id: 'me', name: 'Diego García', isMe: true },
      { id: 'f1', name: 'Ana Rodríguez' },
      { id: 'f2', name: 'Marcos Herrera' },
      { id: 'f3', name: 'Carlos Vargas' },
      { id: 'f4', name: 'Sofía López' },
      { id: 'f5', name: 'Laura Torres' },
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

const label: React.CSSProperties = {
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function QuickGameEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const game = GAMES[id];

  // Editable state
  const [gameName, setGameName]   = useState(game?.name ?? '');
  const [gameDate, setGameDate]   = useState(game?.date ?? '');
  const [gameTime, setGameTime]   = useState(game?.time ?? '');
  const [players, setPlayers]     = useState<PlayerEntry[]>(game?.players ?? []);
  const [saved, setSaved]         = useState(false);
  const [cancelled, setCancelled] = useState(false);

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

  const si        = STATUS_INFO[game.status];
  const isLive     = game.status === 'live';
  const isFinished = game.status === 'finished';
  const isEditable = game.status === 'created' || game.status === 'starting_soon';

  function removePlayer(pid: string) {
    setPlayers(prev => prev.filter(p => p.id !== pid));
  }

  function handleAddPlayer() {
    const newId = `new-${Date.now()}`;
    setPlayers(prev => [...prev, { id: newId, name: 'Nuevo Jugador' }]);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleCancel() {
    setCancelled(true);
  }

  // ── Cancelled state ──────────────────────────────────────────────────────────
  if (cancelled) {
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 960 }}>
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>✕</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#b91c1c' }}>
              Juego cancelado
            </div>
            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
              El juego "{game.name}" fue cancelado.
            </div>
          </div>
        </div>
        <Link
          href="/dashboard/player/quick-game"
          style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.04em' }}
        >
          ← Volver a Mis Juegos Rápidos
        </Link>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
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

        {/* Editable game name */}
        {isEditable ? (
          <div style={{ maxWidth: 480 }}>
            <span style={label}>Nombre del juego</span>
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

      {/* Editable form — created / starting_soon */}
      {isEditable && (
        <div style={{ marginBottom: 36 }}>
          <div style={secTitle}>Configuración</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, maxWidth: 640 }}>
            <div style={fieldGroup}>
              <span style={label}>Fecha</span>
              <input
                type="date"
                value={gameDate}
                onChange={e => setGameDate(e.target.value)}
                style={inp}
              />
            </div>
            <div style={fieldGroup}>
              <span style={label}>Hora</span>
              <input
                type="time"
                value={gameTime}
                onChange={e => setGameTime(e.target.value)}
                style={inp}
              />
            </div>
          </div>

          {/* Players list */}
          <div style={secTitle}>Jugadores ({players.length})</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxWidth: 480 }}>
            {players.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: p.isMe ? 'rgba(214,255,0,0.05)' : '#fff',
                  border: `1px solid ${p.isMe ? 'rgba(214,255,0,0.3)' : 'var(--grey-200)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--grey-500)', flexShrink: 0 }}>
                    {p.name.charAt(0)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: p.isMe ? 700 : 500, color: 'var(--black)' }}>{p.name}</span>
                  {p.isMe && (
                    <span style={{ fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700 }}>TÚ</span>
                  )}
                </div>
                {!p.isMe && (
                  <button
                    onClick={() => removePlayer(p.id)}
                    aria-label={`Eliminar a ${p.name}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--grey-400)', lineHeight: 1, padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleAddPlayer}
            style={{ padding: '9px 20px', background: '#fff', color: 'var(--black)', border: '1px dashed var(--grey-300)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Agregar jugador
          </button>
        </div>
      )}

      {/* Read-only fields shown for live/finished */}
      {(isLive || isFinished) && (
        <div style={{ marginBottom: 36 }}>
          <div style={secTitle}>Jugadores ({game.players.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480, marginBottom: 24 }}>
            {game.players.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: p.isMe ? 'rgba(214,255,0,0.05)' : 'var(--grey-50)',
                  border: `1px solid ${p.isMe ? 'rgba(214,255,0,0.3)' : 'var(--grey-100)'}`,
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--grey-500)', flexShrink: 0 }}>
                  {p.name.charAt(0)}
                </div>
                <span style={{ fontSize: 13, fontWeight: p.isMe ? 700 : 500, color: isFinished ? 'var(--grey-500)' : 'var(--black)' }}>{p.name}</span>
                {p.isMe && (
                  <span style={{ fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700 }}>TÚ</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Read-only config: all statuses */}
      <div style={{ marginBottom: 36 }}>
        <div style={secTitle}>Configuración del juego</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 20, maxWidth: 640 }}>
          {[
            { label: 'Código',        value: game.code },
            { label: 'Tipo de pareja', value: game.pairType === 'exchange' ? 'Intercambio' : 'Pareja Fija' },
            { label: 'Score',          value: game.scoreConfig },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--grey-50)', padding: '14px 16px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-600)', fontFamily: item.label === 'Código' ? 'var(--font-body)' : undefined }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Club / Level — also read-only */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 640 }}>
          <div style={fieldGroup}>
            <span style={label}>Club</span>
            <input type="text" value={game.club} readOnly style={inpDisabled} />
          </div>
          <div style={fieldGroup}>
            <span style={label}>Ciudad</span>
            <input type="text" value={game.city} readOnly style={inpDisabled} />
          </div>
          <div style={fieldGroup}>
            <span style={label}>Nivel</span>
            <input type="text" value={game.levelLabel} readOnly style={inpDisabled} />
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

        {saved && (
          <span style={{ fontSize: 12, color: 'var(--turf-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ Cambios guardados
          </span>
        )}

        {(isLive || isFinished) && (
          <span style={{ fontSize: 12, color: 'var(--grey-400)', fontStyle: 'italic' }}>
            {isFinished ? 'El juego finalizado no se puede editar.' : 'No se puede editar mientras el juego está en curso.'}
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
