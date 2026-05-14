import Link from 'next/link';

const stats = [
  { label: 'Clubes afiliados', value: '380', delta: '+12 este mes' },
  { label: 'Jugadores', value: '12,400', delta: '+340 este mes' },
  { label: 'Torneos sancionados', value: '47', delta: '8 pendientes' },
  { label: 'Países', value: '9', delta: 'LATAM + España' },
];

const pendingApprovals = [
  { name: 'Club Deportivo Quito', country: 'Ecuador', type: 'Club', date: 'Hace 2 días', urgent: true },
  { name: 'Open Nacional Paraguay 2026', country: 'Paraguay', type: 'Torneo', date: 'Hace 3 días', urgent: false },
  { name: 'Liga Metropolitana Bogotá', country: 'Colombia', type: 'Liga', date: 'Hace 5 días', urgent: false },
];

const recentActivity = [
  { text: 'Club Padel Lima aprobado como sede oficial', time: 'Hace 1h', type: 'approval' },
  { text: 'Copa Regional Sur 2026 — sancionada', time: 'Hace 3h', type: 'sanction' },
  { text: 'Nuevo club afiliado: Padel Club Asunción', time: 'Ayer', type: 'affiliate' },
  { text: 'Ranking oficial actualizado — Mayo 2026', time: 'Ayer', type: 'ranking' },
  { text: 'Reunión de delegados — 20 Mayo 2026 confirmada', time: 'Hace 2 días', type: 'event' },
];

const byCountry = [
  { country: 'Argentina', flag: '🇦🇷', clubs: 94, players: 3800 },
  { country: 'España', flag: '🇪🇸', clubs: 72, players: 2900 },
  { country: 'México', flag: '🇲🇽', clubs: 58, players: 2200 },
  { country: 'Colombia', flag: '🇨🇴', clubs: 42, players: 1600 },
  { country: 'Chile', flag: '🇨🇱', clubs: 35, players: 1100 },
  { country: 'Brasil', flag: '🇧🇷', clubs: 31, players: 420 },
  { country: 'Uruguay', flag: '🇺🇾', clubs: 22, players: 180 },
  { country: 'Perú', flag: '🇵🇪', clubs: 18, players: 130 },
  { country: 'Paraguay', flag: '🇵🇾', clubs: 8, players: 70 },
];

export default function FederationDashboardPage() {
  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Panel General</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.95, margin: 0 }}>
            FEDERACIÓN<br /><span style={{ color: '#f5a623' }}>ARGENTINA</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard/federation/clubs" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Ver Clubes</Link>
          <Link href="/dashboard/federation/tournaments" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Sancionar Torneo</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '28px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, margin: '6px 0 4px' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: s.delta.includes('+') ? 'var(--turf-green)' : 'var(--grey-400)' }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Pending approvals */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Aprobaciones Pendientes</div>
              <span style={{ background: '#ee0005', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px' }}>{pendingApprovals.length}</span>
            </div>
            <Link href="/dashboard/federation/tournaments" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todas →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
            {pendingApprovals.map((p, i) => (
              <div key={i} style={{ background: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <span className="chip" style={{ fontSize: 10 }}>{p.type}</span>
                    {p.urgent && <span className="chip" style={{ fontSize: 10, background: 'rgba(238,0,5,0.08)', color: '#ee0005', border: '1px solid rgba(238,0,5,0.2)' }}>Urgente</span>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>{p.country} · {p.date}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" style={{ borderRadius: 0, background: 'var(--turf-green)', border: 'none' }}>✓</button>
                  <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Ver</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>
            Actividad Reciente
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentActivity.map((a, i) => (
              <div key={i} style={{ padding: '14px 24px', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--grey-100)' : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.type === 'approval' ? 'var(--turf-green)' : a.type === 'sanction' ? '#f5a623' : a.type === 'ranking' ? 'var(--court-blue)' : 'var(--grey-300)', flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--black)', lineHeight: 1.4 }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 3 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By country */}
      <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Clubes y Jugadores por País</div>
          <Link href="/dashboard/federation/clubs" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
        </div>
        <table className="rank-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>País</th>
              <th style={{ textAlign: 'center' }}>Clubes</th>
              <th style={{ textAlign: 'right', paddingRight: 32 }}>Jugadores</th>
            </tr>
          </thead>
          <tbody>
            {byCountry.map((c) => (
              <tr key={c.country}>
                <td style={{ paddingLeft: 24, fontWeight: 500, fontSize: 14 }}>{c.flag} {c.country}</td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{c.clubs}</td>
                <td style={{ textAlign: 'right', paddingRight: 32, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{c.players.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
