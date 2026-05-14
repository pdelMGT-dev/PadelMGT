'use client';

import { useState } from 'react';

const friends = [
  { name: 'Ana Rodríguez', city: 'Buenos Aires', ranking: '#52', pts: 1740, tournaments: 20, wins: 14, mutualTournaments: 5, lastMatch: '11 May', lastResult: 'V' },
  { name: 'Carlos Vega', city: 'Buenos Aires', ranking: '#38', pts: 2100, tournaments: 24, wins: 18, mutualTournaments: 3, lastMatch: '08 May', lastResult: 'D' },
  { name: 'Marcos Herrera', city: 'Córdoba', ranking: '#61', pts: 1540, tournaments: 18, wins: 10, mutualTournaments: 4, lastMatch: '04 May', lastResult: 'V' },
  { name: 'Sofía López', city: 'Rosario', ranking: '#29', pts: 2480, tournaments: 26, wins: 20, mutualTournaments: 2, lastMatch: '27 Abr', lastResult: 'D' },
  { name: 'Lucía Torres', city: 'Mendoza', ranking: '#74', pts: 1320, tournaments: 15, wins: 9, mutualTournaments: 1, lastMatch: '20 Abr', lastResult: 'V' },
];

const requests = [
  { name: 'Pedro Méndez', city: 'Buenos Aires', ranking: '#55', mutuals: 3 },
  { name: 'Valentina Cruz', city: 'Córdoba', ranking: '#43', mutuals: 2 },
];

const suggestions = [
  { name: 'Nicolás Cabrera', city: 'Buenos Aires', ranking: '#45', mutuals: 4 },
  { name: 'Laura Fernández', city: 'Rosario', ranking: '#33', mutuals: 2 },
  { name: 'Eduardo Silva', city: 'Buenos Aires', ranking: '#58', mutuals: 3 },
  { name: 'Camila Ruiz', city: 'Mar del Plata', ranking: '#67', mutuals: 1 },
];

export default function PlayerFriendsPage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) || f.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Red de jugadores</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>AMISTADES</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Amigos', value: String(friends.length) },
          { label: 'Solicitudes', value: String(requests.length) },
          { label: 'Sugerencias', value: String(suggestions.length) },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['friends', 'requests', 'search'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pill-tab${tab === t ? ' active' : ''}`}>
              {t === 'friends' ? `Mis amigos (${friends.length})` : t === 'requests' ? `Solicitudes (${requests.length})` : 'Buscar jugadores'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--grey-200)', padding: '10px 16px', minWidth: 240 }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--grey-400)', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ border: 'none', background: 'none', font: 'inherit', fontSize: 13, outline: 'none', width: '100%' }} />
        </div>
      </div>

      {/* My friends */}
      {tab === 'friends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
          {filtered.map((f) => (
            <div key={f.name} style={{ background: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 48, height: 48, background: 'var(--court-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                {f.name.split(' ').map(w => w[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</span>
                  <span className="chip" style={{ fontSize: 10 }}>{f.ranking}</span>
                  <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>{f.city}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                  {f.tournaments} torneos · {f.wins} victorias · {f.mutualTournaments} torneos juntos
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>{f.pts.toLocaleString()}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600 }}>puntos</div>
                <div style={{ fontSize: 11, marginTop: 4, color: 'var(--grey-400)' }}>
                  Último partido {f.lastMatch}:{' '}
                  <span style={{ fontWeight: 700, color: f.lastResult === 'V' ? 'var(--turf-green)' : '#ee0005' }}>{f.lastResult}</span>
                </div>
              </div>
              <button style={{ background: 'none', border: '1px solid var(--grey-200)', padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)', flexShrink: 0 }}>
                Ver perfil
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Requests */}
      {tab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
          {requests.map((r) => (
            <div key={r.name} style={{ background: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 48, height: 48, background: 'var(--grey-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--black)', flexShrink: 0 }}>
                {r.name.split(' ').map(w => w[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{r.ranking} · {r.city} · {r.mutuals} amigos en común</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Aceptar</button>
                <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search / suggestions */}
      {tab === 'search' && (
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 16 }}>Sugerencias para ti</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
            {suggestions.map((s) => (
              <div key={s.name} style={{ background: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 48, height: 48, background: 'var(--grey-50)', border: '2px solid var(--grey-200)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--black)', flexShrink: 0 }}>
                  {s.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{s.ranking} · {s.city} · {s.mutuals} amigos en común</div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Agregar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
