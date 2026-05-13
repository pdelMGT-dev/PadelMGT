'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const initial = [
  { id: '1', tournament: 'Open Buenos Aires 2026', court: 'Court Center', t1: 'Martínez / Pérez', t2: 'García / López', s1: [6, 4, 3], s2: [3, 6, 5], status: 'live' },
  { id: '2', tournament: 'Liga Andina Otoño', court: 'Court 4', t1: 'Silva / Cruz', t2: 'Vargas / Romero', s1: [6, 6], s2: [2, 4], status: 'live' },
  { id: '3', tournament: 'Open Buenos Aires 2026', court: 'Court 2', t1: 'Hernández / Díaz', t2: 'Ramírez / Torres', s1: [4, 6, 6], s2: [6, 3, 4], status: 'live' },
  { id: '4', tournament: 'Express Caribe Saturday', court: 'Court A', t1: 'Flores / Rivera', t2: 'Gómez / Díaz', s1: [0, 0], s2: [0, 0], status: 'upcoming' },
  { id: '5', tournament: 'Liga Premier LATAM', court: 'Court 1', t1: 'Castillo / Mendoza', t2: 'Reyes / Cruz', s1: [6, 4], s2: [2, 6], status: 'completed' },
  { id: '6', tournament: 'Copa Empresas Lima', court: 'Court 3', t1: 'Aguilar / Ortiz', t2: 'Ramos / Ruiz', s1: [7, 6], s2: [5, 4], status: 'completed' },
];

export default function LiveScoresPage() {
  const [matches, setMatches] = useState(initial);
  const [filter, setFilter] = useState('Todos');
  const [updated, setUpdated] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setMatches(prev => prev.map(m => {
        if (m.status !== 'live') return m;
        return m;
      }));
      setUpdated(new Date());
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const filtered = filter === 'Todos' ? matches : matches.filter(m =>
    filter === 'En Vivo' ? m.status === 'live' :
    filter === 'Por Empezar' ? m.status === 'upcoming' : m.status === 'completed'
  );

  const liveCount = matches.filter(m => m.status === 'live').length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 7, height: 7, background: '#ee0005', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.4s infinite' }} />
            {liveCount} partidos en vivo ahora
          </div>
          <h1 className="page-title">EN VIVO</h1>
          <p className="page-sub">Resultados en tiempo real desde clubes de toda la región.</p>
        </div>
      </div>

      <section style={{ padding: '64px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Todos', 'En Vivo', 'Por Empezar', 'Finalizado'].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`pill-tab${filter === f ? ' active' : ''}`}>
                  {f === 'En Vivo' && <span style={{ width: 6, height: 6, background: filter === 'En Vivo' ? '#fff' : '#ee0005', borderRadius: '50%', display: 'inline-block' }} />}
                  {f}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: 'var(--grey-400)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
              Act. {updated.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Match cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)' }}>
            {filtered.map((m) => (
              <div key={m.id} style={{ background: m.status === 'live' ? '#111' : '#fff', padding: 28 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  {m.status === 'live' && <span className="badge badge-live">LIVE</span>}
                  {m.status === 'upcoming' && <span className="badge badge-soon">Por Empezar</span>}
                  {m.status === 'completed' && <span className="badge" style={{ background: 'var(--grey-100)', color: 'var(--grey-500)' }}>Finalizado</span>}
                  <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: m.status === 'live' ? 'rgba(255,255,255,0.45)' : 'var(--grey-400)', fontWeight: 600 }}>{m.court}</span>
                </div>

                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: m.status === 'live' ? 'rgba(255,255,255,0.45)' : 'var(--grey-400)', fontWeight: 600, marginBottom: 20 }}>{m.tournament}</div>

                {/* Teams + scores */}
                {[[m.t1, m.s1], [m.t2, m.s2]].map(([name, scores], j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: j > 0 ? `1px solid ${m.status === 'live' ? '#28282a' : 'var(--grey-200)'}` : 'none' }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: m.status === 'live' ? '#fff' : 'var(--black)' }}>{name as string}</span>
                    {m.status !== 'upcoming' && (
                      <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600 }}>
                        {(scores as number[]).map((s: number, k: number) => {
                          const other = (j === 0 ? m.s2 : m.s1) as number[];
                          const winning = s > other[k];
                          return (
                            <span key={k} style={{ color: m.status === 'live' ? (winning ? '#fff' : 'rgba(255,255,255,0.35)') : (winning ? 'var(--black)' : 'var(--grey-400)'), minWidth: 20, textAlign: 'center' }}>{s}</span>
                          );
                        })}
                      </div>
                    )}
                    {m.status === 'upcoming' && (
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--grey-300)' }}>–</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
