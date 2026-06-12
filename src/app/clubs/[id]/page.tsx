'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { clubs } from '@/lib/data';
import type { Club } from '@/lib/types';
import { getSAClubsFromSupabase } from '@/lib/superadmin-data';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { joinClub, isClubMember } from '@/lib/club-membership-store';
import ClubReviews from '@/components/ClubReviews';

const mockTournaments = [
  { name: 'Americano de Mayo', format: 'Americano', date: '2026-05-18', players: 12, maxPlayers: 16, status: 'upcoming' },
  { name: 'Liga Club Interna', format: 'Round Robin', date: '2026-05-10', players: 8, maxPlayers: 8, status: 'ongoing' },
  { name: 'Abierto de Abril', format: 'Knockout', date: '2026-04-20', players: 16, maxPlayers: 16, status: 'completed' },
];

export default function ClubDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { user } = useCurrentUser();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [ratingInfo, setRatingInfo] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });

  // Reflect existing membership once club + user are known
  useEffect(() => {
    if (user?.id && club?.id) setJoined(isClubMember(user.id, club.id));
  }, [user?.id, club?.id]);

  function handleJoinClub() {
    if (!user?.id || !club) return;
    joinClub(user.id, { id: club.id, name: club.name, city: club.city, country: club.country });
    setJoined(true);
  }

  useEffect(() => {
    if (!id) return;

    // 1. Check hardcoded clubs first (fast, sync)
    const local = clubs.find(c => c.id === id);
    if (local) {
      setClub(local);
      setLoading(false);
      return;
    }

    // 2. Fetch from Supabase and find by id
    getSAClubsFromSupabase()
      .then(sbClubs => {
        if (!sbClubs) return;
        const found = sbClubs.find(c => c.id === id);
        if (found) {
          setClub({
            id: found.id,
            name: found.name,
            country: found.country || '–',
            city: found.city || '–',
            address: found.address || found.city || '–',
            courts: found.courts || 0,
            members: found.members || 0,
            rating: 0, // displayed rating comes from player votes (club_reviews)
            amenities: found.amenities?.length ? found.amenities : ['Canchas cubiertas', 'Vestuarios', 'Estacionamiento'],
            phone: found.ownerPhone || undefined,
            email: found.adminEmail || found.ownerEmail || undefined,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>Cargando club…</div>
      </div>
    );
  }

  if (!club) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Club no encontrado</div>
        <Link href="/clubs" className="btn btn-secondary btn-sm">← Volver a Clubes</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <Link href="/clubs" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>Clubes</Link>
            {' / '}
            <span style={{ color: '#fff' }}>{club.name}</span>
          </div>
          <h1 className="page-title">{club.name.toUpperCase()}</h1>
          <p className="page-sub">{club.address}</p>
        </div>
      </div>

      <section style={{ padding: '64px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 56 }}>
            {[
              { label: 'Canchas', value: String(club.courts) },
              { label: 'Miembros', value: String(club.members) },
              { label: 'Valoración', value: ratingInfo.count > 0 ? `★ ${ratingInfo.avg.toFixed(1)}` : '—' },
              { label: 'Ciudad', value: club.city },
            ].map((s) => (
              <div key={s.label} style={{ background: '#fff', padding: '28px 32px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--black)', lineHeight: 1, textTransform: 'uppercase' }}>{s.value}</div>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 48 }}>
            {/* Main */}
            <div>
              {/* Court image */}
              <div className="card-image" style={{ height: 320, marginBottom: 48, borderRadius: 0 }}>
                <img src="/assets/court-green.svg" alt={club.name} style={{ opacity: 0.9 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />
                {ratingInfo.count > 0 && (
                  <div style={{ position: 'absolute', bottom: 28, left: 32 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, color: '#fff', fontWeight: 600 }}>★ {ratingInfo.avg.toFixed(1)}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{ratingInfo.count} voto{ratingInfo.count !== 1 ? 's' : ''} de jugadores</div>
                  </div>
                )}
              </div>

              {/* Amenities */}
              <div style={{ marginBottom: 48 }}>
                <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 44px)', marginBottom: 24 }}>INSTALACIONES</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {club.amenities.map((a) => (
                    <span key={a} className="chip" style={{ fontSize: 13, padding: '8px 16px' }}>{a}</span>
                  ))}
                </div>
              </div>

              {/* Player ratings & comments */}
              <ClubReviews clubId={club.id} onRatingChange={setRatingInfo} />

              {/* Tournaments */}
              <div>
                <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 44px)', marginBottom: 24 }}>TORNEOS</h2>
                <div style={{ border: '1px solid var(--grey-200)' }}>
                  <table className="rank-table">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: 24 }}>Torneo</th>
                        <th>Formato</th>
                        <th>Fecha</th>
                        <th style={{ textAlign: 'center' }}>Jugadores</th>
                        <th>Estado</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockTournaments.map((t, i) => (
                        <tr key={i}>
                          <td style={{ paddingLeft: 24, fontWeight: 600, fontSize: 15 }}>{t.name}</td>
                          <td><span className="chip" style={{ fontSize: 10 }}>{t.format}</span></td>
                          <td style={{ color: 'var(--grey-500)', fontSize: 13 }}>{t.date}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{t.players}/{t.maxPlayers}</td>
                          <td>
                            {t.status === 'ongoing' && <span className="badge badge-live">LIVE</span>}
                            {t.status === 'upcoming' && <span className="badge badge-soon">Próximo</span>}
                            {t.status === 'completed' && <span className="badge" style={{ background: 'var(--grey-100)', color: 'var(--grey-500)' }}>Finalizado</span>}
                          </td>
                          <td><Link href="/signup" className="btn btn-secondary btn-sm">Ver →</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Reserve CTA */}
              <div style={{ background: 'var(--black)', padding: '36px 28px', color: '#fff' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 600, marginBottom: 12 }}>Reserva</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 8px' }}>RESERVA UNA CANCHA</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>Elige horario y cancha disponible en línea.</p>
                <Link href="/signup" className="btn btn-primary btn-lg" style={{ display: 'block', textAlign: 'center', borderRadius: 0, background: 'var(--neon)', color: 'var(--black)' }}>
                  Reservar Cancha
                </Link>
              </div>

              {/* Contact */}
              <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '32px 28px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 20 }}>Contacto</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Teléfono', value: club.phone || '–' },
                    { label: 'Email', value: club.email || '–' },
                    { label: 'País', value: club.country },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: 4, borderBottom: '1px solid var(--grey-200)', paddingBottom: 14 }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Join as member */}
              <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '28px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)', marginBottom: 8 }}>¿Quieres ser miembro?</div>
                <p style={{ fontSize: 13, color: 'var(--grey-500)', lineHeight: 1.5, marginBottom: 16 }}>Accede a reservas prioritarias, torneos y descuentos exclusivos.</p>
                {!user ? (
                  <Link href="/signup" className="btn btn-secondary btn-sm" style={{ display: 'block', textAlign: 'center', borderRadius: 0 }}>Unirme al Club</Link>
                ) : joined ? (
                  <div style={{ display: 'block', textAlign: 'center', padding: '8px 16px', background: 'rgba(30,170,82,0.1)', border: '1px solid rgba(30,170,82,0.3)', color: 'var(--turf-green)', fontWeight: 700, fontSize: 13 }}>
                    ✓ Ya sos miembro
                  </div>
                ) : (
                  <button onClick={handleJoinClub} className="btn btn-primary btn-sm" style={{ display: 'block', width: '100%', textAlign: 'center', borderRadius: 0, cursor: 'pointer' }}>Unirme al Club</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
