import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ongoingTournaments } from '@/lib/data';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return ongoingTournaments.map((t) => ({ id: t.id }));
}

const mockMatches = [
  { court: 'Court 1', team1: ['Carlos G.', 'Ana M.'], team2: ['Luis R.', 'Sara P.'], score: '16 - 12', status: 'completed' },
  { court: 'Court 2', team1: ['Pedro J.', 'Maria L.'], team2: ['Juan C.', 'Elena V.'], score: '8 - 6', status: 'live' },
  { court: 'Court 1', team1: ['Diego F.', 'Isabel B.'], team2: ['Marcos H.', 'Lucia T.'], score: null, status: 'upcoming' },
];

const mockStandings = [
  { pos: 1, name: 'Carlos G.', played: 3, won: 3, pts: 42, winRate: 100 },
  { pos: 2, name: 'Ana M.', played: 3, won: 2, pts: 38, winRate: 67 },
  { pos: 3, name: 'Luis R.', played: 3, won: 2, pts: 35, winRate: 67 },
  { pos: 4, name: 'Pedro J.', played: 3, won: 1, pts: 28, winRate: 33 },
  { pos: 5, name: 'Maria L.', played: 3, won: 1, pts: 24, winRate: 33 },
  { pos: 6, name: 'Juan C.', played: 2, won: 0, pts: 18, winRate: 0 },
];

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;
  const tournament = ongoingTournaments.find((t) => t.id === id);
  if (!tournament) notFound();

  const spotsLeft = tournament.maxPlayers - tournament.players;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/tournaments" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>Torneos</Link>
            {' / '}
            <span style={{ color: '#fff' }}>{tournament.name}</span>
            {tournament.status === 'ongoing' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                <span style={{ width: 7, height: 7, background: '#ee0005', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.4s infinite' }} />
                <span style={{ color: '#ee0005', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>EN VIVO</span>
              </span>
            )}
          </div>
          <h1 className="page-title">{tournament.name.toUpperCase()}</h1>
          <p className="page-sub">{tournament.club} · {tournament.city}, {tournament.country}</p>
        </div>
      </div>

      <section style={{ padding: '64px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 56 }}>
            {[
              { label: 'Formato', value: tournament.format },
              { label: 'Categoría', value: tournament.category },
              { label: 'Nivel', value: tournament.level },
              { label: 'Jugadores', value: `${tournament.players}/${tournament.maxPlayers}` },
            ].map((s) => (
              <div key={s.label} style={{ background: '#fff', padding: '28px 32px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--black)', lineHeight: 1, textTransform: 'uppercase' }}>{s.value}</div>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 48 }}>
            {/* Main */}
            <div>
              {/* Matches */}
              <div style={{ marginBottom: 48 }}>
                <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 44px)', marginBottom: 24 }}>PARTIDOS</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
                  {mockMatches.map((match, i) => (
                    <div key={i} style={{ background: match.status === 'live' ? '#111' : '#fff', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: match.status === 'live' ? 'rgba(255,255,255,0.4)' : 'var(--grey-400)', fontWeight: 600, width: 72, flexShrink: 0 }}>{match.court}</div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: match.status === 'live' ? '#fff' : 'var(--black)' }}>{match.team1[0]}</div>
                          <div style={{ fontSize: 12, color: match.status === 'live' ? 'rgba(255,255,255,0.4)' : 'var(--grey-400)' }}>{match.team1[1]}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: match.status === 'live' ? '#fff' : 'var(--black)', minWidth: 80, textAlign: 'center' }}>
                          {match.score || <span style={{ color: 'var(--grey-300)' }}>VS</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: match.status === 'live' ? '#fff' : 'var(--black)' }}>{match.team2[0]}</div>
                          <div style={{ fontSize: 12, color: match.status === 'live' ? 'rgba(255,255,255,0.4)' : 'var(--grey-400)' }}>{match.team2[1]}</div>
                        </div>
                      </div>
                      <div style={{ width: 80, textAlign: 'right' }}>
                        {match.status === 'live' && <span className="badge badge-live">LIVE</span>}
                        {match.status === 'upcoming' && <span className="badge badge-soon">Pronto</span>}
                        {match.status === 'completed' && <span className="badge" style={{ background: 'var(--grey-100)', color: 'var(--grey-500)' }}>Finalizado</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standings */}
              <div>
                <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 44px)', marginBottom: 24 }}>CLASIFICACIÓN</h2>
                <div style={{ border: '1px solid var(--grey-200)' }}>
                  <table className="rank-table">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: 24, width: 56 }}>#</th>
                        <th>Jugador</th>
                        <th style={{ textAlign: 'center' }}>PJ</th>
                        <th style={{ textAlign: 'center' }}>G</th>
                        <th style={{ textAlign: 'center' }}>PTS</th>
                        <th style={{ textAlign: 'center' }}>% Victoria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockStandings.map((row) => (
                        <tr key={row.pos} style={{ background: row.pos <= 2 ? 'rgba(214,255,0,0.04)' : '#fff' }}>
                          <td style={{ paddingLeft: 24 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: row.pos === 1 ? '#f5a623' : row.pos === 2 ? 'var(--grey-300)' : 'var(--grey-100)',
                              color: row.pos <= 2 ? '#fff' : 'var(--grey-500)',
                              fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600,
                            }}>{row.pos}</div>
                          </td>
                          <td style={{ fontWeight: 600, fontSize: 15 }}>{row.name}</td>
                          <td style={{ textAlign: 'center', color: 'var(--grey-500)' }}>{row.played}</td>
                          <td style={{ textAlign: 'center', color: 'var(--grey-500)' }}>{row.won}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{row.pts}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: row.winRate >= 50 ? 'var(--turf-green)' : 'var(--grey-400)' }}>{row.winRate}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* QR join */}
              <div style={{ background: 'var(--black)', padding: '36px 28px', color: '#fff', textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>▦</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 6 }}>Únete con QR</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>Escanea para unirte a este torneo desde tu móvil</p>
              </div>

              {/* Join CTA */}
              <div style={{ background: 'var(--neon)', padding: '32px 28px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)', margin: '0 0 8px' }}>
                  {spotsLeft > 0 ? `${spotsLeft} LUGARES DISPONIBLES` : 'TORNEO COMPLETO'}
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', marginBottom: 20 }}>
                  {spotsLeft > 0 ? 'Inscríbete antes de que se llene.' : 'Puedes unirte a la lista de espera.'}
                </p>
                <Link href="/signup" className="btn btn-primary btn-lg" style={{ display: 'block', textAlign: 'center', borderRadius: 0, background: 'var(--black)', color: '#fff' }}>
                  {spotsLeft > 0 ? 'Inscribirse' : 'Lista de Espera'}
                </Link>
              </div>

              {/* Details */}
              <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '32px 28px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 20 }}>Detalles</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Fecha', value: tournament.startDate },
                    { label: 'Club', value: tournament.club },
                    { label: 'Ciudad', value: `${tournament.city}, ${tournament.country}` },
                    ...(tournament.prize ? [{ label: 'Premio', value: tournament.prize }] : []),
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--grey-200)', paddingBottom: 14 }}>
                      <span style={{ fontSize: 13, color: 'var(--grey-500)' }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Format link */}
              <Link href={`/tournaments/${tournament.formatSlug}`} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 4 }}>Guía del Formato</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', color: 'var(--black)', letterSpacing: '-0.01em' }}>Cómo funciona {tournament.format}</div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--grey-400)' }}>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
