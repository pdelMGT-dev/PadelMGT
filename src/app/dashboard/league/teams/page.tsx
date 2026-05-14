'use client';

import { useState } from 'react';

const teams = [
  { id: 1, name: 'Padel Madrid Central', club: 'Madrid', pos: 1, pts: 21, players: [{ name: 'Diego G.', ranking: '#47' }, { name: 'Ana R.', ranking: '#52' }, { name: 'Carlos V.', ranking: '#38' }, { name: 'Sofía L.', ranking: '#29' }] },
  { id: 2, name: 'Club Barrio Norte', club: 'Buenos Aires', pos: 2, pts: 18, players: [{ name: 'Marcos H.', ranking: '#61' }, { name: 'Laura T.', ranking: '#74' }, { name: 'Pedro M.', ranking: '#55' }, { name: 'Elena V.', ranking: '#80' }] },
  { id: 3, name: 'La Cantera FC', club: 'Córdoba', pos: 3, pts: 15, players: [{ name: 'Juan C.', ranking: '#66' }, { name: 'Valentina C.', ranking: '#43' }, { name: 'Roberto P.', ranking: '#90' }, { name: 'Camila O.', ranking: '#85' }] },
  { id: 4, name: 'Club Caribe', club: 'Cartagena', pos: 4, pts: 12, players: [{ name: 'Felipe C.', ranking: '#49' }, { name: 'Rodrigo M.', ranking: '#50' }, { name: 'Nicolás C.', ranking: '#45' }, { name: 'Lucía F.', ranking: '#72' }] },
  { id: 5, name: 'Padel Arena', club: 'Rosario', pos: 5, pts: 9, players: [{ name: 'Eduardo S.', ranking: '#58' }, { name: 'Camila R.', ranking: '#67' }, { name: 'Santiago M.', ranking: '#88' }, { name: 'Valeria L.', ranking: '#91' }] },
];

export default function LeagueTeamsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Liga Premier LATAM · 2026</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>EQUIPOS</h1>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Agregar Equipo</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Equipos inscriptos', value: String(teams.length) },
          { label: 'Jugadores totales', value: String(teams.length * 4) },
          { label: 'Plazas disponibles', value: '28' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add team form */}
      {showAdd && (
        <div style={{ background: 'var(--black)', padding: '28px 32px', marginBottom: 24, position: 'relative' }}>
          <button onClick={() => setShowAdd(false)} style={{ position: 'absolute', top: 14, right: 20, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>×</button>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 16 }}>Nuevo Equipo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre del equipo</label><input placeholder="Mi Equipo FC" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} /></div>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Club / Sede</label><input placeholder="Nombre del club" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} /></div>
            <div className="field"><label style={{ color: 'rgba(255,255,255,0.6)' }}>Ciudad</label><input placeholder="Ciudad" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} /></div>
          </div>
          <button onClick={() => setShowAdd(false)} className="btn btn-sm" style={{ background: 'var(--neon)', color: 'var(--black)', borderRadius: 0, fontWeight: 700 }}>Agregar equipo</button>
        </div>
      )}

      {/* Teams list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
        {teams.map((team) => (
          <div key={team.id}>
            <div onClick={() => setExpanded(expanded === team.id ? null : team.id)}
              style={{ background: expanded === team.id ? 'var(--black)' : '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer', transition: 'background 0.15s' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: expanded === team.id ? 'var(--neon)' : 'var(--grey-200)', width: 48, flexShrink: 0 }}>#{team.pos}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: expanded === team.id ? '#fff' : 'var(--black)' }}>{team.name}</div>
                <div style={{ fontSize: 12, color: expanded === team.id ? 'rgba(255,255,255,0.45)' : 'var(--grey-400)', marginTop: 2 }}>{team.club} · {team.players.length} jugadores</div>
              </div>
              <div style={{ textAlign: 'right', marginRight: 16 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: expanded === team.id ? '#fff' : 'var(--black)' }}>{team.pts}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: expanded === team.id ? 'rgba(255,255,255,0.4)' : 'var(--grey-400)', fontWeight: 600 }}>puntos</div>
              </div>
              <span style={{ fontSize: 14, color: expanded === team.id ? 'var(--neon)' : 'var(--grey-300)' }}>{expanded === team.id ? '▲' : '▼'}</span>
            </div>

            {expanded === team.id && (
              <div style={{ background: '#fff', padding: '20px 24px 24px', borderTop: '1px solid var(--grey-200)' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 14 }}>Nómina de jugadores</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {team.players.map((p, i) => (
                    <div key={i} style={{ border: '1px solid var(--grey-200)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--grey-400)' }}>{p.ranking}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Editar equipo</button>
                  <button style={{ background: 'none', border: '1px solid var(--grey-200)', padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#ee0005', fontWeight: 600 }}>Eliminar equipo</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
