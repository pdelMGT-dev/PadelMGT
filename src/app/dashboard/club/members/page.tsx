'use client';

import { useState } from 'react';

const members = [
  { id: 1, name: 'Diego García', email: 'diego@email.com', level: 'Avanzado', joined: '2024-03-15', tournaments: 12, ranking: '#47', status: 'active' },
  { id: 2, name: 'Ana Rodríguez', email: 'ana@email.com', level: 'Intermedio', joined: '2024-05-20', tournaments: 8, ranking: '#52', status: 'active' },
  { id: 3, name: 'Carlos Vega', email: 'carlos@email.com', level: 'Avanzado', joined: '2023-11-01', tournaments: 24, ranking: '#38', status: 'active' },
  { id: 4, name: 'Sofía López', email: 'sofia@email.com', level: 'Avanzado', joined: '2023-08-12', tournaments: 26, ranking: '#29', status: 'active' },
  { id: 5, name: 'Marcos Herrera', email: 'marcos@email.com', level: 'Intermedio', joined: '2025-01-08', tournaments: 4, ranking: '#61', status: 'active' },
  { id: 6, name: 'Laura Torres', email: 'laura@email.com', level: 'Principiante', joined: '2026-02-14', tournaments: 2, ranking: '–', status: 'active' },
  { id: 7, name: 'Pedro Méndez', email: 'pedro@email.com', level: 'Intermedio', joined: '2025-09-30', tournaments: 6, ranking: '#55', status: 'active' },
  { id: 8, name: 'Valentina Cruz', email: 'valentina@email.com', level: 'Intermedio', joined: '2026-05-13', tournaments: 0, ranking: '–', status: 'pending' },
  { id: 9, name: 'Roberto Paz', email: 'roberto@email.com', level: 'Principiante', joined: '2026-05-12', tournaments: 0, ranking: '–', status: 'pending' },
];

const levels = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];

export default function ClubMembersPage() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('Todos');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = members.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchLevel = level === 'Todos' || m.level === level;
    return matchSearch && matchLevel;
  });

  const active = members.filter(m => m.status === 'active').length;
  const pending = members.filter(m => m.status === 'pending').length;

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Club La Cantera</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MIEMBROS</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Agregar Miembro</button>
          <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>↑ Importar CSV</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Total miembros', value: String(members.length) },
          { label: 'Activos', value: String(active), color: 'var(--turf-green)' },
          { label: 'Pendientes', value: String(pending), color: '#f5a623' },
          { label: 'Promedio torneos', value: String(Math.round(members.reduce((s, m) => s + m.tournaments, 0) / members.length)) },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: s.color || 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add member form */}
      {showAdd && (
        <div style={{ background: 'var(--black)', padding: '28px 32px', marginBottom: 24, position: 'relative' }}>
          <button onClick={() => setShowAdd(false)} style={{ position: 'absolute', top: 14, right: 20, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>×</button>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 16 }}>Nuevo Miembro</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre</label><input placeholder="Nombre completo" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} /></div>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Email</label><input type="email" placeholder="correo@email.com" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} /></div>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Nivel</label>
              <select style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
                {['Principiante', 'Intermedio', 'Avanzado'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Teléfono</label><input placeholder="+54 11 ..." style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} /></div>
          </div>
          <button onClick={() => setShowAdd(false)} className="btn btn-sm" style={{ background: 'var(--neon)', color: 'var(--black)', borderRadius: 0, fontWeight: 700 }}>Guardar miembro</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {levels.map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={`pill-tab${level === l ? ' active' : ''}`}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--grey-200)', padding: '10px 16px' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--grey-400)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar miembro..." style={{ border: 'none', background: 'none', font: 'inherit', fontSize: 13, outline: 'none', width: 200 }} />
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{filtered.length} miembro{filtered.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      <div style={{ border: '1px solid var(--grey-200)' }}>
        <table className="rank-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>Miembro</th>
              <th>Nivel</th>
              <th>Ranking</th>
              <th style={{ textAlign: 'center' }}>Torneos</th>
              <th>Miembro desde</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td style={{ paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, background: 'var(--grey-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {m.name.split(' ').map(w => w[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className="chip" style={{ fontSize: 10 }}>{m.level}</span></td>
                <td style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{m.ranking}</td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{m.tournaments}</td>
                <td style={{ fontSize: 12, color: 'var(--grey-400)' }}>{m.joined}</td>
                <td>
                  {m.status === 'active'
                    ? <span className="badge" style={{ background: 'rgba(30,170,82,0.1)', color: 'var(--turf-green)', border: 'none' }}>Activo</span>
                    : <span className="badge" style={{ background: 'rgba(245,166,35,0.1)', color: '#f5a623', border: 'none' }}>Pendiente</span>
                  }
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0, padding: '4px 10px' }}>Editar</button>
                    <button style={{ background: 'none', border: '1px solid var(--grey-200)', padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: 'var(--grey-400)', fontWeight: 600 }}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
