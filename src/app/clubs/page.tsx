'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { clubs as initialClubs } from '@/lib/data';
import { getSAClubsFromSupabase } from '@/lib/superadmin-data';
import ClubSuggestionModal from '@/components/ClubSuggestionModal';
import { syncClubReviews, getRatingsByClub } from '@/lib/club-review-store';

// Friendly labels for known country codes/names found in club records —
// falls back to the raw stored value for anything not listed here.
const COUNTRY_LABELS: Record<string, string> = {
  DR: 'República Dominicana',
  ES: 'España',
  US: 'Estados Unidos',
};

export default function ClubsPage() {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('All Countries');
  const [city, setCity] = useState('All Cities');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showSuggest, setShowSuggest] = useState(false);
  const [clubs, setClubs] = useState(initialClubs as {
    id: string; name: string; country: string; city: string; address: string;
    courts: number; members: number; rating: number; amenities: string[];
  }[]);

  const [ratings, setRatings] = useState<Map<string, { avg: number; count: number }>>(new Map());

  useEffect(() => {
    getSAClubsFromSupabase().then(sb => {
      // null = fetch failed — keep the placeholder. [] is a legitimate
      // "zero clubs" result and must be trusted, not skipped.
      if (sb !== null) {
        setClubs(sb.filter(c => c.status === 'active').map(c => ({
          id: c.id,
          name: c.name,
          country: c.country,
          city: c.city,
          address: c.city,
          courts: c.courts ?? 0,
          members: c.members ?? 0,
          rating: 0,
          amenities: [],
        })));
      }
    });
    // Real player-vote ratings per club
    syncClubReviews().then(reviews => setRatings(getRatingsByClub(reviews)));
  }, []);

  // Country/city filter options derived from the actual loaded clubs — not a
  // static list, so they always match what's really in the database.
  const countries = useMemo(() => {
    const set = new Set(clubs.map(c => c.country).filter(Boolean));
    return ['All Countries', ...Array.from(set).sort()];
  }, [clubs]);

  const cities = useMemo(() => {
    const set = new Set(
      clubs
        .filter(c => country === 'All Countries' || c.country === country)
        .map(c => c.city)
        .filter(Boolean),
    );
    return ['All Cities', ...Array.from(set).sort()];
  }, [clubs, country]);

  const filtered = clubs.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase());
    const matchCountry = country === 'All Countries' || c.country === country;
    const matchCity = city === 'All Cities' || c.city === city;
    return matchSearch && matchCountry && matchCity;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Encuentra dónde jugar.</div>
          <h1 className="page-title">CLUBES</h1>
          <p className="page-sub">Reserva una cancha, inscríbete a torneos y conecta con tu comunidad de pádel.</p>
        </div>
      </div>

      <section style={{ padding: '64px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(2, auto)', gap: 12, marginBottom: 32, background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--grey-400)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar clubes..." style={{ border: 'none', background: 'none', font: 'inherit', fontSize: 14, outline: 'none', width: '100%' }} />
            </div>
            <select value={country} onChange={e => { setCountry(e.target.value); setCity('All Cities'); }} className="field" style={{ margin: 0, padding: '10px 14px', borderRadius: 0, fontSize: 13 }}>
              {countries.map(c => <option key={c} value={c}>{c === 'All Countries' ? c : (COUNTRY_LABELS[c] ?? c)}</option>)}
            </select>
            <select value={city} onChange={e => setCity(e.target.value)} className="field" style={{ margin: 0, padding: '10px 14px', borderRadius: 0, fontSize: 13 }}>
              {cities.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Count + view toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 12, color: 'var(--grey-400)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
              {filtered.length} club{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setView('grid')} style={{
                padding: '8px 14px', border: `2px solid ${view === 'grid' ? 'var(--black)' : 'var(--grey-200)'}`,
                background: view === 'grid' ? 'var(--black)' : '#fff', cursor: 'pointer', borderRadius: 0,
                color: view === 'grid' ? '#fff' : 'var(--black)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="6" height="6"/><rect x="8" y="0" width="6" height="6"/><rect x="0" y="8" width="6" height="6"/><rect x="8" y="8" width="6" height="6"/></svg>
                Cuadrícula
              </button>
              <button onClick={() => setView('list')} style={{
                padding: '8px 14px', border: `2px solid ${view === 'list' ? 'var(--black)' : 'var(--grey-200)'}`,
                background: view === 'list' ? 'var(--black)' : '#fff', cursor: 'pointer', borderRadius: 0,
                color: view === 'list' ? '#fff' : 'var(--black)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="14" height="2"/><rect x="0" y="6" width="14" height="2"/><rect x="0" y="12" width="14" height="2"/></svg>
                Lista
              </button>
            </div>
          </div>

          {/* "Can't find your club?" banner */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap',
            background: 'var(--grey-50)', border: '1px dashed var(--grey-300)', padding: '18px 24px', marginBottom: 32,
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)' }}>
                ¿No encontrás tu club?
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey-500)', marginTop: 2 }}>
                Sugerilo y lo agregamos al directorio una vez verificado.
              </div>
            </div>
            <button
              onClick={() => setShowSuggest(true)}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              + Solicitar agregar club
            </button>
          </div>

          {/* Grid view */}
          {view === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)' }}>
              {filtered.map((club) => (
                <div key={club.id} style={{ background: '#fff', padding: 32 }}>
                  <div className="card-image" style={{ height: 200, marginBottom: 24, borderRadius: 0 }}>
                    <img src="/assets/court-green.svg" alt={club.name} style={{ opacity: 0.85 }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />
                    {(ratings.get(club.id)?.count ?? 0) > 0 && (
                      <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: '#fff' }}>★</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, color: '#fff' }}>{ratings.get(club.id)!.avg.toFixed(1)}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>({ratings.get(club.id)!.count})</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0, lineHeight: 1 }}>{club.name}</h3>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--grey-500)', margin: '0 0 16px' }}>{club.address}</p>

                  <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--grey-500)', marginBottom: 12 }}>
                    <span><strong style={{ color: 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 18 }}>{club.courts}</strong> canchas</span>
                    <span><strong style={{ color: 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 18 }}>{club.members}</strong> miembros</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                    {(ratings.get(club.id)?.count ?? 0) > 0 ? (
                      <>
                        <span style={{ color: '#f5a623', fontSize: 14 }}>{'★'.repeat(Math.round(ratings.get(club.id)!.avg))}{'☆'.repeat(5 - Math.round(ratings.get(club.id)!.avg))}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--black)' }}>{ratings.get(club.id)!.avg.toFixed(1)}</span>
                        <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>({ratings.get(club.id)!.count} {ratings.get(club.id)!.count === 1 ? 'voto' : 'votos'})</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--grey-300)', letterSpacing: '0.05em' }}>Sin valoraciones aún</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
                    {club.amenities.map((a) => (
                      <span key={a} className="chip" style={{ fontSize: 10 }}>{a}</span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/clubs/${club.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Ver Club</Link>
                    <Link href="/signup" className="btn btn-secondary btn-sm">Reservar</Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List view */}
          {view === 'list' && (
            <div style={{ border: '1px solid var(--grey-200)' }}>
              <table className="rank-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 24 }}>Club</th>
                    <th>Sede</th>
                    <th style={{ textAlign: 'center' }}>Canchas</th>
                    <th style={{ textAlign: 'center' }}>Miembros</th>
                    <th style={{ textAlign: 'center' }}>Rating</th>
                    <th>Servicios</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((club) => (
                    <tr key={club.id}>
                      <td style={{ paddingLeft: 24 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{club.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{club.address}</div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{club.city}, {club.country}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{club.courts}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{club.members}</td>
                      <td style={{ textAlign: 'center' }}>
                        {(ratings.get(club.id)?.count ?? 0) > 0 ? (
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: '#f5a623' }}>
                            ★ {ratings.get(club.id)!.avg.toFixed(1)} <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>({ratings.get(club.id)!.count})</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--grey-300)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {club.amenities.slice(0, 3).map((a) => (
                            <span key={a} className="chip" style={{ fontSize: 10 }}>{a}</span>
                          ))}
                          {club.amenities.length > 3 && <span className="chip" style={{ fontSize: 10 }}>+{club.amenities.length - 3}</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link href={`/clubs/${club.id}`} className="btn btn-primary btn-sm">Ver →</Link>
                          <Link href="/signup" className="btn btn-secondary btn-sm">Reservar</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section style={{ background: '#111', color: '#fff', padding: '80px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 0.95 }}>¿GESTIONAS UN CLUB?</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: 0 }}>Registra tu club, publica torneos y administra tus miembros.</p>
          </div>
          <Link href="/signup?role=club_manager" className="btn btn-on-dark btn-lg" style={{ flexShrink: 0 }}>Registrar Club</Link>
        </div>
      </section>

      {showSuggest && <ClubSuggestionModal onClose={() => setShowSuggest(false)} />}
    </div>
  );
}
