'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getSAPlayersFromSupabase, getSATournamentsFromSupabase } from '@/lib/superadmin-data';

const formats = [
  { k: 'americano', name: 'Americano', desc: 'Cada pareja juega contra todas. Ideal para una tarde de juego.', when: '1 sesión', teams: '4–32 parejas', img: '/assets/court-card.svg' },
  { k: 'express', name: 'Express', desc: 'Grupos cortos a 1 set. Termina en una mañana.', when: '3–4 horas', teams: '8–24 parejas', img: '/assets/court-green.svg' },
  { k: 'champions', name: 'Champions League', desc: 'Fase de grupos + eliminatorias. El formato premium.', when: 'Multi-jornada', teams: '8–32 parejas', img: '/assets/court-dark.svg' },
  { k: 'liga', name: 'Liga Regular', desc: 'Temporada larga con ascensos y descensos.', when: '8–24 semanas', teams: '6–48 equipos', img: '/assets/court-card.svg' },
  { k: 'directa', name: 'Eliminatoria Directa', desc: 'Cuadro clásico. Pierdes y vuelas. Con consolación.', when: '1–3 días', teams: '8–128 parejas', img: '/assets/court-green.svg' },
  { k: 'equipos', name: 'Por Equipos', desc: 'Club contra club. Liguilla por puntos colectivos.', when: 'Multi-jornada', teams: '4–24 clubes', img: '/assets/court-dark.svg' },
];

const liveMatches = [
  { tournament: 'Open Buenos Aires 2026', t1: 'Martínez / Pérez', t2: 'García / López', s1: [6, 4, 3], s2: [3, 6, 5], court: 'Court Center' },
  { tournament: 'Liga Andina Otoño', t1: 'Silva / Cruz', t2: 'Vargas / Romero', s1: [6, 6], s2: [2, 4], court: 'Court 4' },
  { tournament: 'Open Buenos Aires 2026', t1: 'Hernández / Díaz', t2: 'Ramírez / Torres', s1: [4, 6, 6], s2: [6, 3, 4], court: 'Court 2' },
];

const topPlayers = [
  { pos: 1, name: 'Diego García',         country: '🇦🇷', countryName: 'Argentina', club: 'Club Atlético Padel', level: 'Profesional', wins: 38, losses: 4,  points: 2400 },
  { pos: 2, name: 'Mateo Martínez',        country: '🇲🇽', countryName: 'México',    club: 'Padel Pro Center',   level: 'Profesional', wins: 35, losses: 6,  points: 2344 },
  { pos: 3, name: 'Sofía Rodríguez',       country: '🇨🇴', countryName: 'Colombia',  club: 'Pádel Caribe',       level: 'Federado',    wins: 32, losses: 7,  points: 2288 },
  { pos: 4, name: 'Lucas González',        country: '🇨🇱', countryName: 'Chile',     club: 'Andes Padel',        level: 'Federado',    wins: 30, losses: 9,  points: 2232 },
  { pos: 5, name: 'Valentina Hernández',   country: '🇧🇷', countryName: 'Brasil',    club: 'Cancha 7',           level: 'Avanzado',    wins: 28, losses: 10, points: 2176 },
  { pos: 6, name: 'Tomás López',           country: '🇪🇸', countryName: 'España',    club: 'Norte Sport',        level: 'Federado',    wins: 27, losses: 11, points: 2120 },
  { pos: 7, name: 'Camila Pérez',          country: '🇦🇷', countryName: 'Argentina', club: 'Madero Club',        level: 'Avanzado',    wins: 26, losses: 12, points: 2064 },
  { pos: 8, name: 'Joaquín Sánchez',       country: '🇲🇽', countryName: 'México',    club: 'Vertical Club',      level: 'Avanzado',    wins: 24, losses: 13, points: 2008 },
  { pos: 9, name: 'Ana Betancourt',        country: '🇨🇴', countryName: 'Colombia',  club: 'Padel Norte',        level: 'Federado',    wins: 23, losses: 12, points: 1960 },
  { pos: 10, name: 'Bruno Alves',          country: '🇧🇷', countryName: 'Brasil',    club: 'Sport Club RS',      level: 'Avanzado',    wins: 22, losses: 13, points: 1910 },
  { pos: 11, name: 'Renata Fuentes',       country: '🇨🇱', countryName: 'Chile',     club: 'Cordillera Padel',   level: 'Avanzado',    wins: 20, losses: 14, points: 1855 },
  { pos: 12, name: 'Pablo Fernández',      country: '🇦🇷', countryName: 'Argentina', club: 'Buenos Aires Padel', level: 'Federado',    wins: 19, losses: 15, points: 1800 },
];

