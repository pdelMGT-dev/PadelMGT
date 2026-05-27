'use client';

import Link from 'next/link';
import { use } from 'react';

const PROFILES: Record<string, {
  name: string; city: string; country: string; ranking: number;
  points: number; level: string; joinedYear: string; club: string;
  matches: number; wins: number; tournaments: number;
  recentMatches: { date: string; partner: string; opponents: string; score: string; result: 'W' | 'L'; tournament: string }[];
  bestResult: string; streak: string; favouriteFormat: string;
}> = {
  'ana-rodriguez': {
    name: 'Ana Rodríguez', city: 'Buenos Aires', country: 'Argentina',
    ranking: 52, points: 1740, level: 'Intermedio', joinedYear: '2023', club: 'Club Barrio Norte',
    matches: 38, wins: 24, tournaments: 20,
    recentMatches: [
      { date: '11 May 2026', partner: 'Diego G.', opponents: 'Marcos H. / Carlos V.', score: '6-4', result: 'W', tournament: 'Americano Barrio Norte' },
      { date: '08 May 2026', partner: 'Sofía L.', opponents: 'Laura T. / Diego F.', score: '4-6', result: 'L', tournament: 'Liga Premier LATAM' },
      { date: '04 May 2026', partner: 'Diego G.', opponents: 'Pedro M. / Isabel B.', score: '6-2', result: 'W', tournament: 'Open Knockout Mayo' },
    ],
    bestResult: '1er lugar', streak: '3 victorias', favouriteFormat: 'Americano',
  },
  'carlos-vega': {
    name: 'Carlos Vega', city: 'Buenos Aires', country: 'Argentina',
    ranking: 38, points: 2100, level: 'Avanzado', joinedYear: '2022', club: 'Padel Arena',
    matches: 52, wins: 38, tournaments: 24,
    recentMatches: [
      { date: '08 May 2026', partner: 'Pedro M.', opponents: 'Diego G. / Marcos H.', score: '16-14', result: 'W', tournament: 'Express Nocturno' },
      { date: '04 May 2026', partner: 'Isabel B.', opponents: 'Diego G. / Ana R.',   score: '8-16',  result: 'L', tournament: 'Open Knockout Mayo' },
    ],
    bestResult: '2do lugar', streak: '2 victorias', favouriteFormat: 'Mexicano',
  },
  'marcos-herrera': {
    name: 'Marcos Herrera', city: 'Córdoba', country: 'Argentina',
    ranking: 61, points: 1540, level: 'Avanzado', joinedYear: '2023', club: 'Club La Cantera',
    matches: 32, wins: 18, tournaments: 18,
    recentMatches: [
      { date: '04 May 2026', partner: 'Diego G.', opponents: 'Carlos V. / Pedro M.', score: '6-4', result: 'W', tournament: 'Open Knockout Mayo' },
    ],
    bestResult: '1er lugar', streak: '1 victoria', favouriteFormat: 'Knockout',
  },
  'sofia-lopez': {
    name: 'Sofía López', city: 'Rosario', country: 'Argentina',
    ranking: 29, points: 2480, level: 'Avanzado', joinedYear: '2022', club: 'Club Barrio Norte',
    matches: 60, wins: 44, tournaments: 26,
    recentMatches: [
      { date: '08 May 2026', partner: 'Laura T.', opponents: 'Ana R. / Diego G.', score: '6-4', result: 'W', tournament: 'Liga Premier LATAM' },
    ],
    bestResult: '1er lugar', streak: '4 victorias', favouriteFormat: 'Round Robin',
  },
  'lucia-torres': {
    name: 'Lucía Torres', city: 'Mendoza', country: 'Argentina',
    ranking: 74, points: 1320, level: 'Intermedio', joinedYear: '2024', club: 'Club Deportivo Sur',
    matches: 24, wins: 14, tournaments: 15,
    recentMatches: [
      { date: '20 Abr 2026', partner: 'Ana R.', opponents: 'Sofía L. / Diego G.', score: '10-16', result: 'L', tournament: 'Liga Premier LATAM' },
    ],
    bestResult: '3er lugar', streak: '2 victorias', favouriteFormat: 'Americano',
  },
  'pedro-mendez': {
    name: 'Pedro Méndez', city: 'Buenos Aires', country: 'Argentina',
    ranking: 55, points: 1660, level: 'Intermedio', joinedYear: '2023', club: 'Padel Arena',
    matches: 28, wins: 16, tournaments: 14,
    recentMatches: [],
    bestResult: '2do lugar', streak: '1 victoria', favouriteFormat: 'Americano',
  },
  'valentina-cruz': {
    name: 'Valentina Cruz', city: 'Córdoba', country: 'Argentina',
    ranking: 43, points: 1920, level: 'Avanzado', joinedYear: '2023', club: 'Club La Cantera',
    matches: 41, wins: 28, tournaments: 20,
    recentMatches: [],
    bestResult: '1er lugar', streak: '3 victorias', favouriteFormat: 'Mexicano',
  },
};

