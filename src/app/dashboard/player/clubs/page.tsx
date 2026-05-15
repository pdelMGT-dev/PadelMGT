'use client';

import Link from 'next/link';

const myClubs = [
  {
    id: '1', name: 'Club Barrio Norte', city: 'Buenos Aires', country: 'Argentina',
    courts: 6, members: 148, role: 'Miembro', since: 'Mar 2024',
    upcomingTournaments: 2, myRanking: 12,
  },
  {
    id: '2', name: 'Padel Arena', city: 'Buenos Aires', country: 'Argentina',
    courts: 10, members: 312, role: 'Miembro', since: 'Jun 2024',
    upcomingTournaments: 1, myRanking: 8,
  },
  {
    id: '3', name: 'Liga Premier LATAM', city: 'Buenos Aires', country: 'Argentina',
    courts: 0, members: 64, role: 'Liga', since: 'Ene 2026',
    upcomingTournaments: 4, myRanking: 3,
  },
];

export default function PlayerClubsPage() {
  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Membresías activas</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MIS CLUBES</h1>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 40 }}>
        {[
          { label: 'Clubes / Ligas', value: String(myClubs.length) },
          { label: 'Torneos próximos', value: String(myClubs.reduce((s, c) => s + c.upcomingTournaments, 0)) },
          { label: 'Mejor ranking en club', value: '#3' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Club cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {myClubs.map((club) => (
          <div key={club.id} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              {/* Left: info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, background: 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {club.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/clubs/${club.id}`} style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', textDecoration: 'none', color: 'var(--black)' }}>{club.name}</Link>
                    <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{club.city}, {club.country}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  <span className="chip" style={{ fontSize: 9 }}>{club.role}</span>
                  <span className="chip" style={{ fontSize: 9 }}>Desde {club.since}</span>
                  {club.courts > 0 && <span className="chip" style={{ fontSize: 9 }}>{club.courts} canchas</span>}
                  <span className="chip" style={{ fontSize: 9 }}>{club.members} miembros</span>
                </div>
              </div>

              {/* Right: stats + actions */}
              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>#{club.myRanking}</div>
                  <div style={{ fontSize: 10, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginTop: 2 }}>Mi ranking</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1, color: club.upcomingTournaments > 0 ? 'var(--turf-green)' : 'var(--grey-300)' }}>
                    {club.upcomingTournaments}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginTop: 2 }}>Torneos próx.</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link href={`/clubs/${club.id}`} className="btn btn-primary btn-sm" style={{ borderRadius: 0, textAlign: 'center' }}>
                    Ver club →
                  </Link>
                  <Link href={`/tournaments?club=${club.id}`} className="btn btn-secondary btn-sm" style={{ borderRadius: 0, textAlign: 'center' }}>
                    Ver torneos
                  </Link>
                  <Link href={`/ranking?club=${club.id}`} style={{ display: 'block', textAlign: 'center', padding: '6px 16px', fontSize: 11, fontWeight: 600, textDecoration: 'none', color: 'var(--grey-500)', border: '1px solid var(--grey-200)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Ranking del club
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, padding: '20px 24px', border: '1px dashed var(--grey-300)', textAlign: 'center', background: 'var(--grey-50)' }}>
        <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 12 }}>¿Querés unirte a otro club o liga?</div>
        <Link href="/clubs" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Buscar clubes y ligas →</Link>
      </div>
    </div>
  );
}
