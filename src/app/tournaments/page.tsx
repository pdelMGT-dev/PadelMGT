'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { tournamentFormats, ongoingTournaments } from '@/lib/data';
import { getSATournamentsFromSupabase } from '@/lib/superadmin-data';
import { fetchPersonalizadoPricing, tierLabelInList, type PricingTier, type PersonalizadoPromo } from '@/lib/personalizado-pricing';

const statusLabel: Record<string, string> = { ongoing: 'En Vivo', upcoming: 'Por Empezar', completed: 'Finalizado', active: 'En Vivo', upcoming_sa: 'Por Empezar' };

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState(ongoingTournaments as {
    id: string; name: string; format: string; club: string; city: string;
    players: number; maxPlayers: number; level: string; prize?: string; startDate: string; status: string;
  }[]);
  const [pzTiers, setPzTiers] = useState<PricingTier[]>([]);
  const [pzPromo, setPzPromo] = useState<PersonalizadoPromo | null>(null);

  useEffect(() => {
    fetchPersonalizadoPricing().then(cfg => {
      setPzTiers(cfg.tiers);
      setPzPromo(cfg.promos.find(p => p.displayOnPricing) ?? null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getSATournamentsFromSupabase().then(sb => {
      // null = fetch failed — keep the placeholder. [] is a legitimate
      // "zero tournaments" result and must be trusted, not skipped.
      if (sb !== null) {
        setTournaments(sb.map(t => ({
          id: t.id,
          name: t.name,
          format: t.format,
          club: t.club,
          city: t.city,
          players: 0,
          maxPlayers: t.players,
          level: '',
          prize: undefined,
          startDate: t.date,
          status: t.status,
        })));
      }
    });
  }, []);

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Seis formatos. Un constructor. Cero hojas de cálculo.</div>
          <h1 className="page-title">TORNEOS</h1>
          <p className="page-sub">Desde Americano de una tarde hasta World Cup con grupos y eliminatorias.</p>
        </div>
      </div>

      {/* Format grid */}
      <section style={{ padding: 'clamp(48px, 7vw, 96px) clamp(20px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 1760, margin: '0 auto' }}>
          <div className="section-header-row" style={{ marginBottom: 32 }}>
            <div>
              <div className="section-eyebrow">Formatos disponibles</div>
              <h2 className="section-title">TODO FORMATO.</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {tournamentFormats.map((f, i) => (
              <Link
                key={f.slug}
                href={`/tournaments/${f.slug}`}
                style={{ display: 'block', textDecoration: 'none' }}
              >
                <div className="card-image" style={{ height: 380, cursor: 'pointer', borderRadius: 0, position: 'relative' }}>
                  <img src="/assets/court-card.svg" alt={f.name} style={{ opacity: 0.8 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,0.88) 100%)' }} />
                  <div style={{ position: 'absolute', top: 20, left: 20 }}>
                    <span style={{ fontSize: 32 }}>{f.icon}</span>
                  </div>
                  <div style={{ position: 'absolute', top: 20, right: 20 }}>
                    <span style={{ fontSize: 10, letterSpacing: '0.18em', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{String(i + 1).padStart(2, '0')} / {String(tournamentFormats.length).padStart(2, '0')}</span>
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', lineHeight: 0.95, letterSpacing: '-0.015em', color: '#fff', marginBottom: 8 }}>{f.name}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', marginBottom: 14 }}>{f.description.slice(0, 80)}…</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                      <span>{f.duration}</span><span>·</span><span>{f.minPlayers}–{f.maxPlayers} jugadores</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TORNEO PERSONALIZADO BANNER ── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#0a0a0a', color: '#fff', padding: 'clamp(64px, 7vw, 96px) clamp(20px, 4vw, 48px)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/assets/court-dark.svg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.12 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0.9) 100%)' }} />
        <div style={{ position: 'relative', maxWidth: 1760, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <span style={{ background: 'var(--neon)', color: 'var(--black)', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', padding: '4px 12px', textTransform: 'uppercase' }}>NUEVO</span>
            <span style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase' }}>Torneo Personalizado</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 'clamp(40px, 6vw, 80px)', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5.5vw, 80px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.025em', lineHeight: 0.92, margin: '0 0 24px', color: '#fff' }}>
                TU TORNEO.<br /><span style={{ color: 'var(--neon)' }}>TUS REGLAS.</span>
              </h2>
              <p style={{ fontSize: 'clamp(14px, 1.4vw, 16px)', color: 'rgba(255,255,255,0.68)', maxWidth: 520, lineHeight: 1.7, margin: '0 0 32px' }}>
                Diseña torneos a medida: define grupos, cuadro eliminatorio y categorías propias. Invita jugadores por link de inscripción. Todo automatizado — sin hojas de cálculo.
              </p>
              <Link href="/signup" className="btn btn-on-dark btn-lg">Crear mi Torneo →</Link>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '28px 36px', minWidth: 260, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>Precio por torneo</div>
                {pzPromo?.displayBadge && (
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', background: 'var(--neon)', color: 'var(--black)', padding: '3px 8px', textTransform: 'uppercase' }}>{pzPromo.displayBadge}</span>
                )}
              </div>
              {(pzTiers.length ? pzTiers : [
                { id: 'a', maxTeams: 8, price: 9 }, { id: 'b', maxTeams: 16, price: 19 },
                { id: 'c', maxTeams: 32, price: 29 }, { id: 'd', maxTeams: null, price: 49 },
              ] as PricingTier[]).map((tier, i, arr) => (
                <div key={tier.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', gap: 20 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap' }}>{tierLabelInList(tier, arr)}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: '#fff' }}>${tier.price}</span>
                </div>
              ))}
              {pzPromo?.displayText && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--neon)', textAlign: 'center', fontWeight: 600 }}>{pzPromo.displayText}</div>
              )}
              <div style={{ marginTop: 18, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', letterSpacing: '0.06em' }}>Pago único · Sin suscripción</div>
            </div>
          </div>
        </div>
      </section>

      {/* Active tournaments */}
      <section style={{ padding: '0 clamp(20px, 4vw, 48px) clamp(48px, 7vw, 96px)' }}>
        <div style={{ maxWidth: 1760, margin: '0 auto' }}>
          <div style={{ marginBottom: 32 }}>
            <div className="section-eyebrow">Torneos activos y próximos</div>
            <h2 className="section-title">EN CURSO</h2>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
            {['Todos', 'En Vivo', 'Por Empezar', 'Finalizado'].map((f, i) => (
              <button key={f} className={`pill-tab${i === 0 ? ' active' : ''}`}>{f}</button>
            ))}
          </div>

          <div className="table-scroll" style={{ border: '1px solid var(--grey-200)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', minWidth: 800 }}>
              <thead>
                <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                  {['Estado', 'Torneo', 'Formato', 'Club · Sede', 'Jugadores', 'Nivel', 'Premio', 'Fecha', ''].map((h) => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...tournaments].sort((a, b) => {
                  const order: Record<string, number> = { ongoing: 0, upcoming: 1, completed: 2 };
                  return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                }).map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--grey-200)' }}>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${t.status === 'ongoing' ? 'badge-live' : t.status === 'upcoming' ? 'badge-soon' : ''}`}>
                        {statusLabel[t.status]}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontWeight: 500 }}>{t.name}</td>
                    <td style={{ padding: '16px', color: 'var(--grey-500)', fontSize: 13 }}>{t.format}</td>
                    <td style={{ padding: '16px', color: 'var(--grey-500)', fontSize: 13 }}>{t.club} · {t.city}</td>
                    <td style={{ padding: '16px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{t.players}/{t.maxPlayers}</td>
                    <td style={{ padding: '16px' }}><span className="chip" style={{ fontSize: 10 }}>{t.level}</span></td>
                    <td style={{ padding: '16px', color: 'var(--grey-500)', fontSize: 13 }}>{t.prize || '—'}</td>
                    <td style={{ padding: '16px', color: 'var(--grey-500)', fontSize: 13 }}>{t.startDate}</td>
                    <td style={{ padding: '16px' }}>
                      <Link href={`/tournaments/detail/${t.id}`} className="btn btn-secondary btn-sm">Ver →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#111', color: '#fff', padding: '80px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 48, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 0.95 }}>¿LISTO PARA ORGANIZAR?</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: 0 }}>Crea tu torneo en menos de 60 segundos. Gratis para hasta 8 jugadores.</p>
          </div>
          <Link href="/signup" className="btn btn-on-dark btn-lg" style={{ flexShrink: 0 }}>Crear Torneo</Link>
        </div>
      </section>
    </div>
  );
}
