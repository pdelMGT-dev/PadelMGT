'use client';

import Link from 'next/link';
import { useState } from 'react';
import { clubs, countries, cities } from '@/lib/data';

export default function ClubsPage() {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('All Countries');
  const [city, setCity] = useState('All Cities');

  const available = cities[country] || ['All Cities'];

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(2, auto)', gap: 12, marginBottom: 48, background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--grey-400)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar clubes..." style={{ border: 'none', background: 'none', font: 'inherit', fontSize: 14, outline: 'none', width: '100%' }} />
            </div>
            <select value={country} onChange={e => { setCountry(e.target.value); setCity('All Cities'); }} className="field" style={{ margin: 0, padding: '10px 14px', borderRadius: 0, fontSize: 13 }}>
              {countries.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={city} onChange={e => setCity(e.target.value)} className="field" style={{ margin: 0, padding: '10px 14px', borderRadius: 0, fontSize: 13 }}>
              {available.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <p style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 32, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{filtered.length} club{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>

          {/* Club grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)' }}>
            {filtered.map((club) => (
              <div key={club.id} style={{ background: '#fff', padding: 32 }}>
                {/* Court image placeholder */}
                <div className="card-image" style={{ height: 200, marginBottom: 24, borderRadius: 0 }}>
                  <img src="/assets/court-green.svg" alt={club.name} style={{ opacity: 0.85 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />
                  <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: '#fff' }}>★</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, color: '#fff' }}>{club.rating}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0, lineHeight: 1 }}>{club.name}</h3>
                </div>

                <p style={{ fontSize: 13, color: 'var(--grey-500)', margin: '0 0 16px' }}>{club.address}</p>

                <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--grey-500)', marginBottom: 20 }}>
                  <span><strong style={{ color: 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 18 }}>{club.courts}</strong> canchas</span>
                  <span><strong style={{ color: 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 18 }}>{club.members}</strong> miembros</span>
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
    </div>
  );
}
