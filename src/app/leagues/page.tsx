'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { leagues as initialLeagues, countries, cities } from '@/lib/data';
import { getSATournamentsFromSupabase } from '@/lib/superadmin-data';

export default function LeaguesPage() {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('All Countries');
  const [city, setCity] = useState('All Cities');
  const [status, setStatus] = useState('Todos');
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [leagues, setLeagues] = useState(initialLeagues as {
    id: string; name: string; organizer: string; country: string; city: string;
    teams: number; category: string; status: string; season: string;
  }[]);

  useEffect(() => {
    getSATournamentsFromSupabase().then(sb => {
      if (sb && sb.length > 0) {
        setLeagues(sb.map(t => ({
          id: t.id,
          name: t.name,
          organizer: t.club,
          country: t.country,
          city: t.city,
          teams: t.max_players ?? 0,
          category: t.format,
          status: t.status === 'ongoing' ? 'active' : t.status === 'upcoming' ? 'upcoming' : 'completed',
          season: t.start_date ? t.start_date.slice(0, 4) : '',
        })));
      }
    });
  }, []);

  useEffect(() => {
    fetch('https://ip-api.com/json')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success' && data.country) {
          setDetectedCountry(data.country);
          if (countries.includes(data.country)) {
            setCountry(data.country);
          }
        }
      })
      .catch(() => {});
  }, []);

  const available = cities[country] || ['All Cities'];

  const filtered = leagues.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.organizer.toLowerCase().includes(search.toLowerCase());
    const matchCountry = country === 'All Countries' || l.country === country;
    const matchCity = city === 'All Cities' || l.city === city;
    const matchStatus = status === 'Todos' || l.status === status.toLowerCase().replace('activas', 'active').replace('próximas', 'upcoming').replace('finalizadas', 'completed');
    return matchSearch && matchCountry && matchCity && matchStatus;
  });

  const statusLabel: Record<string, string> = { active: 'Activa', upcoming: 'Próxima', completed: 'Finalizada' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Temporadas largas. Ascensos y descensos.</div>
          <h1 className="page-title">LIGAS</h1>
          <p className="page-sub">Tabla automática. Encuentra una liga en tu ciudad o crea la tuya.</p>
        </div>
      </div>

      <section style={{ padding: 'clamp(40px, 5vw, 64px) clamp(20px, 4vw, 48px) clamp(48px, 7vw, 96px)' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* Location indicator */}
          {detectedCountry && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, fontSize: 13, color: 'var(--grey-500)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Ubicación detectada: <strong style={{ color: 'var(--black)' }}>{detectedCountry}</strong></span>
              <button
                onClick={() => { setDetectedCountry(null); setCountry('All Countries'); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--grey-400)', textDecoration: 'underline', padding: 0 }}
              >
                Limpiar
              </button>
            </div>
          )}

          {/* Search / filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 48, alignItems: 'center', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 200px', minWidth: 160 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--grey-400)', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ligas..." style={{ border: 'none', background: 'none', font: 'inherit', fontSize: 14, outline: 'none', width: '100%' }} />
            </div>
            <select value={country} onChange={e => { setCountry(e.target.value); setCity('All Cities'); }} className="field" style={{ margin: 0, padding: '10px 14px', borderRadius: 0, fontSize: 13 }}>
              {countries.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={city} onChange={e => setCity(e.target.value)} className="field" style={{ margin: 0, padding: '10px 14px', borderRadius: 0, fontSize: 13 }}>
              {available.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="field" style={{ margin: 0, padding: '10px 14px', borderRadius: 0, fontSize: 13 }}>
              {['Todos', 'Activas', 'Próximas', 'Finalizadas'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <p style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 24, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{filtered.length} liga{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}</p>

          {/* Table */}
          <div className="table-scroll" style={{ border: '1px solid var(--grey-200)' }}>
            <table className="rank-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Liga</th>
                  <th>Organizador</th>
                  <th>Sede</th>
                  <th>Equipos</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Temporada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td style={{ paddingLeft: 24, fontWeight: 600, fontSize: 15 }}>{l.name}</td>
                    <td style={{ color: 'var(--grey-500)', fontSize: 13 }}>{l.organizer}</td>
                    <td style={{ fontSize: 13 }}>{l.city}, {l.country}</td>
                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, textAlign: 'center' }}>{l.teams}</td>
                    <td><span className="chip" style={{ fontSize: 10 }}>{l.category}</span></td>
                    <td>
                      <span className="badge" style={{
                        background: l.status === 'active' ? 'var(--turf-green)' : l.status === 'upcoming' ? '#f5f5f5' : '#f5f5f5',
                        color: l.status === 'active' ? '#fff' : 'var(--black)',
                        border: l.status !== 'active' ? '1px solid var(--grey-300)' : 'none',
                      }}>
                        {statusLabel[l.status]}
                      </span>
                    </td>
                    <td style={{ color: 'var(--grey-500)', fontSize: 13 }}>{l.season}</td>
                    <td><Link href={`/leagues/${l.id}`} className="btn btn-secondary btn-sm">Ver →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style={{ background: '#111', color: '#fff', padding: '80px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 0.95 }}>¿TIENES UNA LIGA?</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: 0 }}>Gestiona temporadas largas, ascensos y descensos con tabla automática.</p>
          </div>
          <Link href="/signup?role=league_organizer" className="btn btn-on-dark btn-lg" style={{ flexShrink: 0 }}>Crear Liga</Link>
        </div>
      </section>
    </div>
  );
}
