'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

// ── Dynamic plan data ─────────────────────────────────────────────────────────

interface FetchedPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  features: Array<{ text: string; included: boolean }>;
  isFeatured: boolean;
  isActive: boolean;
}

type PlanMap = Record<string, FetchedPlan>;

/** Merge fetched plan data with hardcoded fallback values */
function px(id: string, pm: PlanMap, fallback: {
  price: string; period: string; desc: string; features: string[];
  name?: string; highlight?: boolean;
}) {
  const p = pm[id];
  const features = p?.features.filter(f => f.included).map(f => f.text);
  return {
    name:      p?.name           ?? fallback.name ?? id,
    price:     p ? (p.priceMonthly === 0 ? '$0' : `$${p.priceMonthly}`) : fallback.price,
    period:    fallback.period,
    desc:      p?.description    ?? fallback.desc,
    features:  features?.length  ? features : fallback.features,
    highlight: p ? p.isFeatured  : (fallback.highlight ?? false),
  };
}

// ── Checkout button ───────────────────────────────────────────────────────────

function CheckoutBtn({
  planId, label, style,
}: {
  planId: string | null;
  label: string;
  style?: React.CSSProperties;
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  if (!planId) return null;

  async function go() {
    setError(''); setLoading(true);
    try {
      const userRaw   = typeof window !== 'undefined' ? localStorage.getItem('padelmgt_user') : null;
      const userEmail = userRaw ? (JSON.parse(userRaw) as { email?: string }).email : undefined;
      const res  = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, userEmail }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) { window.location.href = data.url; return; }
      setError(data.error ?? 'Error al iniciar el pago');
    } catch { setError('Error de conexión'); }
    setLoading(false);
  }

  return (
    <div>
      <button onClick={go} disabled={loading} className="btn btn-lg"
        style={{ display: 'block', width: '100%', textAlign: 'center', borderRadius: 0,
          opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', ...style }}>
        {loading ? 'Redirigiendo...' : label}
      </button>
      {error && <p style={{ marginTop: 6, fontSize: 11, color: '#dc2626', textAlign: 'center' }}>{error}</p>}
    </div>
  );
}

// ── Shared card styles ────────────────────────────────────────────────────────

const CHECK = '✓';

function FeatureList({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', flex: 1 }}>
      {items.map(f => (
        <li key={f} style={{ display: 'flex', gap: 10, fontSize: 13,
          color: dark ? 'rgba(255,255,255,0.75)' : 'var(--grey-600)', marginBottom: 8, lineHeight: 1.4 }}>
          <span style={{ color: dark ? 'var(--neon)' : 'var(--turf-green)', fontWeight: 700, fontSize: 11, flexShrink: 0, paddingTop: 2 }}>{CHECK}</span>
          {f}
        </li>
      ))}
    </ul>
  );
}

function PlanCard({
  name, role, price, period, desc, features, cta, planId, href, highlight, badge,
}: {
  name: string; role: string; price: string; period: string; desc: string;
  features: string[]; cta: string; planId?: string | null; href?: string | null;
  highlight?: boolean; badge?: string;
}) {
  const dark = !!highlight;
  return (
    <div style={{
      background: dark ? 'var(--black)' : '#fff',
      padding: '32px 28px', display: 'flex', flexDirection: 'column',
      position: 'relative', flex: 1, minWidth: 200,
    }}>
      {dark && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--neon)' }} />}
      {badge && (
        <div style={{ position: 'absolute', top: 16, right: 16, background: 'var(--neon)',
          color: 'var(--black)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', padding: '2px 8px' }}>{badge}</div>
      )}
      <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: dark ? 'var(--neon)' : 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>{role}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
        textTransform: 'uppercase', color: dark ? '#fff' : 'var(--black)', marginBottom: 2 }}>{name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700,
          color: dark ? '#fff' : 'var(--black)', letterSpacing: '-0.03em' }}>{price}</span>
        <span style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.45)' : 'var(--grey-400)' }}>{period}</span>
      </div>
      <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.55)' : 'var(--grey-500)',
        lineHeight: 1.5, marginBottom: 20, minHeight: 36 }}>{desc}</p>
      <FeatureList items={features} dark={dark} />
      <div style={{ marginTop: 24 }}>
        {href ? (
          <Link href={href} className="btn btn-lg" style={{
            display: 'block', textAlign: 'center', borderRadius: 0,
            background: dark ? 'var(--neon)' : 'transparent',
            color: 'var(--black)',
            border: dark ? 'none' : '2px solid var(--black)',
            fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 12,
          }}>{cta}</Link>
        ) : planId ? (
          <CheckoutBtn planId={planId} label={cta} style={{
            background: dark ? 'var(--neon)' : 'transparent',
            color: 'var(--black)',
            border: dark ? 'none' : '2px solid var(--black)',
            fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 12,
          }} />
        ) : (
          <Link href="/about" className="btn btn-lg" style={{
            display: 'block', textAlign: 'center', borderRadius: 0,
            background: 'transparent', color: 'var(--black)',
            border: '2px solid var(--black)',
            fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 12,
          }}>{cta}</Link>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--grey-400)', fontWeight: 700, marginBottom: 8 }}>{emoji} {title}</div>
      <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: 0 }}>{sub}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [pm, setPm] = useState<PlanMap>({});

  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json() as Promise<{ plans: FetchedPlan[] }>)
      .then(data => {
        if (Array.isArray(data.plans) && data.plans.length > 0) {
          setPm(Object.fromEntries(data.plans.map(p => [p.id, p])));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Un plan para cada rol.</div>
          <h1 className="page-title">PLANES Y PRECIOS</h1>
          <p className="page-sub">Desde el jugador casual hasta la federación nacional. Sin sorpresas, sin comisiones.</p>
        </div>
      </div>

      <section style={{ padding: '72px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 80 }}>

          {/* ── JUGADORES ───────────────────────────────────────────────────── */}
          <div>
            <SectionHeader emoji="🎾" title="Jugadores" sub="Para jugadores que quieren rankear, crear partidos y torneos con sus amigos." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2, background: 'var(--grey-200)' }}>
              <PlanCard
                {...px('free', pm, { price: '$0', period: 'para siempre', name: 'Free',
                  desc: 'Empieza gratis. Sin tarjeta de crédito.',
                  features: ['3 Juegos Rápidos por mes','Hasta 8 jugadores por JR','1 torneo por mes','Hasta 16 jugadores por torneo','Ranking personal','Invitaciones por QR'] })}
                role="Jugador" cta="Crear cuenta gratis" href="/signup?role=player"
              />
              <PlanCard
                {...px('player_pro', pm, { price: '$3', period: '/mes', name: 'Pro', highlight: true,
                  desc: 'Para el jugador que organiza 2-3 veces por semana.',
                  features: ['Juegos Rápidos ilimitados','Hasta 32 jugadores por JR','Torneos ilimitados','Hasta 64 jugadores por torneo','Ranking + historial completo','Estadísticas avanzadas'] })}
                role="Jugador" badge="Más popular" cta="Activar Pro" planId="player_pro"
              />
              <PlanCard
                name={pm['player_pro'] ? `${pm['player_pro'].name} Anual` : 'Pro Anual'}
                price={pm['player_pro']?.priceAnnual ? `$${pm['player_pro'].priceAnnual}` : '$25'}
                period="/año · $2.08/mes" role="Jugador"
                desc={pm['player_pro'] ? `Ahorrá pagando ${pm['player_pro'].name} por adelantado (30% descuento).` : 'Ahorrá 30% pagando por adelantado.'}
                features={['Todo lo de Pro mensual','Facturación anual (30% ahorro)','Sin compromiso mensual']}
                cta="Activar Pro Anual" planId="player_pro_year"
              />
            </div>
          </div>

          {/* ── LIGAS ────────────────────────────────────────────────────────── */}
          <div>
            <SectionHeader emoji="🏆" title="Ligas y Organizadores" sub="Para organizar circuitos, ligas privadas o torneos recurrentes con Ranking Independiente." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2, background: 'var(--grey-200)' }}>
              <PlanCard
                {...px('liga_free', pm, { price: '$0', period: 'para siempre', name: 'Free',
                  desc: 'Para ligas vecinales o grupos pequeños.',
                  features: ['Hasta 30 jugadores','2 torneos activos','Ranking básico','1 categoría'] })}
                role="Liga" cta="Empezar gratis" href="/signup?role=league_organizer"
              />
              <PlanCard
                {...px('liga_basic', pm, { price: '$9', period: '/mes', name: 'Básico',
                  desc: 'Para la liga del club o circuito local.',
                  features: ['Hasta 100 jugadores','Torneos ilimitados','Ranking independiente','Historial de temporadas'] })}
                role="Liga" cta="Activar Básico" planId="liga_basic"
              />
              <PlanCard
                {...px('liga_pro', pm, { price: '$19', period: '/mes', name: 'Pro', highlight: true,
                  desc: 'Para circuitos regionales serios.',
                  features: ['Hasta 500 jugadores','Multi-categoría y género','Ranking con puntos propios','Reportes por temporada','Soporte prioritario'] })}
                role="Liga" badge="Recomendado" cta="Activar Pro" planId="liga_pro"
              />
              <PlanCard
                {...px('liga_unlimited', pm, { price: '$39', period: '/mes', name: 'Ilimitado',
                  desc: 'Para circuitos nacionales o multi-sede.',
                  features: ['Jugadores ilimitados','White-label básico','API read-only','Estadísticas avanzadas','Exportar datos (CSV)'] })}
                role="Liga" cta="Activar Ilimitado" planId="liga_unlimited"
              />
            </div>
          </div>

          {/* ── CLUBES ───────────────────────────────────────────────────────── */}
          <div>
            <SectionHeader emoji="🏢" title="Clubes" sub="Fee mensual fijo. Sin comisiones, sin sorpresas. Sabés exactamente cuánto pagás." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, background: 'var(--grey-200)' }}>
              <PlanCard
                {...px('club_starter', pm, { price: '$29', period: '/mes', name: 'Starter',
                  desc: 'Para clubes pequeños que quieren gestionar torneos y miembros.',
                  features: ['Hasta 150 miembros','Torneos ilimitados','Dashboard del club','Gestión de canchas','Soporte por email'] })}
                role="Club" cta="Prueba 14 días gratis" planId="club_starter"
              />
              <PlanCard
                {...px('club_pro', pm, { price: '$49', period: '/mes', name: 'Pro', highlight: true,
                  desc: 'Para clubes con reservas online y pagos integrados.',
                  features: ['Miembros ilimitados','Reservas online + pagos','Múltiples canchas','Estadísticas avanzadas','Ranking del club','Soporte prioritario'] })}
                role="Club" badge="Más popular" cta="Prueba 14 días gratis" planId="club_pro"
              />
              <PlanCard
                {...px('club_liga', pm, { price: '$69', period: '/mes', name: 'Club + Liga',
                  desc: 'Para clubes que también organizan su propio circuito.',
                  features: ['Todo lo de Club Pro','Ranking independiente','Gestión de liga interna','Multi-categoría','Reportes combinados'] })}
                role="Club" cta="Prueba 14 días gratis" planId="club_liga"
              />
            </div>
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--grey-400)' }}>
              ¿Tenés pocos miembros? También disponible a <strong>$8/cancha/mes</strong> (mín. $24). Contactanos.
            </p>
          </div>

          {/* ── FEDERACIONES ─────────────────────────────────────────────────── */}
          <div>
            <SectionHeader emoji="🏛️" title="Federaciones" sub="Para federaciones nacionales o regionales que necesitan ranking oficial, multi-club y control total." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, background: 'var(--grey-200)' }}>
              <PlanCard
                {...px('fed_basic', pm, { price: '$99', period: '/mes', name: 'Básica',
                  desc: 'Para federaciones con hasta 20 clubes afiliados.',
                  features: ['Hasta 20 clubes afiliados','Ranking oficial nacional','Torneos sancionados','Multi-categoría y género','Panel de administración'] })}
                role="Federación" cta="Contactar ventas" planId="fed_basic"
              />
              <PlanCard
                {...px('fed_pro', pm, { price: '$199', period: '/mes', name: 'Pro', highlight: true,
                  desc: 'Para federaciones nacionales con escala real.',
                  features: ['Clubes ilimitados','White-label completo','API full access','Integración sistemas propios','SLA básico garantizado','Gerente de cuenta'] })}
                role="Federación" cta="Contactar ventas" planId="fed_pro"
              />
              <PlanCard
                name="Enterprise" role="Federación" price="Custom" period="cotización a medida"
                desc="Federaciones con requerimientos especiales o contratos a largo plazo."
                features={['Todo lo de Pro','Contrato anual con descuento','SLA garantizado 99.9%','Integración legacy systems','Capacitación presencial']}
                cta="Hablar con el equipo" href="/about"
              />
            </div>
          </div>

          {/* ── Comparison table ──────────────────────────────────────────────── */}
          <div>
            <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 48px)', marginBottom: 32 }}>
              COMPARAR TODOS LOS PLANES
            </h2>
            <div style={{ border: '1px solid var(--grey-200)', overflowX: 'auto' }}>
              <table className="rank-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 24, width: '28%' }}>Funcionalidad</th>
                    <th style={{ textAlign: 'center' }}>Jugador Free</th>
                    <th style={{ textAlign: 'center', background: 'var(--black)', color: 'var(--neon)' }}>Jugador Pro</th>
                    <th style={{ textAlign: 'center' }}>Liga Pro</th>
                    <th style={{ textAlign: 'center' }}>Club Pro</th>
                    <th style={{ textAlign: 'center' }}>Federación</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { f: 'Juegos Rápidos',         vs: ['3/mes', '∞', '∞', '∞', '∞'] },
                    { f: 'Jug. por JR',             vs: ['8', '32', '∞', '∞', '∞'] },
                    { f: 'Torneos/mes',             vs: ['1', '∞', '∞', '∞', '∞'] },
                    { f: 'Jug. por torneo',         vs: ['16', '64', '∞', '∞', '∞'] },
                    { f: 'Ranking personal',        vs: ['✓', '✓', '✓', '✓', '✓'] },
                    { f: 'Ranking independiente',   vs: ['–', '–', '✓', '✓', '✓'] },
                    { f: 'Gestión de miembros',     vs: ['–', '–', '500', '∞', '∞'] },
                    { f: 'Multi-categoría',         vs: ['–', '–', '✓', '✓', '✓'] },
                    { f: 'White-label',             vs: ['–', '–', '–', '–', '✓'] },
                    { f: 'API access',              vs: ['–', '–', 'read', 'read', '✓'] },
                  ].map(row => (
                    <tr key={row.f}>
                      <td style={{ paddingLeft: 24, fontWeight: 500, color: 'var(--black)', fontSize: 13 }}>{row.f}</td>
                      {row.vs.map((v, i) => (
                        <td key={i} style={{
                          textAlign: 'center', fontSize: 13,
                          background: i === 1 ? 'rgba(0,0,0,0.025)' : undefined,
                          fontFamily: v === '✓' || v === '–' ? undefined : 'var(--font-display)',
                          fontWeight: v !== '–' ? 600 : 400,
                          color: v === '✓' ? 'var(--turf-green)' : v === '–' ? 'var(--grey-300)' : 'var(--black)',
                        }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── FAQ ──────────────────────────────────────────────────────────── */}
          <div>
            <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 48px)', marginBottom: 32 }}>FAQ</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
              {[
                { q: '¿Puedo cambiar de plan?', a: 'Sí, en cualquier momento desde tu dashboard. Los cambios se aplican al próximo ciclo.' },
                { q: '¿Cómo funciona la prueba gratis?', a: 'Clubes y Ligas tienen 14 días sin tarjeta de crédito. Si no continuás, el plan vuelve a Free automáticamente.' },
                { q: '¿Cobran comisión por torneos o inscripciones?', a: 'No. PadelMGT nunca cobra comisión sobre tus ingresos. El precio es fijo y predecible.' },
                { q: '¿Qué métodos de pago aceptan?', a: 'Tarjeta de crédito/débito via Stripe. Mercado Pago próximamente para LATAM.' },
                { q: '¿Los precios incluyen impuestos?', a: 'Los precios mostrados no incluyen IVA/VAT local, que puede variar según tu país.' },
              ].map((item, i) => (
                <div key={i} style={{ background: '#fff', padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: 'var(--black)' }}>{item.q}</div>
                  <div style={{ fontSize: 13, color: 'var(--grey-500)', lineHeight: 1.6 }}>{item.a}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* CTA footer */}
      <section style={{ background: '#111', color: '#fff', padding: '72px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 8px', lineHeight: 1 }}>¿DUDAS?</h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: 0 }}>Hablá con el equipo y encontramos el plan ideal para tu organización.</p>
          </div>
          <Link href="/about" className="btn btn-on-dark btn-lg" style={{ flexShrink: 0 }}>Contactar Equipo</Link>
        </div>
      </section>
    </div>
  );
}
