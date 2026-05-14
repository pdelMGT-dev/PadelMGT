'use client';

import { useState } from 'react';

const categories = ['Masculino', 'Femenino', 'Mixto', 'Sub-23', 'Veteranos'];

const rankings: Record<string, { pos: number; name: string; country: string; flag: string; pts: number; delta: number }[]> = {
  'Masculino': [
    { pos: 1, name: 'Alejandro Galán', country: 'ESP', flag: '🇪🇸', pts: 8450, delta: 0 },
    { pos: 2, name: 'Juan Lebrón', country: 'ESP', flag: '🇪🇸', pts: 8100, delta: 2 },
    { pos: 3, name: 'Federico Chingotto', country: 'ARG', flag: '🇦🇷', pts: 7850, delta: -1 },
    { pos: 4, name: 'Arturo Coello', country: 'ESP', flag: '🇪🇸', pts: 7600, delta: 1 },
    { pos: 5, name: 'Agustín Tapia', country: 'ARG', flag: '🇦🇷', pts: 7400, delta: -2 },
    { pos: 6, name: 'Franco Stupaczuk', country: 'ARG', flag: '🇦🇷', pts: 7100, delta: 1 },
    { pos: 7, name: 'Sanyo Gutiérrez', country: 'ARG', flag: '🇦🇷', pts: 6950, delta: -1 },
    { pos: 8, name: 'Pablo Lima', country: 'BRA', flag: '🇧🇷', pts: 6800, delta: 0 },
  ],
  'Femenino': [
    { pos: 1, name: 'Ari Sánchez', country: 'ESP', flag: '🇪🇸', pts: 8200, delta: 0 },
    { pos: 2, name: 'Paula Josemaría', country: 'ESP', flag: '🇪🇸', pts: 7900, delta: 0 },
    { pos: 3, name: 'Gemma Triay', country: 'ESP', flag: '🇪🇸', pts: 7600, delta: 1 },
    { pos: 4, name: 'Alejandra Salazar', country: 'ESP', flag: '🇪🇸', pts: 7200, delta: -1 },
    { pos: 5, name: 'Lucía Sainz', country: 'ESP', flag: '🇪🇸', pts: 6900, delta: 2 },
    { pos: 6, name: 'Marta Marrero', country: 'ESP', flag: '🇪🇸', pts: 6600, delta: -1 },
    { pos: 7, name: 'Delfi Brea', country: 'ARG', flag: '🇦🇷', pts: 6300, delta: 0 },
    { pos: 8, name: 'Bea González', country: 'ESP', flag: '🇪🇸', pts: 6000, delta: 1 },
  ],
};

export default function FederationRankingsPage() {
  const [category, setCategory] = useState('Masculino');
  const rows = rankings[category] || rankings['Masculino'];

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Federación Argentina</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>RANKINGS OFICIALES</h1>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>↓ Exportar CSV</button>
      </div>

      {/* Top 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {rows.slice(0, 3).map((p, i) => (
          <div key={p.pos} style={{ background: i === 0 ? 'var(--black)' : '#fff', padding: '36px 32px', position: 'relative' }}>
            {i === 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#f5a623' }} />}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 600, lineHeight: 0.9, color: i === 0 ? '#f5a623' : 'var(--grey-200)', letterSpacing: '-0.03em', marginBottom: 12 }}>#{p.pos}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: i === 0 ? '#fff' : 'var(--black)', marginBottom: 4 }}>{p.flag} {p.name}</div>
            <div style={{ fontSize: 12, color: i === 0 ? 'rgba(255,255,255,0.45)' : 'var(--grey-400)', marginBottom: 12 }}>{p.country}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: i === 0 ? '#fff' : 'var(--black)' }}>{p.pts.toLocaleString()}</div>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: i === 0 ? 'rgba(255,255,255,0.4)' : 'var(--grey-400)', fontWeight: 600 }}>puntos</div>
          </div>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`pill-tab${category === c ? ' active' : ''}`}>{c}</button>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Ranking Oficial — {category} · Mayo 2026</p>

      <div style={{ border: '1px solid var(--grey-200)' }}>
        <table className="rank-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>Pos.</th>
              <th>Jugador</th>
              <th>País</th>
              <th style={{ textAlign: 'right', paddingRight: 32 }}>Puntos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.pos}>
                <td style={{ paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.pos === 1 ? '#f5a623' : p.pos === 2 ? 'var(--grey-300)' : p.pos === 3 ? '#c8944a' : 'var(--grey-100)', color: p.pos <= 3 ? '#fff' : 'var(--grey-500)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>{p.pos}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: p.delta > 0 ? 'var(--turf-green)' : p.delta < 0 ? '#ee0005' : 'var(--grey-200)' }}>
                      {p.delta > 0 ? `▲${p.delta}` : p.delta < 0 ? `▼${Math.abs(p.delta)}` : '–'}
                    </span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</td>
                <td style={{ fontSize: 13 }}>{p.flag} {p.country}</td>
                <td style={{ textAlign: 'right', paddingRight: 32, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{p.pts.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
