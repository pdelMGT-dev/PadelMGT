import Link from 'next/link';

const weeklyPts = [80, 120, 90, 200, 150, 120, 0];
const weekLabels = ['28 Abr', '5 May', '10 May', '11 May', '17 May', '25 May', '28 May'];
const maxPts = Math.max(...weeklyPts);

const nearby = [
  { pos: 44, name: 'Lucas Pereyra', pts: 1920, delta: 0 },
  { pos: 45, name: 'Nicolás Cabrera', pts: 1900, delta: -2 },
  { pos: 46, name: 'Tomás Acuña', pts: 1880, delta: 1 },
  { pos: 47, name: 'Diego García', pts: 1840, delta: 4, isMe: true },
  { pos: 48, name: 'Andrés Salinas', pts: 1800, delta: -1 },
  { pos: 49, name: 'Felipe Castro', pts: 1760, delta: 2 },
  { pos: 50, name: 'Rodrigo Méndez', pts: 1720, delta: 0 },
];

const breakdown = [
  { format: 'Americano', pts: 480, tournaments: 8 },
  { format: 'Mexicano', pts: 360, tournaments: 6 },
  { format: 'Knockout', pts: 620, tournaments: 5 },
  { format: 'Round Robin', pts: 240, tournaments: 4 },
  { format: 'Swiss', pts: 140, tournaments: 1 },
];

export default function PlayerRankingPage() {
  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Posición actual</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MI RANKING</h1>
      </div>

      {/* Big ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        <div style={{ background: 'var(--black)', padding: '40px 36px', gridColumn: 'span 1' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 8 }}>Ranking General</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 96, fontWeight: 600, letterSpacing: '-0.05em', color: '#fff', lineHeight: 0.85, marginBottom: 12 }}>#47</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--turf-green)', fontWeight: 700 }}>▲ 4 posiciones</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>esta semana</span>
          </div>
        </div>
        {[
          { label: 'Puntos totales', value: '1,840', sub: '+120 esta semana' },
          { label: 'Próxima posición', value: '#46', sub: '40 pts para Tomás Acuña' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '40px 32px' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--black)', lineHeight: 0.9, marginBottom: 12 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        {/* Main */}
        <div>
          {/* Points chart */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)', marginBottom: 20 }}>Puntos por torneo — Mayo 2026</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {weeklyPts.map((pts, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: pts > 0 ? 'var(--black)' : 'var(--grey-300)' }}>{pts > 0 ? pts : ''}</div>
                  <div style={{ width: '100%', background: pts > 0 ? 'var(--black)' : 'var(--grey-100)', height: `${Math.max((pts / maxPts) * 80, pts > 0 ? 8 : 4)}px`, transition: 'height 0.3s' }} />
                  <div style={{ fontSize: 10, color: 'var(--grey-400)', whiteSpace: 'nowrap' }}>{weekLabels[i]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Nearby ranking */}
          <div style={{ border: '1px solid var(--grey-200)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>
              Ranking cercano
            </div>
            <table className="rank-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Pos.</th>
                  <th>Jugador</th>
                  <th style={{ textAlign: 'right', paddingRight: 24 }}>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {nearby.map((p) => (
                  <tr key={p.pos} style={{ background: p.isMe ? 'rgba(214,255,0,0.06)' : '#fff' }}>
                    <td style={{ paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: p.isMe ? 'var(--black)' : 'var(--grey-400)' }}>#{p.pos}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: p.delta > 0 ? 'var(--turf-green)' : p.delta < 0 ? '#ee0005' : 'var(--grey-300)' }}>
                          {p.delta > 0 ? `▲${p.delta}` : p.delta < 0 ? `▼${Math.abs(p.delta)}` : '–'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: p.isMe ? 700 : 500, fontSize: 14, color: p.isMe ? 'var(--black)' : 'inherit' }}>
                      {p.name} {p.isMe && <span className="chip" style={{ fontSize: 9, marginLeft: 6 }}>Tú</span>}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 24, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{p.pts.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--grey-200)', textAlign: 'center' }}>
              <Link href="/ranking" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver ranking completo →</Link>
            </div>
          </div>
        </div>

        {/* Sidebar: breakdown by format */}
        <div>
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)', marginBottom: 20 }}>Puntos por Formato</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {breakdown.map((b) => (
                <div key={b.format}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{b.format}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{b.pts} pts</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--grey-100)' }}>
                    <div style={{ height: '100%', background: 'var(--black)', width: `${(b.pts / 620) * 100}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 4 }}>{b.tournaments} torneos</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--black)', padding: '28px 24px', marginTop: 2 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 10 }}>Para subir al #40</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: '#fff', lineHeight: 1, marginBottom: 6 }}>+340</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>puntos necesarios · ≈ 3 torneos</div>
            <Link href="/dashboard/player/calendar" className="btn btn-sm" style={{ background: 'var(--neon)', color: 'var(--black)', borderRadius: 0, fontWeight: 700, display: 'block', textAlign: 'center' }}>
              Ver próximos torneos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
