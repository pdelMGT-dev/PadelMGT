'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getSATournamentsFromSupabase } from '@/lib/superadmin-data';

const months = ['Mayo 2026', 'Junio 2026', 'Julio 2026'];

interface CalEvent {
  date: string; day: number; name: string; type: string;
  format: string; club: string; city: string; spots: number;
}

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
  const [events, setEvents] = useState<CalEvent[]>([]);

  useEffect(() => {
    getSATournamentsFromSupabase().then(sb => {
      // null = fetch failed; [] = genuinely no tournaments. Either way the
      // calendar shows only real Supabase tournaments (no demo events).
      if (sb === null) return;
      setEvents(sb.map(t => ({
        date: t.date ?? '',
        day: t.date ? parseInt(t.date.slice(8, 10)) : 0,
        name: t.name,
        type: 'tournament',
        format: t.format,
        club: t.club,
        city: t.city,
        spots: 0,
      })));
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
          {filtered.length === 0 ? (
            <div style={{ border: '1px dashed var(--grey-300)', background: 'var(--grey-50)', padding: '64px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 10 }}>
                Sin eventos en {month}
              </div>
              <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>
                Cuando se creen torneos, aparecerán acá.
              </div>
            </div>
          ) : (
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
