'use client';

import { useState } from 'react';

const clubs = [
  { id: 1, name: 'Club Arena Nacional', country: 'Argentina', city: 'Buenos Aires', members: 450, courts: 8, level: 'Premier', status: 'active', joined: '2023-01-01' },
  { id: 2, name: 'Club Padel Lima', country: 'Perú', city: 'Lima', members: 280, courts: 5, level: 'Standard', status: 'active', joined: '2023-06-15' },
  { id: 3, name: 'Club Deportivo Bogotá', country: 'Colombia', city: 'Bogotá', members: 320, courts: 6, level: 'Premier', status: 'active', joined: '2023-03-20' },
  { id: 4, name: 'Club Santiago de Chile', country: 'Chile', city: 'Santiago', members: 190, courts: 4, level: 'Standard', status: 'active', joined: '2024-01-10' },
  { id: 5, name: 'Club Padel Montevideo', country: 'Uruguay', city: 'Montevideo', members: 140, courts: 3, level: 'Basic', status: 'active', joined: '2024-04-05' },
  { id: 6, name: 'Club Deportivo Quito', country: 'Ecuador', city: 'Quito', members: 95, courts: 2, level: 'Basic', status: 'pending', joined: '2026-05-11' },
  { id: 7, name: 'Padel Club Asunción', country: 'Paraguay', city: 'Asunción', members: 70, courts: 2, level: 'Basic', status: 'pending', joined: '2026-05-12' },
  { id: 8, name: 'Club Barrio Norte', country: 'Argentina', city: 'Buenos Aires', members: 380, courts: 7, level: 'Premier', status: 'active', joined: '2023-02-15' },
];

const countries = ['Todos', 'Argentina', 'Perú', 'Colombia', 'Chile', 'Uruguay', 'Ecuador', 'Paraguay'];

export default function FederationClubsPage() {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('Todos');
  const [filter, setFilter] = useState('Todos');

  const filtered = clubs.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase());
    const matchCountry = country === 'Todos' || c.country === country;
    const matchStatus = filter === 'Todos' ? true : filter === 'Activos' ? c.status === 'active' : c.status === 'pending';
    return matchSearch && matchCountry && matchStatus;
  });

  const pending = clubs.filter(c => c.status === 'pending').length;

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Federación Argentina</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>CLUBES AFILIADOS</h1>
        </div>
        <button className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Afiliar Club</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Clubes activos', value: String(clubs.filter(c => c.status === 'active').length) },
          { label: 'Pendientes', value: String(pending), color: '#f5a623' },
          { label: 'Miembros totales', value: clubs.reduce((s, c) => s + c.members, 0).toLocaleString() },
          { label: 'Canchas totales', value: String(clubs.reduce((s, c) => s + c.courts, 0)) },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: s.color || 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Todos', 'Activos', 'Pendientes'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`pill-tab${filter === f ? ' active' : ''}`}>{f}{f === 'Pendientes' && pending > 0 && <span style={{ background: '#ee0005', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', marginLeft: 6 }}>{pending}</span>}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={country} onChange={e => setCountry(e.target.value)} className="field" style={{ margin: 0, padding: '8px 12px', borderRadius: 0, fontSize: 12 }}>
            {countries.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--grey-200)', padding: '8px 14px' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--grey-400)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar club..." style={{ border: 'none', background: 'none', font: 'inherit', fontSize: 12, outline: 'none', width: 160 }} />
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{filtered.length} club{filtered.length !== 1 ? 'es' : ''}</p>

      <div style={{ border: '1px solid var(--grey-200)' }}>
        <table className="rank-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>Club</th>
              <th>País</th>
              <th>Nivel</th>
              <th style={{ textAlign: 'center' }}>Miembros</th>
              <th style={{ textAlign: 'center' }}>Canchas</th>
              <th>Afiliado</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={{ paddingLeft: 24 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{c.city}</div>
                </td>
                <td style={{ fontSize: 13 }}>{c.country}</td>
                <td><span className="chip" style={{ fontSize: 10, background: c.level === 'Premier' ? 'rgba(245,166,35,0.1)' : undefined, color: c.level === 'Premier' ? '#f5a623' : undefined, border: c.level === 'Premier' ? '1px solid rgba(245,166,35,0.3)' : undefined }}>{c.level}</span></td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{c.members}</td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{c.courts}</td>
                <td style={{ fontSize: 12, color: 'var(--grey-400)' }}>{c.joined}</td>
                <td>
                  {c.status === 'active'
                    ? <span className="badge" style={{ background: 'rgba(30,170,82,0.1)', color: 'var(--turf-green)', border: 'none' }}>Activo</span>
                    : <span className="badge" style={{ background: 'rgba(245,166,35,0.1)', color: '#f5a623', border: 'none' }}>Pendiente</span>
                  }
                </td>
                <td>
                  {c.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm" style={{ borderRadius: 0, background: 'var(--turf-green)', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✓</button>
                      <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Ver</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Ver</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
