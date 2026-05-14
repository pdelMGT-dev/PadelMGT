'use client';

import Link from 'next/link';
import { useState } from 'react';

const events = [
  { day: 13, month: 'May', name: 'Partido de práctica', type: 'game', with: 'Carlos V. + Ana R.', club: 'Club Barrio Norte', time: '20:00', status: 'confirmed' },
  { day: 17, month: 'May', name: 'Mexicano del Club', type: 'tournament', format: 'Mexicano', club: 'Club La Cantera', city: 'Córdoba', time: '10:00', status: 'enrolled', spots: '6/8' },
  { day: 20, month: 'May', name: 'Liga Premier LATAM – J9', type: 'league', format: 'Round Robin', club: 'Sede Central', city: 'Buenos Aires', time: '18:00', status: 'confirmed' },
  { day: 24, month: 'May', name: 'Express Saturday', type: 'tournament', format: 'Americano', club: 'Club Caribe', city: 'Cartagena', time: '09:00', status: 'enrolled', spots: '3/8' },
  { day: 25, month: 'May', name: 'Swiss Open Santiago', type: 'tournament', format: 'Swiss', club: 'Padel Santiago', city: 'Santiago', time: '09:00', status: 'enrolled', spots: '12/32' },
  { day: 28, month: 'May', name: 'Copa Federación – Final', type: 'tournament', format: 'Knockout', club: 'Arena Nacional', city: 'Buenos Aires', time: '14:00', status: 'pending' },
  { day: 1, month: 'Jun', name: 'Abierto Junio Americano', type: 'tournament', format: 'Americano', club: 'Club Central', city: 'Buenos Aires', time: '10:00', status: 'open', spots: '8/16' },
];

const typeColor: Record<string, string> = {
  tournament: 'var(--court-blue)',
  league: 'var(--turf-green)',
  game: 'var(--black)',
};

const statusLabel: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmado', color: 'var(--turf-green)' },
  enrolled: { label: 'Inscripto', color: 'var(--court-blue)' },
  pending: { label: 'Por confirmar', color: '#f5a623' },
  open: { label: 'Disponible', color: 'var(--grey-400)' },
};

export default function PlayerCalendarPage() {
  const [filter, setFilter] = useState('Todos');

  const filtered = events.filter((e) =>
    filter === 'Todos' ? true :
    filter === 'Torneos' ? e.type === 'tournament' :
    filter === 'Ligas' ? e.type === 'league' : e.type === 'game'
  );

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Próximas fechas</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MI CALENDARIO</h1>
      </div>

      {/* Month summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Torneos inscripto', value: '3' },
          { label: 'Partidos de liga', value: '1' },
          { label: 'Partidos amistosos', value: '1' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Todos', 'Torneos', 'Ligas', 'Amistosos'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`pill-tab${filter === f ? ' active' : ''}`}>{f}</button>
          ))}
        </div>
        <Link href="/tournaments" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Buscar torneos</Link>
      </div>

      {/* Events */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
        {filtered.map((e, i) => {
          const st = statusLabel[e.status];
          return (
            <div key={i} style={{ background: '#fff', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 24 }}>
              {/* Date */}
              <div style={{ background: typeColor[e.type], padding: '14px 16px', minWidth: 64, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{e.day}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{e.month}</div>
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)', marginBottom: 4 }}>{e.name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                  {e.time && <span>{e.time} · </span>}
                  {e.club}{e.city ? `, ${e.city}` : ''}
                  {e.with && <span> · Con {e.with}</span>}
                  {(e as any).format && <span> · {(e as any).format}</span>}
                </div>
              </div>

              {/* Status + action */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: st.color, marginBottom: 8 }}>{st.label}</div>
                {e.status === 'open'
                  ? <Link href="/signup" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Inscribirse</Link>
                  : <Link href="/dashboard/player/tournaments" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Ver</Link>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
