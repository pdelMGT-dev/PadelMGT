import Link from 'next/link';

const stats = [
  { label: 'Miembros', value: '127', delta: '+4 este mes' },
  { label: 'Canchas', value: '8', delta: '78% ocupación' },
  { label: 'Torneos activos', value: '3', delta: '1 en vivo ahora' },
  { label: 'Ingresos (mes)', value: '$4,280', delta: '+12% vs anterior' },
];

const activeTournaments = [
  { name: 'Liga Club Interna', format: 'Round Robin', round: 'Jornada 4/8', players: 8, status: 'live' },
  { name: 'Americano de Mayo', format: 'Americano', round: 'Ronda 2', players: 12, status: 'live' },
  { name: 'Open Knockout Junio', format: 'Knockout', round: 'Inscripciones', players: 6, status: 'upcoming' },
];

const recentMembers = [
  { name: 'Valentina Cruz', level: 'Intermedio', joined: 'Hoy', status: 'active' },
  { name: 'Roberto Paz', level: 'Principiante', joined: 'Ayer', status: 'active' },
  { name: 'Camila Ortiz', level: 'Avanzado', joined: 'Hace 3 días', status: 'active' },
  { name: 'Santiago Mora', level: 'Intermedio', joined: 'Hace 5 días', status: 'pending' },
];

const courts = [
  { name: 'C1', status: 'occupied', until: '21:30' },
  { name: 'C2', status: 'free', until: null },
  { name: 'C3', status: 'occupied', until: '22:00' },
  { name: 'C4', status: 'free', until: null },
  { name: 'C5', status: 'maintenance', until: null },
  { name: 'C6', status: 'occupied', until: '20:30' },
  { name: 'C7', status: 'free', until: null },
  { name: 'C8', status: 'occupied', until: '21:00' },
];

export default function ClubDashboardPage() {
  const freeCourts = courts.filter(c => c.status === 'free').length;

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Panel de control</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.95, margin: 0 }}>
            CLUB<br /><span style={{ color: 'var(--court-blue)' }}>LA CANTERA</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard/club/tournaments" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Crear Torneo</Link>
          <Link href="/dashboard/club/members" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>+ Agregar Miembro</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '28px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, margin: '6px 0 4px' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: s.delta.includes('+') ? 'var(--turf-green)' : 'var(--grey-400)' }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Active tournaments */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Torneos Activos</div>
            <Link href="/dashboard/club/tournaments" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
            {activeTournaments.map((t, i) => (
              <div key={i} style={{ background: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    {t.status === 'live' ? <span className="badge badge-live">LIVE</span> : <span className="badge badge-soon">Próximo</span>}
                    <span className="chip" style={{ fontSize: 10 }}>{t.format}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>{t.round} · {t.players} jugadores</div>
                </div>
                <Link href="/dashboard/club/tournaments" className="btn btn-secondary btn-sm" style={{ borderRadius: 0, flexShrink: 0 }}>Gestionar</Link>
              </div>
            ))}
          </div>
        </div>

        {/* Court availability */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>
              Canchas — {freeCourts} libres / {courts.length}
            </div>
            <Link href="/dashboard/club/courts" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver detalle →</Link>
          </div>
          <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {courts.map((c, i) => (
              <div key={i} style={{ padding: '14px 8px', textAlign: 'center', background: c.status === 'occupied' ? 'var(--black)' : c.status === 'maintenance' ? 'var(--grey-100)' : 'rgba(30,170,82,0.08)', border: `1px solid ${c.status === 'occupied' ? 'var(--black)' : c.status === 'maintenance' ? 'var(--grey-200)' : 'rgba(30,170,82,0.3)'}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: c.status === 'occupied' ? '#fff' : c.status === 'maintenance' ? 'var(--grey-400)' : 'var(--turf-green)' }}>{c.name}</div>
                <div style={{ fontSize: 9, color: c.status === 'occupied' ? 'rgba(255,255,255,0.5)' : 'var(--grey-400)', marginTop: 3 }}>
                  {c.status === 'occupied' ? `→${c.until}` : c.status === 'maintenance' ? 'Mant.' : 'Libre'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent members */}
      <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Miembros Recientes</div>
          <Link href="/dashboard/club/members" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
        </div>
        <table className="rank-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>Miembro</th>
              <th>Nivel</th>
              <th>Ingresó</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recentMembers.map((m, i) => (
              <tr key={i}>
                <td style={{ paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, background: 'var(--grey-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {m.name.split(' ').map((w: string) => w[0]).join('')}
                    </div>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{m.name}</span>
                  </div>
                </td>
                <td><span className="chip" style={{ fontSize: 10 }}>{m.level}</span></td>
                <td style={{ fontSize: 13, color: 'var(--grey-400)' }}>{m.joined}</td>
                <td>
                  {m.status === 'active'
                    ? <span className="badge" style={{ background: 'rgba(30,170,82,0.1)', color: 'var(--turf-green)', border: 'none' }}>Activo</span>
                    : <span className="badge" style={{ background: 'rgba(245,166,35,0.1)', color: '#f5a623', border: 'none' }}>Pendiente</span>
                  }
                </td>
                <td><button className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
