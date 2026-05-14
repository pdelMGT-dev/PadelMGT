'use client';

import { useState } from 'react';

const tournaments = [
  { id: 1, name: 'Copa Regional Sur 2026', country: 'Argentina', city: 'Buenos Aires', format: 'Knockout', date: '28 May 2026', prize: '$5,000', status: 'approved', submittedBy: 'Club Arena Nacional' },
  { id: 2, name: 'Open Nacional Paraguay', country: 'Paraguay', city: 'Asunción', format: 'Round Robin', date: '15 Jun 2026', prize: '$2,000', status: 'pending', submittedBy: 'Federación Paraguay' },
  { id: 3, name: 'Circuito LATAM – Bogotá', country: 'Colombia', city: 'Bogotá', format: 'Swiss', date: '22 Jun 2026', prize: '$3,500', status: 'pending', submittedBy: 'Liga Colombiana' },
  { id: 4, name: 'Grand Slam Buenos Aires', country: 'Argentina', city: 'Buenos Aires', format: 'Knockout', date: '10 Jul 2026', prize: '$10,000', status: 'pending', submittedBy: 'Club Padel Masters' },
  { id: 5, name: 'Open Primavera Lima', country: 'Perú', city: 'Lima', format: 'Americano', date: '05 Apr 2026', prize: '$1,000', status: 'approved', submittedBy: 'Club Lima Padel' },
  { id: 6, name: 'Copa Andina Intern.', country: 'Chile', city: 'Santiago', format: 'Mexicano', date: '20 Mar 2026', prize: '$2,500', status: 'rejected', submittedBy: 'Club Santiago' },
];

const filters = ['Todos', 'Pendientes', 'Aprobados', 'Rechazados'];

const statusStyle: Record<string, { label: string; bg: string; color: string }> = {
  approved: { label: 'Aprobado', bg: 'rgba(30,170,82,0.1)', color: 'var(--turf-green)' },
  pending: { label: 'Pendiente', bg: 'rgba(245,166,35,0.1)', color: '#f5a623' },
  rejected: { label: 'Rechazado', bg: 'rgba(238,0,5,0.08)', color: '#ee0005' },
};

export default function FederationTournamentsPage() {
  const [filter, setFilter] = useState('Todos');

  const filtered = tournaments.filter((t) =>
    filter === 'Todos' ? true :
    filter === 'Pendientes' ? t.status === 'pending' :
    filter === 'Aprobados' ? t.status === 'approved' : t.status === 'rejected'
  );

  const pending = tournaments.filter(t => t.status === 'pending').length;

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Federación Argentina</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>TORNEOS SANCIONADOS</h1>
        </div>
        <button className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Sancionar Torneo</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Aprobados', value: String(tournaments.filter(t => t.status === 'approved').length), color: 'var(--turf-green)' },
          { label: 'Pendientes', value: String(pending), color: '#f5a623' },
          { label: 'Rechazados', value: String(tournaments.filter(t => t.status === 'rejected').length), color: '#ee0005' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`pill-tab${filter === f ? ' active' : ''}`}>
            {f}{f === 'Pendientes' && pending > 0 && <span style={{ background: '#ee0005', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', marginLeft: 6 }}>{pending}</span>}
          </button>
        ))}
      </div>

      <div style={{ border: '1px solid var(--grey-200)' }}>
        <table className="rank-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>Torneo</th>
              <th>País / Ciudad</th>
              <th>Formato</th>
              <th>Fecha</th>
              <th>Premio</th>
              <th>Solicitado por</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const st = statusStyle[t.status];
              return (
                <tr key={t.id}>
                  <td style={{ paddingLeft: 24, fontWeight: 600, fontSize: 14 }}>{t.name}</td>
                  <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{t.country} · {t.city}</td>
                  <td><span className="chip" style={{ fontSize: 10 }}>{t.format}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--grey-500)' }}>{t.date}</td>
                  <td style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--turf-green)' }}>{t.prize}</td>
                  <td style={{ fontSize: 12, color: 'var(--grey-500)' }}>{t.submittedBy}</td>
                  <td><span className="badge" style={{ background: st.bg, color: st.color, border: 'none' }}>{st.label}</span></td>
                  <td>
                    {t.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" style={{ borderRadius: 0, background: 'var(--turf-green)', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✓</button>
                        <button className="btn btn-sm" style={{ borderRadius: 0, background: '#ee0005', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✗</button>
                      </div>
                    ) : (
                      <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Ver</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
