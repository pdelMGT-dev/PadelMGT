'use client';

import Link from 'next/link';
import { useState } from 'react';

const events = [
  { day: 14, month: 'May', name: 'Express Nocturno', type: 'quick_game', with: 'Ana R., Marcos H., Carlos V.', club: 'Padel Arena', city: 'Buenos Aires', time: '20:00', status: 'live', code: 'JR-2026-3841' },
  { day: 15, month: 'May', name: 'Juego Rápido Tarde', type: 'quick_game', with: 'Sofía L., Diego F., Laura T.', club: 'Club Barrio Norte', city: 'Buenos Aires', time: '17:00', status: 'starting_soon', code: 'JR-2026-5519' },
  { day: 17, month: 'May', name: 'Mexicano del Club', type: 'tournament', format: 'Mexicano', club: 'Club La Cantera', city: 'Córdoba', time: '10:00', status: 'enrolled', spots: '6/8' },
  { day: 20, month: 'May', name: 'Juego del Sábado', type: 'quick_game', with: 'Ana R., Marcos H. + 2 por confirmar', club: 'Club Barrio Norte', city: 'Buenos Aires', time: '11:00', status: 'created', code: 'JR-2026-4827' },
  { day: 20, month: 'May', name: 'Liga Premier LATAM – J9', type: 'league', format: 'Round Robin', club: 'Sede Central', city: 'Buenos Aires', time: '18:00', status: 'confirmed' },
  { day: 24, month: 'May', name: 'Express Saturday', type: 'tournament', format: 'Americano', club: 'Club Caribe', city: 'Cartagena', time: '09:00', status: 'enrolled', spots: '3/8' },
  { day: 25, month: 'May', name: 'Swiss Open Santiago', type: 'tournament', format: 'Swiss', club: 'Padel Santiago', city: 'Santiago', time: '09:00', status: 'enrolled', spots: '12/32' },
  { day: 28, month: 'May', name: 'Copa Federación – Final', type: 'tournament', format: 'Knockout', club: 'Arena Nacional', city: 'Buenos Aires', time: '14:00', status: 'pending' },
  { day: 1, month: 'Jun', name: 'Abierto Junio Americano', type: 'tournament', format: 'Americano', club: 'Club Central', city: 'Buenos Aires', time: '10:00', status: 'open', spots: '8/16' },
];

const typeColor: Record<string, string> = {
  tournament:  'var(--court-blue)',
  league:      'var(--turf-green)',
  quick_game:  '#7c3aed',
  game:        'var(--black)',
};

const typeLabel: Record<string, string> = {
  tournament: 'Torneo', league: 'Liga', quick_game: 'Juego Rápido', game: 'Amistoso',
};

const statusLabel: Record<string, { label: string; color: string }> = {
  confirmed:     { label: 'Confirmado',    color: 'var(--turf-green)' },
  enrolled:      { label: 'Inscripto',     color: 'var(--court-blue)' },
  pending:       { label: 'Por confirmar', color: '#f5a623' },
  open:          { label: 'Disponible',    color: 'var(--grey-400)' },
  live:          { label: 'En Vivo',       color: 'var(--turf-green)' },
  starting_soon: { label: 'Por Empezar',   color: '#f5a623' },
  created:       { label: 'Creado',        color: 'var(--court-blue)' },
};

export default function PlayerCalendarPage() {
  const [filter, setFilter] = useState('Todos');

  const filtered = events.filter((e) => {
    if (filter === 'Todos')          return true;
    if (filter === 'Torneos')        return e.type === 'tournament';
    if (filter === 'Ligas')          return e.type === 'league';
    if (filter === 'Juegos Rápidos') return e.type === 'quick_game';
    return e.type === 'game';
  });

  const quickGames = events.filter(e => e.type === 'quick_game').length;

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Próximas fechas</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MI CALENDARIO</h1>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Torneos inscripto',    value: '3' },
          { label: 'Partidos de liga',     value: '1' },
          { label: 'Juegos Rápidos',       value: String(quickGames), color: '#7c3aed' },
          { label: 'Partidos amistosos',   value: '0' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: s.color || 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Todos', 'Torneos', 'Ligas', 'Juegos Rápidos', 'Amistosos'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`pill-tab${filter === f ? ' active' : ''}`}>{f}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard/player/quick-game" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>+ Juego Rápido</Link>
          <Link href="/tournaments" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Torneo</Link>
        </div>
      </div>

      {/* Events */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
        {filtered.map((e, i) => {
          const st = statusLabel[e.status] ?? { label: e.status, color: 'var(--grey-400)' };
          const isQR = e.type === 'quick_game' && (e.status === 'created' || e.status === 'starting_soon');
          return (
            <div key={i} style={{ background: '#fff', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 24 }}>
              {/* Date block */}
              <div style={{ background: typeColor[e.type], padding: '14px 16px', minWidth: 64, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{e.day}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{e.month}</div>
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)' }}>{e.name}</div>
                  <span className="chip" style={{ fontSize: 9, background: typeColor[e.type] + '22', color: typeColor[e.type] }}>{typeLabel[e.type]}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                  {e.time && <span>{e.time} · </span>}
                  {e.club}{e.city ? `, ${e.city}` : ''}
                  {(e as any).with && <span> · {(e as any).with}</span>}
                  {(e as any).format && <span> · {(e as any).format}</span>}
                </div>
              </div>

              {/* Status + actions */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 8 }}>
                  {e.status === 'live' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: st.color }}>{st.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  {isQR && (e as any).code && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', letterSpacing: '0.08em' }}>{(e as any).code}</span>
                  )}
                  <Link href="/dashboard/player/quick-game" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>
                    {e.type === 'quick_game' ? 'Gestionar' : 'Ver'}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ background: '#fff', padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
            No hay eventos con el filtro seleccionado.
          </div>
        )}
      </div>
    </div>
  );
}
