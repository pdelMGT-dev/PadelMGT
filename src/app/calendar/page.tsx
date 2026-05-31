'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getSATournamentsFromSupabase } from '@/lib/superadmin-data';

const months = ['Mayo 2026', 'Junio 2026', 'Julio 2026'];

const initialEvents = [
  { date: '2026-05-14', day: 14, name: 'Americano Barrio Norte', type: 'tournament', format: 'Americano', club: 'Club Barrio Norte', city: 'Buenos Aires', spots: 4 },
  { date: '2026-05-15', day: 15, name: 'Liga Premier LATAM – J8', type: 'league', format: 'Round Robin', club: 'Sede Central', city: 'Buenos Aires', spots: 0 },
  { date: '2026-05-17', day: 17, name: 'Mexicano del Club', type: 'tournament', format: 'Mexicano', club: 'Club La Cantera', city: 'Córdoba', spots: 6 },
  { date: '2026-05-18', day: 18, name: 'Open Knockout Mayo', type: 'tournament', format: 'Knockout', club: 'Padel Arena', city: 'Rosario', spots: 8 },
  { date: '2026-05-20', day: 20, name: 'Copa Empresas Lima – SF', type: 'tournament', format: 'Round Robin', club: 'Club Empresarial', city: 'Lima', spots: 2 },
  { date: '2026-05-22', day: 22, name: 'Liga Andina – J9', type: 'league', format: 'Team League', club: 'Multi-sede', city: 'Mendoza', spots: 0 },
  { date: '2026-05-24', day: 24, name: 'Express Saturday Caribe', type: 'tournament', format: 'Americano', club: 'Club Caribe', city: 'Cartagena', spots: 3 },
  { date: '2026-05-25', day: 25, name: 'Swiss Open Santiago', type: 'tournament', format: 'Swiss', club: 'Padel Santiago', city: 'Santiago', spots: 12 },
  { date: '2026-05-28', day: 28, name: 'Copa Federación – Final', type: 'federation', format: 'Knockout', club: 'Arena Nacional', city: 'Buenos Aires', spots: 0 },
  { date: '2026-05-30', day: 30, name: 'Round Robin Social Club', type: 'tournament', format: 'Round Robin', club: 'Social Club', city: 'Montevideo', spots: 5 },
  { date: '2026-06-01', day: 1, name: 'Abierto Junio Americano', type: 'tournament', format: 'Americano', club: 'Club Central', city: 'Buenos Aires', spots: 8 },
  { date: '2026-06-07', day: 7, name: 'Liga Premier LATAM – J9', type: 'league', format: 'Round Robin', club: 'Sede Central', city: 'Buenos Aires', spots: 0 },
];

const typeColors: Record<string, string> = {
  tournament: 'var(--court-blue)',
  league: 'var(--turf-green)',
  federation: '#f5a623',
};

const typeLabels: Record<string, string> = {
  tournament: 'Torneo',
  league: 'Liga',
  federation: 'Federación',
};

const filters = ['Todos', 'Torneos', 'Ligas', 'Federación'];

export default function CalendarPage() {
  const [filter, setFilter] = useState('Todos');
  const [month, setMonth] = useState('Mayo 2026');
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    getSATournamentsFromSupabase().then(sb => {
      if (sb && sb.length > 0) {
        const sbEvents = sb.map(t => ({
          date: t.start_date ?? '',
          day: t.start_date ? parseInt(t.start_date.slice(8, 10)) : 0,
          name: t.name,
          type: 'tournament' as const,
          format: t.format,
          club: t.club,
          city: t.city,
          spots: 0,
        }));
        const existingNames = new Set(initialEvents.map(e => e.name));
        const newEvents = sbEvents.filter(e => !existingNames.has(e.name));
        setEvents([...initialEvents, ...newEvents]);
      }
    });
  }, []);

  const filtered = events.filter((e) => {
    const matchMonth = e.date.startsWith(month === 'Mayo 2026' ? '2026-05' : month === 'Junio 2026' ? '2026-06' : '2026-07');
    const matchFilter = filter === 'Todos' ||
      (filter === 'Torneos' && e.type === 'tournament') ||
      (filter === 'Ligas' && e.type === 'league') ||
      (filter === 'Federación' && e.type === 'federation');
    return matchMonth && matchFilter;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Todos los eventos en un solo lugar.</div>
          <h1 className="page-title">CALENDARIO</h1>
          <p className="page-sub">Torneos, ligas y competiciones próximas en tu región.</p>
        </div>
      </div>

      <section style={{ padding: '64px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {filters.map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`pill-tab${filter === f ? ' active' : ''}`}>{f}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {months.map((m) => (
                <button key={m} onClick={() => setMonth(m)} style={{
                  padding: '8px 20px', border: `2px solid ${month === m ? 'var(--black)' : 'var(--grey-200)'}`,
                  background: month === m ? 'var(--black)' : '#fff', cursor: 'pointer', borderRadius: 0,
                  fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                  color: month === m ? '#fff' : 'var(--black)', transition: 'all 0.15s',
                }}>{m}</button>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 32, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{filtered.length} evento{filtered.length !== 1 ? 's' : ''} en {month}</p>

          {/* Event list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
            {filtered.map((event, i) => (
              <div key={i} style={{ background: '#fff', padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 28 }}>
                {/* Date block */}
                <div style={{ background: 'var(--black)', padding: '16px 20px', minWidth: 72, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{event.day}</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{month.split(' ')[0].slice(0, 3)}</div>
                </div>

                {/* Type dot */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColors[event.type], flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span className="chip" style={{ fontSize: 10, background: typeColors[event.type], color: '#fff', border: 'none' }}>{typeLabels[event.type]}</span>
                    <span className="chip" style={{ fontSize: 10 }}>{event.format}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)' }}>{event.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--grey-400)', marginTop: 4 }}>{event.club} · {event.city}</div>
                </div>

                {/* Spots + action */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {event.spots > 0 ? (
                    <>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--turf-green)', marginBottom: 4 }}>{event.spots} lugares</div>
                      <Link href="/signup" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Inscribirse</Link>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Completo</div>
                      <Link href="/signup" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Ver Detalles</Link>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--grey-400)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, color: 'var(--grey-200)', marginBottom: 16 }}>SIN EVENTOS</div>
              <p style={{ fontSize: 15 }}>No hay eventos para este filtro. Prueba con otro mes o categoría.</p>
            </div>
          )}
        </div>
      </section>

      <section style={{ background: '#111', color: '#fff', padding: '80px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 0.95 }}>¿ORGANIZAS UN EVENTO?</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: 0 }}>Publica tu torneo o liga y aparece en el calendario de toda la comunidad.</p>
          </div>
          <Link href="/signup" className="btn btn-on-dark btn-lg" style={{ flexShrink: 0 }}>Crear Evento</Link>
        </div>
      </section>
    </div>
  );
}
