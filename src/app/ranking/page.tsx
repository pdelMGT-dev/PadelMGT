'use client';

import Link from 'next/link';
import { useState } from 'react';

const categories = ['General', 'Masculino', 'Femenino', 'Sub-23', 'Veteranos'];
const countries = ['Todos', 'Argentina', 'España', 'México', 'Colombia', 'Chile', 'Brasil', 'Uruguay'];

const players = [
  { pos: 1, prev: 1, name: 'Alejandro Galán', country: 'ES', city: 'Madrid', pts: 8450, tournaments: 22, wins: 18, club: 'RC Padel Madrid' },
  { pos: 2, prev: 3, name: 'Juan Lebrón', country: 'ES', city: 'Sevilla', pts: 8100, tournaments: 22, wins: 16, club: 'Club Sevilla Padel' },
  { pos: 3, prev: 2, name: 'Federico Chingotto', country: 'AR', city: 'Buenos Aires', pts: 7850, tournaments: 21, wins: 15, club: 'Buenos Aires PC' },
  { pos: 4, prev: 5, name: 'Arturo Coello', country: 'ES', city: 'Alicante', pts: 7600, tournaments: 20, wins: 14, club: 'Padel Alicante Pro' },
  { pos: 5, prev: 4, name: 'Agustín Tapia', country: 'AR', city: 'Córdoba', pts: 7400, tournaments: 21, wins: 13, club: 'Córdoba Padel Club' },
  { pos: 6, prev: 7, name: 'Franco Stupaczuk', country: 'AR', city: 'Buenos Aires', pts: 7100, tournaments: 19, wins: 12, club: 'Buenos Aires PC' },
  { pos: 7, prev: 6, name: 'Sanyo Gutiérrez', country: 'AR', city: 'Tucumán', pts: 6950, tournaments: 20, wins: 11, club: 'Tucumán Padel' },
  { pos: 8, prev: 8, name: 'Víctor Ruiz', country: 'ES', city: 'Barcelona', pts: 6800, tournaments: 18, wins: 10, club: 'Club Padel Barcelona' },
  { pos: 9, prev: 11, name: 'Pablo Lima', country: 'BR', city: 'São Paulo', pts: 6500, tournaments: 19, wins: 9, club: 'SP Padel Academy' },
  { pos: 10, prev: 9, name: 'Miguel Lamperti', country: 'AR', city: 'Rosario', pts: 6200, tournaments: 17, wins: 9, club: 'Rosario Padel' },
  { pos: 11, prev: 10, name: 'Diego Ramos', country: 'UY', city: 'Montevideo', pts: 5900, tournaments: 16, wins: 8, club: 'Montevideo PC' },
  { pos: 12, prev: 13, name: 'Carlos Sánchez', country: 'CO', city: 'Bogotá', pts: 5700, tournaments: 18, wins: 7, club: 'Bogotá Padel Club' },
];

const flags: Record<string, string> = { ES: '🇪🇸', AR: '🇦🇷', BR: '🇧🇷', CO: '🇨🇴', UY: '🇺🇾', MX: '🇲🇽', CL: '🇨🇱' };

export default function RankingPage() {
  const [category, setCategory] = useState('General');
  const [country, setCountry] = useState('Todos');

  const filtered = players.filter((p) => country === 'Todos' || true);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Clasificación oficial de la plataforma.</div>
          <h1 className="page-title">RANKING</h1>
          <p className="page-sub">Los mejores jugadores de la región, ordenados por puntos acumulados en torneos oficiales.</p>
        </div>
      </div>

      <section style={{ padding: '64px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* Top 3 podium */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--grey-200)', marginBottom: 56 }}>
            {players.slice(0, 3).map((p, i) => (
              <div key={p.pos} style={{ background: i === 0 ? 'var(--black)' : '#fff', padding: '40px 32px', position: 'relative' }}>
                {i === 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--neon)' }} />}
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 80, fontWeight: 600, lineHeight: 0.9, color: i === 0 ? 'var(--neon)' : 'var(--grey-200)', letterSpacing: '-0.03em', marginBottom: 16 }}>#{p.pos}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: i === 0 ? '#fff' : 'var(--black)', marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: i === 0 ? 'rgba(255,255,255,0.5)' : 'var(--grey-400)', marginBottom: 16 }}>{flags[p.country]} {p.city}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: i === 0 ? '#fff' : 'var(--black)' }}>{p.pts.toLocaleString()}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: i === 0 ? 'rgba(255,255,255,0.4)' : 'var(--grey-400)', fontWeight: 600 }}>puntos</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`pill-tab${category === c ? ' active' : ''}`}>{c}</button>
              ))}
            </div>
            <select value={country} onChange={e => setCountry(e.target.value)} className="field" style={{ margin: 0, padding: '10px 14px', borderRadius: 0, fontSize: 13, minWidth: 160 }}>
              {countries.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <p style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 24, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{filtered.length} jugadores · {category} · Temp. 2026</p>

          {/* Full table */}
          <div style={{ border: '1px solid var(--grey-200)' }}>
            <table className="rank-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24, width: 80 }}>Pos.</th>
                  <th>Jugador</th>
                  <th>Club</th>
                  <th style={{ textAlign: 'center' }}>Torneos</th>
                  <th style={{ textAlign: 'center' }}>Victorias</th>
                  <th style={{ textAlign: 'right', paddingRight: 32 }}>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const moved = p.prev - p.pos;
                  return (
                    <tr key={p.pos}>
                      <td style={{ paddingLeft: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: p.pos === 1 ? '#f5a623' : p.pos === 2 ? 'var(--grey-300)' : p.pos === 3 ? '#c8944a' : 'var(--grey-100)',
                            color: p.pos <= 3 ? '#fff' : 'var(--grey-500)',
                            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, flexShrink: 0,
                          }}>{p.pos}</div>
                          <span style={{ fontSize: 10, color: moved > 0 ? 'var(--turf-green)' : moved < 0 ? '#ee0005' : 'var(--grey-300)', fontWeight: 700 }}>
                            {moved > 0 ? `▲${moved}` : moved < 0 ? `▼${Math.abs(moved)}` : '–'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{flags[p.country]} {p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{p.city}</div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{p.club}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{p.tournaments}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--turf-green)' }}>{p.wins}</td>
                      <td style={{ textAlign: 'right', paddingRight: 32, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{p.pts.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style={{ background: '#111', color: '#fff', padding: '80px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 0.95 }}>¿QUIERES APARECER AQUÍ?</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: 0 }}>Participa en torneos oficiales y acumula puntos para el ranking nacional.</p>
          </div>
          <Link href="/tournaments" className="btn btn-on-dark btn-lg" style={{ flexShrink: 0 }}>Ver Torneos</Link>
        </div>
      </section>
    </div>
  );
}
