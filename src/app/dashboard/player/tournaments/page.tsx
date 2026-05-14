'use client';

import Link from 'next/link';
import { useState } from 'react';

const tournaments = [
  { name: 'Americano Barrio Norte', format: 'Americano', date: '11 May 2026', club: 'Club Barrio Norte', city: 'Buenos Aires', partner: 'Ana R.', pos: 2, total: 8, pts: 120, status: 'completed' },
  { name: 'Liga Premier LATAM – J8', format: 'Round Robin', date: '08 May 2026', club: 'Sede Central', city: 'Buenos Aires', partner: 'Ana R.', pos: 3, total: 12, pts: 90, status: 'completed' },
  { name: 'Open Knockout Mayo', format: 'Knockout', date: '04 May 2026', club: 'Padel Arena', city: 'Rosario', partner: 'Marcos H.', pos: 1, total: 16, pts: 200, status: 'completed' },
  { name: 'Mexicano del Club', format: 'Mexicano', date: '17 May 2026', club: 'Club La Cantera', city: 'Córdoba', partner: '–', pos: null, total: 8, pts: null, status: 'upcoming' },
  { name: 'Swiss Open Santiago', format: 'Swiss', date: '25 May 2026', club: 'Padel Santiago', city: 'Santiago', partner: '–', pos: null, total: 32, pts: null, status: 'upcoming' },
  { name: 'Copa Federación', format: 'Knockout', date: '28 May 2026', club: 'Arena Nacional', city: 'Buenos Aires', partner: '–', pos: null, total: 64, pts: null, status: 'upcoming' },
];

const selectStyle: React.CSSProperties = {
  padding: '7px 32px 7px 12px',
  fontSize: 12, fontWeight: 600, border: '1px solid var(--grey-200)',
  background: '#fff', cursor: 'pointer', appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  color: 'var(--black)',
};

export default function PlayerTournamentsPage() {
  const [estado, setEstado] = useState('Todos');
  const [formato, setFormato] = useState('Todos los formatos');
  const [ciudad, setCiudad] = useState('Todas las ciudades');

  const filtered = tournaments.filter((t) => {
    const estadoOk = estado === 'Todos'
      || (estado === 'Próximos' ? t.status === 'upcoming' : t.status === 'completed');
    const formatoOk = formato === 'Todos los formatos' || t.format === formato;
    const ciudadOk = ciudad === 'Todas las ciudades' || t.city === ciudad;
    return estadoOk && formatoOk && ciudadOk;
  });

  const hasFilters = estado !== 'Todos' || formato !== 'Todos los formatos' || ciudad !== 'Todas las ciudades';

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Mi historial</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MIS TORNEOS</h1>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Jugados', value: '24' },
          { label: 'Victorias', value: '16' },
          { label: 'Puntos totales', value: '1,840' },
          { label: 'Mejor posición', value: '#1' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Dropdown filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={estado} onChange={e => setEstado(e.target.value)} style={selectStyle}>
          <option>Todos</option>
          <option>Próximos</option>
          <option>Finalizados</option>
        </select>
        <select value={formato} onChange={e => setFormato(e.target.value)} style={selectStyle}>
          <option>Todos los formatos</option>
          <option>Americano</option>
          <option>Mexicano</option>
          <option>Round Robin</option>
          <option>Knockout</option>
          <option>Swiss</option>
        </select>
        <select value={ciudad} onChange={e => setCiudad(e.target.value)} style={selectStyle}>
          <option>Todas las ciudades</option>
          <option>Buenos Aires</option>
          <option>Rosario</option>
          <option>Córdoba</option>
          <option>Santiago</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setEstado('Todos'); setFormato('Todos los formatos'); setCiudad('Todas las ciudades'); }}
            style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, border: '1px solid var(--grey-200)', background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Limpiar ×
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--grey-200)' }}>
        <table className="rank-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>Torneo</th>
              <th>Formato</th>
              <th>Fecha</th>
              <th>Club</th>
              <th>Pareja</th>
              <th style={{ textAlign: 'center' }}>Posición</th>
              <th style={{ textAlign: 'center' }}>Puntos</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i}>
                <td style={{ paddingLeft: 24, fontWeight: 600, fontSize: 14 }}>{t.name}</td>
                <td><span className="chip" style={{ fontSize: 10 }}>{t.format}</span></td>
                <td style={{ fontSize: 12, color: 'var(--grey-500)' }}>{t.date}</td>
                <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{t.club}, {t.city}</td>
                <td style={{ fontSize: 13 }}>{t.partner}</td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: t.pos === 1 ? '#f5a623' : 'var(--black)' }}>
                  {t.pos ? `#${t.pos}` : '–'}
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: t.pts ? 'var(--turf-green)' : 'var(--grey-300)' }}>
                  {t.pts ?? '–'}
                </td>
                <td>
                  {t.status === 'completed'
                    ? <span className="badge" style={{ background: 'var(--grey-100)', color: 'var(--grey-500)' }}>Finalizado</span>
                    : <span className="badge badge-soon">Próximo</span>
                  }
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--grey-400)', fontSize: 13 }}>
                  No hay torneos con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link href="/tournaments" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Buscar más torneos →</Link>
      </div>
    </div>
  );
}
