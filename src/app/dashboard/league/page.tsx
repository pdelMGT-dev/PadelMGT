import Link from 'next/link';

const stats = [
  { label: 'Equipos', value: '12', delta: 'Temporada 2026' },
  { label: 'Partidos jug.', value: '48', delta: 'de 132 totales' },
  { label: 'Jornada actual', value: '8', delta: 'de 18 jornadas' },
  { label: 'Líder', value: '#1 Madrid', delta: '+4 pts sobre #2' },
];

const topStandings = [
  { pos: 1, team: 'Padel Madrid Central', pj: 8, pg: 7, pp: 1, pts: 21, delta: 0 },
  { pos: 2, team: 'Club Barrio Norte', pj: 8, pg: 6, pp: 2, pts: 18, delta: 1 },
  { pos: 3, team: 'La Cantera FC', pj: 8, pg: 5, pp: 3, pts: 15, delta: -1 },
  { pos: 4, team: 'Club Caribe', pj: 8, pg: 4, pp: 4, pts: 12, delta: 0 },
  { pos: 5, team: 'Padel Arena', pj: 8, pg: 3, pp: 5, pts: 9, delta: 2 },
];

const nextMatches = [
  { date: '15 May · 19:00', home: 'Padel Madrid Central', away: 'Club Barrio Norte', court: 'Cancha Central' },
  { date: '15 May · 20:30', home: 'La Cantera FC', away: 'Club Caribe', court: 'Cancha 2' },
  { date: '16 May · 10:00', home: 'Padel Arena', away: 'Club Social', court: 'Cancha 1' },
];

export default function LeagueDashboardPage() {
  const progress = Math.round((48 / 132) * 100);

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Panel de Liga</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.95, margin: 0 }}>
            LIGA<br /><span style={{ color: 'var(--turf-green)' }}>PREMIER LATAM</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard/league/seasons" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Gestionar Temporada</Link>
          <Link href="/dashboard/league/teams" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Agregar Equipo</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '28px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, margin: '6px 0 4px' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--black)', padding: '24px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 32 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 6 }}>Progreso Temporada 2026</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: '#fff' }}>Jornada 8 de 18</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>01 Feb 2026</span>
            <span style={{ fontSize: 11, color: 'var(--neon)', fontWeight: 600 }}>{progress}% completado</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>30 Jun 2026</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ height: '100%', background: 'var(--neon)', width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Top 5 — Clasificación</div>
            <Link href="/dashboard/league/standings" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver completa →</Link>
          </div>
          <table className="rank-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>#</th>
                <th>Equipo</th>
                <th style={{ textAlign: 'center' }}>PG</th>
                <th style={{ textAlign: 'right', paddingRight: 24 }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {topStandings.map((row) => (
                <tr key={row.pos} style={{ background: row.pos <= 2 ? 'rgba(30,170,82,0.04)' : '#fff' }}>
                  <td style={{ paddingLeft: 24, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: row.pos <= 2 ? 'var(--turf-green)' : 'var(--grey-400)' }}>{row.pos}</td>
                  <td style={{ fontWeight: 500, fontSize: 14 }}>{row.team}</td>
                  <td style={{ textAlign: 'center', fontSize: 13 }}>{row.pg}</td>
                  <td style={{ textAlign: 'right', paddingRight: 24, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>
            Próxima Jornada — J9
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
            {nextMatches.map((m, i) => (
              <div key={i} style={{ background: '#fff', padding: '16px 24px' }}>
                <div style={{ fontSize: 11, color: 'var(--grey-400)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>{m.date} · {m.court}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 14, textAlign: 'right' }}>{m.home}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--grey-300)', fontWeight: 600 }}>VS</div>
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{m.away}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