const marqueeItems = ['CREA', 'JUEGA', 'RANKEA', 'TORNEOS', 'LIGAS', 'CLUBES', 'AUTOMATIZA', 'GANA'];

const flags: Record<string, string> = { ES: '🇪🇸', AR: '🇦🇷', BR: '🇧🇷', CO: '🇨🇴', UY: '🇺🇾', MX: '🇲🇽', CL: '🇨🇱' };

export default function HomePage() {
  const [rankTab, setRankTab] = useState<'latam' | 'country'>('latam');
  const [players, setPlayers] = useState(topPlayers);
  const [matches, setMatches] = useState(liveMatches);
  const [selectedCountry, setSelectedCountry] = useState(topPlayers[0].countryName);
  const [heroStats, setHeroStats] = useState([
    { n: '12,400+', l: 'Jugadores' },
    { n: '380',     l: 'Clubes' },
    { n: '47',      l: 'Ligas Activas' },
  ]);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json() as Promise<{ players: { value: string }; clubs: { value: string }; leagues: { value: string } }>)
      .then(data => {
        if (data.players && data.clubs && data.leagues) {
          setHeroStats([
            { n: data.players.value, l: 'Jugadores' },
            { n: data.clubs.value,   l: 'Clubes' },
            { n: data.leagues.value, l: 'Ligas Activas' },
          ]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    getSAPlayersFromSupabase().then(sb => {
      if (sb && sb.length > 0) {
        const active = sb.filter(p => p.status === 'active');
        active.sort((a, b) => (b.rankingPoints ?? 0) - (a.rankingPoints ?? 0));
        setPlayers(active.slice(0, 9).map((p, i) => ({
          pos: i + 1,
          name: p.name,
          country: flags[p.country] ?? p.country,
          countryName: p.country,
          club: p.city ?? '',
          level: p.level ?? '',
          wins: 0,
          losses: 0,
          points: p.rankingPoints ?? 0,
        })));
      }
    });
  }, []);

  useEffect(() => {
    getSATournamentsFromSupabase().then(sb => {
      if (sb && sb.length > 0) {
        const active = sb.filter(t => t.status === 'ongoing');
        if (active.length > 0) {
          setMatches(active.map(t => ({
            tournament: t.name,
            t1: '–',
            t2: '–',
            s1: [] as number[],
            s2: [] as number[],
            court: t.club,
          })));
        }
      }
    });
  }, []);

  const countries = [...new Set(players.map(p => p.countryName))];

  const visiblePlayers = rankTab === 'latam'
    ? players.slice(0, 8)
    : players.filter(p => p.countryName === selectedCountry).slice(0, 10);

  return (
    <div>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-scrim" />
        <div className="hero-content">
          <div className="hero-eyebrow">Plataforma de gestión · LATAM</div>
          <h1 className="hero-headline">
            CREA. <span className="accent">JUEGA.</span> RANKEA.
          </h1>
          <p className="hero-sub">
            La plataforma para crear y gestionar torneos, ligas y clubes de pádel.
            Diseñada para Latinoamérica. Construida para ganar.
          </p>
          <div className="hero-cta-row">
            <Link href="/signup" className="btn btn-on-dark btn-lg">Empieza Gratis</Link>
            <Link href="/tournaments" className="btn btn-outline-dark btn-lg">Ver Formatos</Link>
          </div>
        </div>
        <div className="hero-stats">
          {heroStats.map((s) => (
            <div key={s.l}>
              <div className="hero-stat-num">{s.n}</div>
              <div className="hero-stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="marquee">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="marquee-item">{item}</span>
          ))}
        </div>
      </div>

      {/* ── FORMAT GRID ── */}
      <section style={{ padding: 'clamp(64px, 8vw, 120px) clamp(20px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 1760, margin: '0 auto' }}>
          <div className="section-header-row">
            <div>
              <div className="section-eyebrow">Formatos</div>
              <h2 className="section-title">TODO FORMATO.<br />UN SOLO LUGAR.</h2>
              <p className="section-sub">
                Desde Americano de una tarde hasta Champions League con grupos y eliminatorias.
                PadelMGT automatiza el cuadro, los puntos y la difusión.
              </p>
            </div>
            <Link href="/tournaments" className="btn btn-secondary">Ver Todo →</Link>
          </div>

          <div className="grid-3">
            {formats.map((f, i) => (
              <Link
                key={f.k}
                href={`/tournaments/${f.k}`}
                className="card-image"
                style={{ height: 'clamp(260px, 30vw, 420px)', display: 'block', cursor: 'pointer', textDecoration: 'none', borderRadius: 0 }}
              >
                <img src={f.img} alt={f.name} style={{ opacity: 0.82 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 25%, rgba(0,0,0,0.88) 100%)' }} />
                <div style={{ position: 'absolute', top: 22, left: 22, color: '#fff' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.2em', fontWeight: 600, opacity: 0.6 }}>0{i + 1} / 06</div>
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 2.5vw, 34px)', fontWeight: 600, textTransform: 'uppercase', lineHeight: 0.95, letterSpacing: '-0.015em', color: '#fff', marginBottom: 8 }}>
                    {f.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 14, maxWidth: 300 }}>{f.desc}</div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                    <span>{f.when}</span><span>·</span><span>{f.teams}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TORNEO PERSONALIZADO BANNER ── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#0a0a0a', color: '#fff', padding: 'clamp(64px, 8vw, 100px) clamp(20px, 4vw, 48px)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/assets/court-dark.svg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.12 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0.9) 100%)' }} />
        <div style={{ position: 'relative', maxWidth: 1760, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <span style={{ background: 'var(--neon)', color: 'var(--black)', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', padding: '4px 12px', textTransform: 'uppercase' }}>NUEVO</span>
            <span style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase' }}>Torneo Personalizado</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 'clamp(40px, 6vw, 80px)', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 6.5vw, 96px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.025em', lineHeight: 0.92, margin: '0 0 28px', color: '#fff' }}>
                TU TORNEO.<br /><span style={{ color: 'var(--neon)' }}>TUS REGLAS.</span>
              </h2>
              <p style={{ fontSize: 'clamp(14px, 1.4vw, 17px)', color: 'rgba(255,255,255,0.68)', maxWidth: 540, lineHeight: 1.7, margin: '0 0 36px' }}>
                Diseña torneos a medida: define grupos, cuadro eliminatorio y categorías propias. Invita jugadores por link de inscripción. Todo automatizado — sin hojas de cálculo.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/signup" className="btn btn-on-dark btn-lg">Crear mi Torneo →</Link>
                <Link href="/tournaments" className="btn btn-outline-dark btn-lg">Ver formatos</Link>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '32px 40px', minWidth: 280, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', marginBottom: 24 }}>Precio por torneo</div>
              {[
                { label: 'Hasta 8 equipos', price: '$9' },
                { label: 'Hasta 16 equipos', price: '$19' },
                { label: 'Hasta 32 equipos', price: '$29' },
                { label: 'Más de 32 equipos', price: '$49' },
              ].map((tier, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none', gap: 24 }}>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap' }}>{tier.label}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: '#fff' }}>{tier.price}</span>
                </div>
              ))}
              <div style={{ marginTop: 22, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', letterSpacing: '0.06em' }}>Pago único · Sin suscripción</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE MATCHES ── */}
      <section style={{ background: '#111', color: '#fff', padding: 'clamp(64px, 8vw, 120px) clamp(20px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 1760, margin: '0 auto' }}>
          <div className="section-header-row">
            <div>
              <div className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ee0005', display: 'inline-block', animation: 'pulse 1.4s infinite' }} />
                  En Vivo Ahora
                </span>
              </div>
              <h2 className="section-title" style={{ color: '#fff' }}>JUEGOS ACTUALES</h2>
              <p className="section-sub" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Resultados en tiempo real desde clubes de toda la región.
              </p>
            </div>
            <Link href="/live-scores" className="btn btn-outline-dark">Ver todos →</Link>
          </div>

          <div className="grid-3-live">
            {matches.map((m, i) => (
              <div key={i} style={{ background: '#1f1f21', padding: 24, border: '1px solid #28282a', borderRadius: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <span className="badge badge-live">LIVE</span>
                  <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{m.court}</span>
                </div>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 16, fontWeight: 600 }}>{m.tournament}</div>
                {[[m.t1, m.s1], [m.t2, m.s2]].map(([name, scores], j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: j > 0 ? '1px solid #28282a' : 'none' }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{name as string}</span>
                    <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600 }}>
                      {(scores as number[]).map((s: number, k: number) => (
                        <span key={k} style={{ color: s > ((j === 0 ? m.s2 : m.s1) as number[])[k] ? '#fff' : 'rgba(255,255,255,0.35)', minWidth: 20, textAlign: 'center' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RANKING TEASER ── */}
      <section style={{ padding: 'clamp(64px, 8vw, 120px) clamp(20px, 4vw, 48px)', background: '#fafafa' }}>
        <div style={{ maxWidth: 1760, margin: '0 auto' }}>
          <div className="section-header-row">
            <div>
              <div className="section-eyebrow">Ranking</div>
              <h2 className="section-title">EL TOP DE LATAM</h2>
              <p className="section-sub">Global, por liga, por club o por tu propio grupo.</p>
            </div>
            <Link href="/ranking" className="btn btn-secondary">Ver Todo →</Link>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setRankTab('latam')}
              style={{
                padding: '8px 20px', border: '2px solid', cursor: 'pointer', fontSize: 12,
                fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                background: rankTab === 'latam' ? 'var(--black)' : 'transparent',
                borderColor: rankTab === 'latam' ? 'var(--black)' : 'var(--grey-300)',
                color: rankTab === 'latam' ? '#fff' : 'var(--grey-500)',
              }}
            >
              LATAM
            </button>
            <button
              onClick={() => setRankTab('country')}
              style={{
                padding: '8px 20px', border: '2px solid', cursor: 'pointer', fontSize: 12,
                fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                background: rankTab === 'country' ? 'var(--black)' : 'transparent',
                borderColor: rankTab === 'country' ? 'var(--black)' : 'var(--grey-300)',
                color: rankTab === 'country' ? '#fff' : 'var(--grey-500)',
              }}
            >
              Por País
            </button>
            {rankTab === 'country' && (
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="field"
                style={{ margin: 0, padding: '8px 14px', borderRadius: 0, fontSize: 13, minWidth: 160 }}
              >
                {countries.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e5e5' }}>
            {visiblePlayers.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
                No hay jugadores registrados de {selectedCountry} todavía.
              </div>
            ) : (
              <table className="rank-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 32, width: 60 }}>#</th>
                    <th>Jugador</th>
                    <th>País</th>
                    <th>Club</th>
                    <th>Nivel</th>
                    <th style={{ textAlign: 'right' }}>V/D</th>
                    <th style={{ textAlign: 'right', paddingRight: 32 }}>Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlayers.map((p, i) => (
                    <tr key={p.pos}>
                      <td style={{ paddingLeft: 32, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>
                        {rankTab === 'country' ? i + 1 : p.pos}
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td><span style={{ fontSize: 18 }}>{p.country}</span></td>
                      <td style={{ color: 'var(--grey-500)', fontSize: 13 }}>{p.club}</td>
                      <td><span className="chip" style={{ padding: '4px 10px', fontSize: 10 }}>{p.level}</span></td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--grey-500)' }}>{p.wins}/{p.losses}</td>
                      <td style={{ textAlign: 'right', paddingRight: 32, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>{p.points.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', padding: '160px 48px', background: '#111', color: '#fff', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/assets/court-card.svg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.22 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(17,17,17,0.4), rgba(17,17,17,0.96))' }} />
        <div style={{ position: 'relative', maxWidth: 1440, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(52px, 9vw, 140px)', lineHeight: 0.9, textTransform: 'uppercase', letterSpacing: '-0.025em', margin: '0 0 24px', color: '#fff' }}>
            TU CANCHA.<br />TU LIGA.<br /><span style={{ color: 'var(--neon)' }}>TU MARCA.</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.78)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.55 }}>
            Crea tu primer torneo en menos de 60 segundos.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn btn-on-dark btn-lg">Empieza Gratis</Link>
            <Link href="/pricing" className="btn btn-outline-dark btn-lg">Ver Planes</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
