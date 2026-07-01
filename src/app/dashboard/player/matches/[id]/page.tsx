'use client';

import Link from 'next/link';
import { use } from 'react';

const matchesData: Record<string, {
  id: string;
  date: string;
  time: string;
  tournament: string;
  round: string;
  court: string;
  club: string;
  city: string;
  partner: string;
  opp1: string;
  opp2: string;
  sets: { a: number; b: number }[];
  result: 'V' | 'D';
  pts: string;
  stats: {
    winners: number;
    errors: number;
    aces: number;
    smashes: number;
    winRate: number;
  };
}> = {
  '1': {
    id: '1',
    date: '11 May 2026', time: '10:30',
    tournament: 'Americano Barrio Norte', round: 'R4',
    court: 'Cancha 1', club: 'Club Barrio Norte', city: 'Buenos Aires',
    partner: 'Ana Rodríguez', opp1: 'Carlos Vargas', opp2: 'Sofía López',
    sets: [{ a: 24, b: 18 }], result: 'V', pts: '+15',
    stats: { winners: 18, errors: 7, aces: 3, smashes: 5, winRate: 75 },
  },
  '2': {
    id: '2',
    date: '11 May 2026', time: '11:30',
    tournament: 'Americano Barrio Norte', round: 'R3',
    court: 'Cancha 2', club: 'Club Barrio Norte', city: 'Buenos Aires',
    partner: 'Ana Rodríguez', opp1: 'Diego Fernández', opp2: 'Laura Torres',
    sets: [{ a: 21, b: 19 }], result: 'V', pts: '+12',
    stats: { winners: 22, errors: 10, aces: 2, smashes: 6, winRate: 72 },
  },
  '3': {
    id: '3',
    date: '11 May 2026', time: '09:30',
    tournament: 'Americano Barrio Norte', round: 'R2',
    court: 'Cancha 3', club: 'Club Barrio Norte', city: 'Buenos Aires',
    partner: 'Marcos Herrera', opp1: 'Pedro Morales', opp2: 'Lucía Reyes',
    sets: [{ a: 17, b: 23 }], result: 'D', pts: '+0',
    stats: { winners: 14, errors: 16, aces: 1, smashes: 3, winRate: 43 },
  },
  '4': {
    id: '4',
    date: '08 May 2026', time: '19:00',
    tournament: 'Liga Premier LATAM', round: 'J8',
    court: 'Cancha Central', club: 'Sede Central', city: 'Buenos Aires',
    partner: 'Ana Rodríguez', opp1: 'Pedro Morales', opp2: 'Laura Torres',
    sets: [{ a: 6, b: 4 }, { a: 3, b: 6 }, { a: 5, b: 7 }], result: 'D', pts: '+0',
    stats: { winners: 31, errors: 22, aces: 4, smashes: 8, winRate: 48 },
  },
  '5': {
    id: '5',
    date: '04 May 2026', time: '17:00',
    tournament: 'Open Knockout Mayo', round: 'Final',
    court: 'Cancha 1', club: 'Padel Arena', city: 'Rosario',
    partner: 'Marcos Herrera', opp1: 'Diego Fernández', opp2: 'Isabel Bravo',
    sets: [{ a: 6, b: 3 }, { a: 6, b: 4 }], result: 'V', pts: '+40',
    stats: { winners: 28, errors: 9, aces: 5, smashes: 10, winRate: 82 },
  },
  '6': {
    id: '6',
    date: '04 May 2026', time: '15:00',
    tournament: 'Open Knockout Mayo', round: 'Semifinal',
    court: 'Cancha 2', club: 'Padel Arena', city: 'Rosario',
    partner: 'Marcos Herrera', opp1: 'Juan Castro', opp2: 'Elena Vidal',
    sets: [{ a: 7, b: 5 }, { a: 6, b: 3 }], result: 'V', pts: '+20',
    stats: { winners: 24, errors: 11, aces: 3, smashes: 7, winRate: 78 },
  },
  '7': {
    id: '7',
    date: '04 May 2026', time: '12:00',
    tournament: 'Open Knockout Mayo', round: 'Cuartos de Final',
    court: 'Cancha 3', club: 'Padel Arena', city: 'Rosario',
    partner: 'Marcos Herrera', opp1: 'Raúl Ortega', opp2: 'Marta Fuentes',
    sets: [{ a: 6, b: 2 }, { a: 6, b: 1 }], result: 'V', pts: '+10',
    stats: { winners: 20, errors: 5, aces: 6, smashes: 9, winRate: 90 },
  },
  '8': {
    id: '8',
    date: '27 Apr 2026', time: '18:00',
    tournament: 'Mexicano Express', round: 'R5',
    court: 'Cancha 4', club: 'Club Deportivo Sur', city: 'Buenos Aires',
    partner: 'Carlos Vargas', opp1: 'Ana Rodríguez', opp2: 'Sofía López',
    sets: [{ a: 20, b: 16 }], result: 'V', pts: '+10',
    stats: { winners: 19, errors: 8, aces: 2, smashes: 4, winRate: 70 },
  },
};

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const match = matchesData[id];

  if (!match) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Juego no encontrado.</p>
        <Link href="/dashboard/player/matches" className="btn btn-secondary" style={{ borderRadius: 0 }}>← Volver</Link>
      </div>
    );
  }

  const myTotal = match.sets.reduce((s, x) => s + x.a, 0);
  const oppTotal = match.sets.reduce((s, x) => s + x.b, 0);

  return (
    <div style={{ padding: '40px 40px 80px', maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 12, color: 'var(--grey-400)' }}>
        <Link href="/dashboard/player/matches" style={{ color: 'var(--grey-400)', textDecoration: 'none' }}>Mis Juegos</Link>
        <span>›</span>
        <span>{match.tournament} – {match.round}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
            Detalle del juego
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            {match.tournament}
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="chip" style={{ fontSize: 10 }}>{match.round}</span>
            <span className="chip" style={{ fontSize: 10 }}>{match.court}</span>
            <span className="chip" style={{ fontSize: 10 }}>{match.date} · {match.time}</span>
          </div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 56, height: 56, borderRadius: '50%',
          background: match.result === 'V' ? 'var(--turf-green)' : '#ee0005',
          color: '#fff', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
        }}>
          {match.result === 'V' ? 'V' : 'D'}
        </span>
      </div>

      {/* Scoreboard */}
      <div style={{ background: 'var(--grey-900)', color: '#fff', padding: '28px 32px', marginBottom: 24 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 20 }}>
          Marcador
        </div>

        {/* Teams row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
          {/* My team */}
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mi pareja</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: match.result === 'V' ? 'var(--bs-light)' : '#fff', marginBottom: 2 }}>Diego García</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>{match.partner}</div>
          </div>

          {/* Score */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              {match.sets.map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, lineHeight: 1, color: s.a > s.b ? 'var(--bs-light)' : 'rgba(255,255,255,0.4)' }}>{s.a}</div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, lineHeight: 1, color: s.b > s.a ? '#ff6b6b' : 'rgba(255,255,255,0.4)' }}>{s.b}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
              Total: {myTotal} – {oppTotal}
            </div>
          </div>

          {/* Rivals */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rivales</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: match.result === 'D' ? '#ff6b6b' : 'rgba(255,255,255,0.7)', marginBottom: 2 }}>{match.opp1}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'rgba(255,255,255,0.55)' }}>{match.opp2}</div>
          </div>
        </div>

        {/* Points row */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Puntos obtenidos</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: match.pts !== '+0' ? 'var(--bs-light)' : 'var(--grey-400)' }}>{match.pts}</span>
        </div>
      </div>

      {/* Two columns: context + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Context */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 16 }}>Contexto del partido</div>
          {[
            { label: 'Torneo', value: match.tournament },
            { label: 'Ronda', value: match.round },
            { label: 'Club', value: match.club },
            { label: 'Ciudad', value: match.city },
            { label: 'Cancha', value: match.court },
            { label: 'Fecha', value: match.date },
            { label: 'Hora', value: match.time },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--grey-100)' }}>
              <span style={{ fontSize: 11, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 16 }}>Estadísticas personales</div>

          {/* Win rate bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>% Puntos ganados</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{match.stats.winRate}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--grey-100)' }}>
              <div style={{ height: '100%', width: `${match.stats.winRate}%`, background: match.result === 'V' ? 'var(--turf-green)' : '#ee0005' }} />
            </div>
          </div>

          {[
            { label: 'Winners', value: match.stats.winners },
            { label: 'Errores no forzados', value: match.stats.errors },
            { label: 'Saques directos', value: match.stats.aces },
            { label: 'Remates (smash)', value: match.stats.smashes },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--grey-100)' }}>
              <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>{stat.label}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/dashboard/player/matches" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>← Volver a Mis Juegos</Link>
      </div>
    </div>
  );
}