const FALLBACK = {
  name: 'Jugador', city: '–', country: '–', ranking: 0, points: 0,
  level: '–', joinedYear: '–', club: '–', matches: 0, wins: 0, tournaments: 0,
  recentMatches: [], bestResult: '–', streak: '–', favouriteFormat: '–',
};

interface Props { params: Promise<{ id: string }> }

export default function PlayerProfilePage({ params }: Props) {
  const { id } = use(params);
  const p = PROFILES[id] ?? FALLBACK;
  const initials = p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const winRate = p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : 0;

  return (
    <div>
      {/* Profile header */}
      <div style={{ background: '#0a0a0a', padding: '56px 48px 48px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginBottom: 24 }}>
            <Link href="/ranking" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Jugadores</Link>
            {' / '}
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{p.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ width: 80, height: 80, background: 'var(--court-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px' }}>{p.name}</h1>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                {p.city}, {p.country} · {p.club}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="chip" style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: 'none' }}>{p.level}</span>
                <span className="chip" style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: 'none' }}>Desde {p.joinedYear}</span>
                <span className="chip" style={{ fontSize: 11, background: 'rgba(214,255,0,0.15)', color: 'var(--neon)', border: 'none' }}>🤝 Amigo</span>
              </div>
            </div>

            {/* Ranking + points */}
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
              <div style={{ padding: '20px 28px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: '#f5a623', lineHeight: 1 }}>#{p.ranking}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginTop: 6 }}>Ranking</div>
              </div>
              <div style={{ padding: '20px 28px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--turf-green)', lineHeight: 1 }}>{p.points.toLocaleString()}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginTop: 6 }}>Puntos</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <section style={{ padding: '48px 48px 96px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 40, alignItems: 'start' }}>

          {/* Main column */}
          <div>
            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 40 }}>
              {[
                { label: 'Juegos', value: String(p.matches) },
                { label: 'Victorias', value: String(p.wins) },
                { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 50 ? 'var(--turf-green)' : 'var(--black)' },
                { label: 'Torneos', value: String(p.tournaments) },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: (s as any).color || 'var(--black)', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent matches */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 16 }}>Juegos Recientes</div>
              {p.recentMatches.length === 0 ? (
                <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '32px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
                  Sin partidos recientes.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
                  {p.recentMatches.map((m, i) => (
                    <div key={i} style={{ background: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#fff', background: m.result === 'W' ? 'var(--turf-green)' : '#ee0005' }}>
                        {m.result}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.tournament}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Con {m.partner} vs {m.opponents}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: m.result === 'W' ? 'var(--turf-green)' : '#ee0005' }}>{m.score}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{m.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Challenge / QR */}
            <div style={{ background: 'var(--black)', padding: '28px', color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 10 }}>Invitar a jugar</div>
              <div style={{ width: 100, height: 100, background: 'rgba(255,255,255,0.08)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>QR</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 1.5 }}>Escaneá para retar a {p.name.split(' ')[0]} a un juego</div>
              <button style={{ width: '100%', padding: '10px', background: 'var(--neon)', color: 'var(--black)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Enviar Desafío
              </button>
            </div>

            {/* Career summary */}
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 16 }}>Resumen de Carrera</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Club',           value: p.club },
                  { label: 'Mejor resultado', value: p.bestResult },
                  { label: 'Racha actual',   value: p.streak },
                  { label: 'Formato favorito', value: p.favouriteFormat },
                  { label: 'Miembro desde',  value: p.joinedYear },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--grey-100)' }}>
                    <span style={{ fontSize: 11, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Back */}
            <Link href="/dashboard/player/friends" style={{ display: 'block', textAlign: 'center', padding: '11px', fontSize: 11, fontWeight: 600, textDecoration: 'none', color: 'var(--grey-500)', border: '1px solid var(--grey-200)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ← Volver a Amistades
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
