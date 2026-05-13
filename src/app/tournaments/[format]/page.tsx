import Link from 'next/link';
import { notFound } from 'next/navigation';
import { tournamentFormats, ongoingTournaments } from '@/lib/data';

interface Props {
  params: Promise<{ format: string }>;
}

export async function generateStaticParams() {
  return tournamentFormats.map((f) => ({ format: f.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { format: slug } = await params;
  const fmt = tournamentFormats.find((f) => f.slug === slug);
  return { title: `${fmt?.name ?? 'Formato'} – PadelMGT` };
}

export default async function FormatDetailPage({ params }: Props) {
  const { format: slug } = await params;
  const fmt = tournamentFormats.find((f) => f.slug === slug);
  if (!fmt) notFound();

  const related = ongoingTournaments.filter((t) => t.formatSlug === slug).slice(0, 3);
  const otherFormats = tournamentFormats.filter((f) => f.slug !== slug).slice(0, 3);

  const statusLabel: Record<string, string> = { ongoing: 'EN VIVO', upcoming: 'PRÓXIMO', completed: 'FINALIZADO' };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <Link href="/tournaments" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>Torneos</Link>
            {' / '}
            <span style={{ color: '#fff' }}>{fmt.name}</span>
          </div>
          <h1 className="page-title">{fmt.name.toUpperCase()}</h1>
          <p className="page-sub">{fmt.description}</p>
        </div>
      </div>

      <section style={{ padding: '64px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 64 }}>
            {[
              { label: 'Jugadores', value: `${fmt.minPlayers}–${fmt.maxPlayers}` },
              { label: 'Duración', value: fmt.duration },
              { label: 'Nivel', value: fmt.difficulty },
            ].map((s) => (
              <div key={s.label} style={{ background: '#fff', padding: '32px 40px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 8 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 48 }}>
            {/* Main */}
            <div>
              {/* How it Works */}
              <div style={{ marginBottom: 56 }}>
                <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 44px)', marginBottom: 32 }}>CÓMO FUNCIONA</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
                  {fmt.rules.map((rule, i) => (
                    <div key={i} style={{ background: '#fff', padding: '24px 32px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--neon)', lineHeight: 1, background: 'var(--black)', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                      <p style={{ fontSize: 15, color: 'var(--grey-600)', lineHeight: 1.6, margin: 0, paddingTop: 12 }}>{rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Why Choose */}
              <div style={{ marginBottom: 56 }}>
                <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 44px)', marginBottom: 32 }}>¿POR QUÉ {fmt.name.toUpperCase()}?</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--grey-200)' }}>
                  {fmt.pros.map((pro, i) => (
                    <div key={i} style={{ background: '#fff', padding: '24px 28px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--turf-green)', fontSize: 14, fontWeight: 700, flexShrink: 0, paddingTop: 2 }}>✓</span>
                      <p style={{ fontSize: 14, color: 'var(--grey-600)', margin: 0, lineHeight: 1.5 }}>{pro}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ideal For */}
              <div style={{ background: 'var(--black)', padding: '40px 48px', marginBottom: 56 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 600, marginBottom: 12 }}>Ideal para</div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>{fmt.idealFor}</p>
              </div>

              {/* Related Tournaments */}
              {related.length > 0 && (
                <div>
                  <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 44px)', marginBottom: 32 }}>TORNEOS {fmt.name.toUpperCase()} ACTIVOS</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
                    {related.map((t) => (
                      <Link key={t.id} href={`/tournaments/detail/${t.id}`} style={{ background: '#fff', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            {t.status === 'ongoing' && <span className="badge badge-live">LIVE</span>}
                            {t.status === 'upcoming' && <span className="badge badge-soon">Próximo</span>}
                            {t.status === 'completed' && <span className="badge" style={{ background: 'var(--grey-100)', color: 'var(--grey-500)' }}>Finalizado</span>}
                          </div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', color: 'var(--black)', letterSpacing: '-0.01em' }}>{t.name}</div>
                          <div style={{ fontSize: 13, color: 'var(--grey-500)', marginTop: 4 }}>{t.club} · {t.city}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--black)' }}>{t.players}<span style={{ fontSize: 16, color: 'var(--grey-400)' }}>/{t.maxPlayers}</span></div>
                          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600 }}>jugadores</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* CTA */}
              <div style={{ background: 'var(--black)', padding: '40px 32px', color: '#fff' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 600, marginBottom: 12 }}>Organiza</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 8px' }}>¿CREAR UN {fmt.name.toUpperCase()}?</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.5, marginBottom: 28 }}>Crea tu torneo en minutos. Gratis para hasta 12 jugadores.</p>
                <Link href="/signup" className="btn btn-primary btn-lg" style={{ display: 'block', textAlign: 'center', borderRadius: 0, background: 'var(--neon)', color: 'var(--black)', marginBottom: 12 }}>
                  Crear Torneo
                </Link>
                <Link href="/tournaments" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                  Ver todos los torneos →
                </Link>
              </div>

              {/* Summary */}
              <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '32px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 20 }}>Resumen del Formato</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'Jugadores', value: `${fmt.minPlayers}–${fmt.maxPlayers}` },
                    { label: 'Duración', value: fmt.duration },
                    { label: 'Nivel', value: fmt.difficulty },
                    { label: 'Tipo', value: fmt.type },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--grey-200)', paddingBottom: 16 }}>
                      <span style={{ fontSize: 13, color: 'var(--grey-500)' }}>{item.label}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--black)', textTransform: 'uppercase' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Formats */}
              <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '32px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 20 }}>Otros Formatos</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)', marginBottom: 16 }}>
                  {otherFormats.map((f) => (
                    <Link key={f.slug} href={`/tournaments/${f.slug}`} style={{ background: '#fff', padding: '16px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
                      <span style={{ fontSize: 24 }}>{f.icon}</span>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', color: 'var(--black)', letterSpacing: '-0.01em' }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 2 }}>{f.difficulty}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', color: 'var(--grey-300)', fontSize: 18 }}>→</span>
                    </Link>
                  ))}
                </div>
                <Link href="/tournaments" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todos los formatos →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
