'use client';

import { useState } from 'react';

const courts = [
  { id: 1, name: 'Cancha 1', surface: 'Cristal', indoor: true, status: 'occupied', until: '21:30', reservation: 'Diego G. / Ana R. vs Carlos V. / Sofía L.', maintenanceNext: '2026-06-01' },
  { id: 2, name: 'Cancha 2', surface: 'Moqueta', indoor: true, status: 'free', until: null, reservation: null, maintenanceNext: '2026-06-15' },
  { id: 3, name: 'Cancha 3', surface: 'Cristal', indoor: false, status: 'occupied', until: '22:00', reservation: 'Torneo Americano de Mayo', maintenanceNext: '2026-06-01' },
  { id: 4, name: 'Cancha 4', surface: 'Moqueta', indoor: false, status: 'free', until: null, reservation: null, maintenanceNext: '2026-07-01' },
  { id: 5, name: 'Cancha 5', surface: 'Cristal', indoor: true, status: 'maintenance', until: '2026-05-14', reservation: null, maintenanceNext: '2026-05-14' },
  { id: 6, name: 'Cancha 6', surface: 'Moqueta', indoor: true, status: 'occupied', until: '20:30', reservation: 'Liga Club Interna', maintenanceNext: '2026-06-15' },
  { id: 7, name: 'Cancha 7', surface: 'Cristal', indoor: false, status: 'free', until: null, reservation: null, maintenanceNext: '2026-07-01' },
  { id: 8, name: 'Cancha 8', surface: 'Moqueta', indoor: false, status: 'occupied', until: '21:00', reservation: 'Juego amistoso', maintenanceNext: '2026-06-01' },
];

const schedule = [
  { time: '08:00', courts: [null, 'Clase gruppal', null, null, null, null, null, null] },
  { time: '09:00', courts: ['Diego G.', 'Clase grupal', 'Carlos V.', null, null, null, null, null] },
  { time: '10:00', courts: ['Torneo', 'Torneo', 'Torneo', 'Torneo', null, null, null, null] },
  { time: '11:00', courts: ['Torneo', 'Torneo', 'Torneo', 'Torneo', null, null, null, null] },
  { time: '19:00', courts: ['Diego G.', null, 'Torneo', null, null, 'Liga', null, 'Juego'] },
  { time: '20:00', courts: ['Diego G.', null, 'Torneo', null, null, 'Liga', null, 'Juego'] },
  { time: '21:00', courts: ['Diego G.', null, 'Torneo', null, null, null, null, null] },
];

export default function ClubCourtsPage() {
  const [view, setView] = useState<'grid' | 'schedule'>('grid');

  const free = courts.filter(c => c.status === 'free').length;
  const occupied = courts.filter(c => c.status === 'occupied').length;
  const maintenance = courts.filter(c => c.status === 'maintenance').length;
  const occupancy = Math.round((occupied / courts.length) * 100);

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Club La Cantera</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>CANCHAS</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('grid')} className={`pill-tab${view === 'grid' ? ' active' : ''}`}>Mapa</button>
          <button onClick={() => setView('schedule')} className={`pill-tab${view === 'schedule' ? ' active' : ''}`}>Horarios</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Canchas libres', value: String(free), color: 'var(--turf-green)' },
          { label: 'Ocupadas', value: String(occupied), color: 'var(--black)' },
          { label: 'Mantenimiento', value: String(maintenance), color: '#f5a623' },
          { label: 'Ocupación', value: `${occupancy}%` },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: s.color || 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid view */}
      {view === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)' }}>
          {courts.map((c) => (
            <div key={c.id} style={{ background: c.status === 'occupied' ? 'var(--black)' : c.status === 'maintenance' ? 'var(--grey-50)' : '#fff', padding: '28px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', color: c.status === 'occupied' ? '#fff' : 'var(--black)' }}>{c.name}</div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.status === 'occupied' ? '#ee0005' : c.status === 'maintenance' ? '#f5a623' : 'var(--turf-green)' }} />
              </div>
              <div style={{ fontSize: 11, color: c.status === 'occupied' ? 'rgba(255,255,255,0.45)' : 'var(--grey-400)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                {c.surface} · {c.indoor ? 'Cubierta' : 'Al aire libre'}
              </div>
              {c.status === 'occupied' && (
                <>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{c.reservation}</div>
                  <div style={{ fontSize: 11, color: 'var(--neon)', fontWeight: 600 }}>Hasta {c.until}</div>
                </>
              )}
              {c.status === 'maintenance' && (
                <div style={{ fontSize: 12, color: '#f5a623' }}>Hasta {c.until}</div>
              )}
              {c.status === 'free' && (
                <button className="btn btn-primary btn-sm" style={{ borderRadius: 0, marginTop: 8, display: 'block', width: '100%', textAlign: 'center', background: 'var(--black)', color: '#fff' }}>
                  Reservar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Schedule view */}
      {view === 'schedule' && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: 'var(--grey-50)' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 700, borderBottom: '1px solid var(--grey-200)', width: 80 }}>Hora</th>
                {courts.map(c => (
                  <th key={c.id} style={{ padding: '12px 8px', textAlign: 'center', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 700, borderBottom: '1px solid var(--grey-200)' }}>{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                  <td style={{ padding: '12px 20px', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--black)' }}>{row.time}</td>
                  {row.courts.map((cell, j) => (
                    <td key={j} style={{ padding: '8px', textAlign: 'center' }}>
                      {cell ? (
                        <div style={{ background: 'var(--black)', color: '#fff', fontSize: 10, padding: '4px 6px', fontWeight: 600, lineHeight: 1.3 }}>{cell}</div>
                      ) : (
                        <div style={{ height: 28, background: 'rgba(30,170,82,0.06)', border: '1px dashed rgba(30,170,82,0.2)' }} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
