const standings = [
  { pos: 1, prev: 1, team: 'Padel Madrid Central', club: 'Madrid', pj: 8, pg: 7, pp: 1, gf: 18, gc: 6, dif: 12, pts: 21 },
  { pos: 2, prev: 3, team: 'Club Barrio Norte', club: 'Buenos Aires', pj: 8, pg: 6, pp: 2, gf: 15, gc: 8, dif: 7, pts: 18 },
  { pos: 3, prev: 2, team: 'La Cantera FC', club: 'Córdoba', pj: 8, pg: 5, pp: 3, gf: 14, gc: 10, dif: 4, pts: 15 },
  { pos: 4, prev: 4, team: 'Club Caribe', club: 'Cartagena', pj: 8, pg: 4, pp: 4, gf: 12, gc: 12, dif: 0, pts: 12 },
  { pos: 5, prev: 7, team: 'Padel Arena', club: 'Rosario', pj: 8, pg: 3, pp: 5, gf: 10, gc: 13, dif: -3, pts: 9 },
  { pos: 6, prev: 5, team: 'Club Social', club: 'Lima', pj: 8, pg: 3, pp: 5, gf: 9, gc: 14, dif: -5, pts: 9 },
  { pos: 7, prev: 6, team: 'Deportivo Norte', club: 'Santiago', pj: 8, pg: 2, pp: 6, gf: 8, gc: 16, dif: -8, pts: 6 },
  { pos: 8, prev: 8, team: 'Padel Central', club: 'Montevideo', pj: 8, pg: 2, pp: 6, gf: 7, gc: 17, dif: -10, pts: 6 },
  { pos: 9, prev: 9, team: 'Club Atlético', club: 'Bogotá', pj: 8, pg: 1, pp: 7, gf: 6, gc: 18, dif: -12, pts: 3 },
  { pos: 10, prev: 10, team: 'Sport Club', club: 'Medellín', pj: 8, pg: 0, pp: 8, gf: 4, gc: 19, dif: -15, pts: 0 },
];

export default function LeagueStandingsPage() {
  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Liga Premier LATAM · 2026</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>TABLA DE POSICIONES</h1>
      </div>

      {/* Zone legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        {[
          { color: 'rgba(30,170,82,0.15)', label: 'Zona de ascenso (Top 2)' },
          { color: 'rgba(238,0,5,0.08)', label: 'Zona de descenso (Últimos 2)' },
        ].map((z) => (
          <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, background: z.color, border: '1px solid rgba(0,0,0,0.08)' }} />
            <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>{z.label}</span>
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid var(--grey-200)' }}>
        <table className="rank-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24, width: 80 }}>Pos.</th>
              <th>Equipo</th>
              <th>Sede</th>
              <th style={{ textAlign: 'center' }}>PJ</th>
              <th style={{ textAlign: 'center' }}>PG</th>
              <th style={{ textAlign: 'center' }}>PP</th>
              <th style={{ textAlign: 'center' }}>GF</th>
              <th style={{ textAlign: 'center' }}>GC</th>
              <th style={{ textAlign: 'center' }}>DIF</th>
              <th style={{ textAlign: 'right', paddingRight: 32 }}>PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const moved = row.prev - row.pos;
              const isPromotion = row.pos <= 2;
              const isRelegation = row.pos >= standings.length - 1;
              return (
                <tr key={row.pos} style={{ background: isPromotion ? 'rgba(30,170,82,0.06)' : isRelegation ? 'rgba(238,0,5,0.04)' : '#fff' }}>
                  <td style={{ paddingLeft: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: isPromotion ? 'var(--turf-green)' : isRelegation ? '#ee0005' : 'var(--grey-400)' }}>{row.pos}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: moved > 0 ? 'var(--turf-green)' : moved < 0 ? '#ee0005' : 'var(--grey-200)' }}>
                        {moved > 0 ? `▲${moved}` : moved < 0 ? `▼${Math.abs(moved)}` : '–'}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 14 }}>{row.team}</td>
                  <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{row.club}</td>
                  <td style={{ textAlign: 'center', fontSize: 13 }}>{row.pj}</td>
                  <td style={{ textAlign: 'center', fontSize: 13, color: 'var(--turf-green)', fontWeight: 600 }}>{row.pg}</td>
                  <td style={{ textAlign: 'center', fontSize: 13, color: '#ee0005', fontWeight: 600 }}>{row.pp}</td>
                  <td style={{ textAlign: 'center', fontSize: 13 }}>{row.gf}</td>
                  <td style={{ textAlign: 'center', fontSize: 13 }}>{row.gc}</td>
                  <td style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: row.dif > 0 ? 'var(--turf-green)' : row.dif < 0 ? '#ee0005' : 'var(--grey-400)' }}>
                    {row.dif > 0 ? `+${row.dif}` : row.dif}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: 32, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>{row.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Promotion / relegation info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--grey-200)', marginTop: 24 }}>
        <div style={{ background: 'rgba(30,170,82,0.06)', padding: '20px 24px', borderLeft: '4px solid var(--turf-green)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', color: 'var(--turf-green)', marginBottom: 4 }}>Ascenso</div>
          <p style={{ fontSize: 13, color: 'var(--grey-500)', margin: 0 }}>Los 2 primeros equipos ascienden a la División Premier para la temporada 2027.</p>
        </div>
        <div style={{ background: 'rgba(238,0,5,0.04)', padding: '20px 24px', borderLeft: '4px solid #ee0005' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', color: '#ee0005', marginBottom: 4 }}>Descenso</div>
          <p style={{ fontSize: 13, color: 'var(--grey-500)', margin: 0 }}>Los 2 últimos equipos descienden a la División B para la temporada 2027.</p>
        </div>
      </div>
    </div>
  );
}
