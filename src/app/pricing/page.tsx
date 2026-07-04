'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

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

interface ActivePromo {
  id: string;
  code: string;
  type: string;
  value: number;
  description: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  unlockPlan: string | null;
  unlockMonths: number | null;
  displayText: string;
  displayBadge: string;
}

// ── Checkout helper ───────────────────────────────────────────────────────────
async function startCheckout(planId: string, couponCode?: string): Promise<string | null> {
  const userRaw   = typeof window !== 'undefined' ? localStorage.getItem('padelmgt_user') : null;
  const userEmail = userRaw ? (JSON.parse(userRaw) as { email?: string }).email : undefined;
  const res = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: planId, userEmail, couponCode }),
  });
  const data = await res.json() as { url?: string; error?: string };
  return data.url ?? null;
}

// ── Checkout button ───────────────────────────────────────────────────────────
function CheckoutBtn({
  planId, label, style, couponCode,
}: {
  planId: string | null;
  label: string;
  style?: React.CSSProperties;
  couponCode?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  if (!planId) return null;

  async function go() {
    setError(''); setLoading(true);
    try {
      const url = await startCheckout(planId, couponCode);
      if (url) { window.location.href = url; return; }
      setError('Error al iniciar el pago');
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

// ── Promo Banner ──────────────────────────────────────────────────────────────
function PromoBanner({ promo, onApply }: { promo: ActivePromo; onApply: (code: string) => void }) {
  const [loading, setLoading] = useState(false);
  const pct = promo.maxUses ? Math.min(100, (promo.usedCount / promo.maxUses) * 100) : 0;
  const remaining = promo.maxUses ? promo.maxUses - promo.usedCount : null;
  const barColor = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f97316' : '#c8f135';

  const daysLeft = promo.expiresAt
    ? Math.max(0, Math.ceil((new Date(promo.expiresAt).getTime() - Date.now()) / 86_400_000))
    : null;

  const urgentDays = daysLeft !== null && daysLeft <= 30;
  const daysBadgeColor = daysLeft !== null ? (daysLeft <= 7 ? '#ef4444' : daysLeft <= 14 ? '#f97316' : 'rgba(255,255,255,0.35)') : 'transparent';

  async function handleActivate() {
    setLoading(true);
    try {
      if (promo.unlockPlan) {
        const url = await startCheckout(promo.unlockPlan, promo.code);
        if (url) { window.location.href = url; return; }
      } else {
        onApply(promo.code);
        const el = document.getElementById('promo-code-input');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <div style={{ background: '#111', color: '#fff', padding: '28px 36px', marginBottom: 0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top right, rgba(200,241,53,0.07) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              {promo.displayBadge && (
                <span style={{ background: 'var(--neon)', color: '#111', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '3px 10px' }}>
                  {promo.displayBadge}
                </span>
              )}
              {urgentDays && daysLeft !== null && (
                <span style={{ background: daysBadgeColor, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 2 }}>
                  ⏱ {daysLeft === 0 ? 'Último día' : `${daysLeft} días`}
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4, color: '#fff' }}>
              {promo.displayText || promo.description}
            </div>
            {promo.maxUses && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>CUPOS UTILIZADOS</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: remaining !== null && remaining <= 20 ? '#ef4444' : 'rgba(255,255,255,0.8)' }}>
                    {remaining !== null && remaining <= 20 ? `¡Solo ${remaining} restantes!` : `${promo.usedCount} de ${promo.maxUses}`}
                  </span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleActivate}
              disabled={loading}
              style={{ padding: '13px 28px', background: 'var(--neon)', color: '#111', border: 'none', cursor: loading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: loading ? 0.8 : 1 }}
            >
              {loading ? 'Redirigiendo...' : 'Activar oferta →'}
            </button>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>Código: {promo.code}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Promo Code Input ──────────────────────────────────────────────────────────
function PromoCodeInput({ onApply, applied }: { onApply: (code: string) => void; applied: string }) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (applied) { setInput(applied); setStatus('ok'); setMsg('Código aplicado. Se descontará en el checkout.'); }
  }, [applied]);

  async function validate() {
    if (!input.trim()) return;
    setStatus('idle'); setMsg('');
    try {
      const res  = await fetch(`/api/promos/active`);
      const data = await res.json() as { promos: ActivePromo[] };
      const found = data.promos.find(p => p.code === input.toUpperCase().trim());
      if (found) {
        setStatus('ok');
        setMsg(found.displayText || found.description || 'Código válido');
        onApply(found.code);
      } else {
        setStatus('error');
        setMsg('Código no encontrado o inactivo');
      }
    } catch {
      setStatus('error'); setMsg('Error al validar el código');
    }
  }

  return (
    <div id="promo-code-input" style={{ padding: '32px 0', borderTop: '1px solid var(--grey-200)', marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-600)', marginBottom: 10 }}>¿Tienes un código promocional?</div>
      <div style={{ display: 'flex', gap: 0, maxWidth: 400 }}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value.toUpperCase()); setStatus('idle'); setMsg(''); }}
          onKeyDown={e => e.key === 'Enter' && validate()}
          placeholder="CÓDIGO"
          style={{ flex: 1, padding: '10px 14px', border: `1px solid ${status === 'ok' ? '#166534' : status === 'error' ? '#dc2626' : 'var(--grey-200)'}`, outline: 'none', fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.08em', background: '#fff' }}
        />
        <button
          onClick={validate}
          style={{ padding: '10px 20px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          Aplicar
        </button>
      </div>
      {msg && (
        <div style={{ marginTop: 6, fontSize: 12, color: status === 'ok' ? '#166534' : '#dc2626', fontWeight: 500 }}>
          {status === 'ok' ? '✓ ' : '✕ '}{msg}
        </div>
      )}
      {status === 'ok' && (
        <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 4 }}>
          El descuento se aplicará en el siguiente paso al seleccionar un plan.
        </div>
      )}
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
  name, role, price, period, desc, features, cta, planId, href, highlight, badge, couponCode,
}: {
  name: string; role: string; price: string; period: string; desc: string;
  features: string[]; cta: string; planId?: string | null; href?: string | null;
  highlight?: boolean; badge?: string; couponCode?: string;
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
          <CheckoutBtn planId={planId} label={cta} couponCode={couponCode} style={{
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

// ── Visibility flags (set to true when ready to launch) ──────────────────────
const SHOW_CLUB_PLANS = false;
const SHOW_FED_PLANS  = false;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [pm, setPm] = useState<PlanMap>({});
  const [promos, setPromos] = useState<ActivePromo[]>([]);
  const [appliedCode, setAppliedCode] = useState('');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  // Build a paid player-tier card's props, respecting the monthly/annual toggle.
  function paidCard(id: string, fb: { name: string; monthly: number; annual: number; desc: string; features: string[]; highlight?: boolean; badge?: string }) {
    const p = pm[id];
    const feats = p?.features.filter(f => f.included).map(f => f.text);
    const monthly = p?.priceMonthly ?? fb.monthly;
    const annual = p?.priceAnnual ?? fb.annual;
    return {
      name: p?.name ?? fb.name,
      role: 'Jugador',
      price: billing === 'monthly' ? `$${monthly}` : `$${annual}`,
      period: billing === 'monthly' ? '/mes' : '/año',
      desc: p?.description ?? fb.desc,
      features: feats?.length ? feats : fb.features,
      planId: billing === 'monthly' ? id : `${id}_year`,
      highlight: p ? p.isFeatured : fb.highlight,
      badge: fb.badge,
      couponCode: appliedCode,
    };
  }

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

  const loadPromos = useCallback(async () => {
    try {
      const res  = await fetch('/api/promos/active');
      const data = await res.json() as { promos: ActivePromo[] };
      setPromos(data.promos ?? []);
    } catch { /* show no promos on error */ }
  }, []);

  useEffect(() => { void loadPromos(); }, [loadPromos]);
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

      {/* Active promotions banners */}
      {promos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {promos.map(p => (
            <PromoBanner key={p.id} promo={p} onApply={setAppliedCode} />
          ))}
        </div>
      )}

      <section style={{ padding: '72px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 80 }}>

          {/* ── PLANES DE JUGADOR (unificados: juegos + torneos + ligas) ─────── */}
          <div>
            <SectionHeader emoji="🎾" title="Planes" sub="Un solo plan para todo: juegos rápidos, torneos y tus propias ligas. Cuanto más alto el plan, más grande podés jugar." />

            {/* Billing toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
              <div style={{ display: 'inline-flex', border: '1px solid var(--grey-200)', background: '#fff' }}>
                {([['monthly', 'Mensual'], ['annual', 'Anual · 20% off']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setBilling(val)}
                    style={{ padding: '10px 22px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      background: billing === val ? 'var(--black)' : 'transparent', color: billing === val ? 'var(--neon)' : 'var(--grey-500)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2, background: 'var(--grey-200)' }}>
              <PlanCard
                {...px('free', pm, { price: '$0', period: 'para siempre', name: 'Free',
                  desc: 'Empieza gratis. Sin tarjeta de crédito.',
                  features: ['3 juegos rápidos por mes','Hasta 8 jugadores por juego','1 torneo por mes (hasta 8)','1 liga activa (hasta 8 jugadores)','Clasificación básica','Invitaciones por QR'] })}
                role="Jugador" cta="Crear cuenta gratis" href="/signup?role=player"
                couponCode={appliedCode}
              />
              <PlanCard
                {...paidCard('player_basic', { name: 'Player Basic', monthly: 3, annual: 28.80,
                  desc: 'Para jugar más seguido y organizar tu liga.',
                  features: ['Hasta 10 juegos/mes','Hasta 12 jugadores por juego','3 torneos/mes (hasta 16)','3 ligas activas (hasta 16 jugadores)','Clasificación completa','Soporte por email'] })}
                cta="Activar Basic"
              />
              <PlanCard
                {...paidCard('player_pro', { name: 'Player Pro', monthly: 5, annual: 48, highlight: true, badge: 'Más popular',
                  desc: 'Para el jugador que organiza 2-3 veces por semana.',
                  features: ['Juegos ilimitados','Hasta 24 jugadores por juego','5 torneos/mes (hasta 64)','10 ligas activas (hasta 32 jugadores)','Clasificación avanzada + categorías','Estadísticas avanzadas'] })}
                cta="Activar Pro"
              />
              <PlanCard
                {...paidCard('player_unlimited', { name: 'Player Ilimitado', monthly: 10, annual: 96,
                  desc: 'Sin límites. Para los que viven el pádel.',
                  features: ['Juegos ilimitados','Hasta 32 jugadores por juego','Torneos ilimitados','Ligas ilimitadas (jugadores ilimitados)','Clasificación avanzada + categorías','Estadísticas avanzadas'] })}
                cta="Activar Ilimitado"
              />
            </div>
          </div>

          {/* ── CLUBES ───────────────────────────────────────────────────────── */}
          {SHOW_CLUB_PLANS && (
          <div>
            <SectionHeader emoji="🏢" title="Clubes" sub="Fee mensual fijo. Sin comisiones, sin sorpresas. Sabés exactamente cuánto pagás." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, background: 'var(--grey-200)' }}>
              <PlanCard
                {...px('club_starter', pm, { price: '$29', period: '/mes', name: 'Starter',
                  desc: 'Para clubes pequeños que quieren gestionar torneos y miembros.',
                  features: ['Hasta 150 miembros','Torneos ilimitados','Dashboard del club','Gestión de canchas','Soporte por email'] })}
                role="Club" cta="Prueba 14 días gratis" planId="club_starter"
                couponCode={appliedCode}
              />
              <PlanCard
                {...px('club_pro', pm, { price: '$49', period: '/mes', name: 'Pro', highlight: true,
                  desc: 'Para clubes con reservas online y pagos integrados.',
                  features: ['Miembros ilimitados','Reservas online + pagos','Múltiples canchas','Estadísticas avanzadas','Ranking del club','Soporte prioritario'] })}
                role="Club" badge="Más popular" cta="Prueba 14 días gratis" planId="club_pro"
                couponCode={appliedCode}
              />
              <PlanCard
                {...px('club_liga', pm, { price: '$69', period: '/mes', name: 'Club + Liga',
                  desc: 'Para clubes que también organizan su propio circuito.',
                  features: ['Todo lo de Club Pro','Ranking independiente','Gestión de liga interna','Multi-categoría','Reportes combinados'] })}
                role="Club" cta="Prueba 14 días gratis" planId="club_liga"
                couponCode={appliedCode}
              />
            </div>
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--grey-400)' }}>
              ¿Tenés pocos miembros? También disponible a <strong>$8/cancha/mes</strong> (mín. $24). Contactanos.
            </p>
          </div>
          )}

          {/* ── FEDERACIONES ─────────────────────────────────────────────────── */}
          {SHOW_FED_PLANS && (
          <div>
            <SectionHeader emoji="🏛️" title="Federaciones" sub="Para federaciones nacionales o regionales que necesitan ranking oficial, multi-club y control total." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, background: 'var(--grey-200)' }}>
              <PlanCard
                {...px('fed_basic', pm, { price: '$99', period: '/mes', name: 'Básica',
                  desc: 'Para federaciones con hasta 20 clubes afiliados.',
                  features: ['Hasta 20 clubes afiliados','Ranking oficial nacional','Torneos sancionados','Multi-categoría y género','Panel de administración'] })}
                role="Federación" cta="Contactar ventas" planId="fed_basic"
                couponCode={appliedCode}
              />
              <PlanCard
                {...px('fed_pro', pm, { price: '$199', period: '/mes', name: 'Pro', highlight: true,
                  desc: 'Para federaciones nacionales con escala real.',
                  features: ['Clubes ilimitados','White-label completo','API full access','Integración sistemas propios','SLA básico garantizado','Gerente de cuenta'] })}
                role="Federación" cta="Contactar ventas" planId="fed_pro"
                couponCode={appliedCode}
              />
              <PlanCard
                name="Enterprise" role="Federación" price="Custom" period="cotización a medida"
                desc="Federaciones con requerimientos especiales o contratos a largo plazo."
                features={['Todo lo de Pro','Contrato anual con descuento','SLA garantizado 99.9%','Integración legacy systems','Capacitación presencial']}
                cta="Hablar con el equipo" href="/about"
              />
            </div>
          </div>
          )}

          {/* ── Comparison table ──────────────────────────────────────────────── */}
          <div>
            <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 48px)', marginBottom: 32 }}>
              COMPARAR TODOS LOS PLANES
            </h2>
            <div style={{ border: '1px solid var(--grey-200)', overflowX: 'auto' }}>
              <table className="rank-table" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 24, width: '28%' }}>Funcionalidad</th>
                    <th style={{ textAlign: 'center' }}>Free</th>
                    <th style={{ textAlign: 'center' }}>Basic</th>
                    <th style={{ textAlign: 'center', background: 'var(--black)', color: 'var(--neon)' }}>Pro</th>
                    <th style={{ textAlign: 'center' }}>Ilimitado</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { f: 'Juegos por mes',       vs: ['3', '10', '∞', '∞'] },
                    { f: 'Jug. por juego',        vs: ['8', '12', '24', '32'] },
                    { f: 'Torneos por mes',       vs: ['1', '3', '5', '∞'] },
                    { f: 'Jug. por torneo',       vs: ['8', '16', '64', '∞'] },
                    { f: 'Ligas activas',         vs: ['1', '3', '10', '∞'] },
                    { f: 'Jugadores por liga',    vs: ['8', '16', '32', '∞'] },
                    { f: 'Clasificación',         vs: ['Básica', 'Completa', 'Avanzada', 'Avanzada'] },
                    { f: 'Categorías',            vs: ['–', '–', '✓', '✓'] },
                    { f: 'Estadísticas avanzadas',vs: ['–', '–', '✓', '✓'] },
                    { f: 'Soporte por email',     vs: ['–', '✓', '✓', '✓'] },
                  ].map(row => (
                    <tr key={row.f}>
                      <td style={{ paddingLeft: 24, fontWeight: 500, color: 'var(--black)', fontSize: 13 }}>{row.f}</td>
                      {row.vs.map((v, i) => (
                        <td key={i} style={{
                          textAlign: 'center', fontSize: 13,
                          background: i === 2 ? 'rgba(0,0,0,0.025)' : undefined,
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
                { q: '¿Cómo funciona la prueba gratis?', a: 'Las Ligas tienen 14 días sin tarjeta de crédito. Si no continuás, el plan vuelve a Free automáticamente.' },
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

          {/* Promo code input */}
          <PromoCodeInput onApply={setAppliedCode} applied={appliedCode} />

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
