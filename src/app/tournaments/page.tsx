import Link from 'next/link';
import { tournamentFormats, ongoingTournaments } from '@/lib/data';

export const metadata = {
  title: 'Torneos — PadelMGT',
};

const statusLabel: Record<string, string> = { ongoing: 'En Vivo', upcoming: 'Por Empezar', completed: 'Finalizado' };

export default function TournamentsPage() {
  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Seis formatos. Un constructor. Cero hojas de cálculo.</div>
          <h1 className="page-title">TORNEOS</h1>
          <p className="page-sub">Desde Americano de una tarde hasta Champions League con grupos y eliminatorias.</p>
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
                    <span style={{ fontSize: 10, letterSpacing: '0.18em', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>0{i + 1} / 06</span>
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
                {[...ongoingTournaments].sort((a, b) => {
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
