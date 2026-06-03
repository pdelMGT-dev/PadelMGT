'use client';

import Link from 'next/link';
import { useState } from 'react';

const plans = [
  {
    id: 'free',
    name: 'Gratis',
    price: '$0',
    period: 'para siempre',
    role: 'Jugador',
    desc: 'Para jugadores que quieren empezar a rankear.',
    features: [
      'Perfil de jugador',
      'Ranking personal',
      'Historial de juegos',
      'Invitaciones por QR',
      'Juegos rápidos',
      'Torneos limitados (3/mes)',
    ],
    cta: 'Crear cuenta gratis',
    href: '/signup?role=player',
    highlight: false,
  },
  {
    id: 'club',
    name: 'Club',
    price: '$49',
    period: 'por mes',
    role: 'Club Manager',
    desc: 'Para gestionar un club, canchas y torneos sin límites.',
    features: [
      'Dashboard completo del club',
      'Torneos ilimitados',
      'Gestión de miembros',
      'Importar jugadores (CSV)',
      'Reservas en línea',
      'Estadísticas avanzadas',
      'Soporte prioritario',
    ],
    cta: 'Comenzar prueba de 14 días',
    href: null,
    highlight: true,
  },
  {
    id: 'liga',
    name: 'Liga',
    price: '$199',
    period: 'por mes',
    role: 'Liga / Organizador',
    desc: 'Para organizar ligas multi-club con ascensos y descensos.',
    features: [
      'Todo lo de Club',
      'Multi-club / multi-sede',
      'Tabla automática de posiciones',
      'Ascensos y descensos',
      'Gestión de temporadas',
      'White-label (tu marca)',
      'API access',
    ],
    cta: 'Comenzar prueba de 14 días',
    href: null,
    highlight: false,
  },
  {
    id: 'federation',
    name: 'Federación',
    price: 'Custom',
    period: 'precio a medida',
    role: 'Federación Nacional',
    desc: 'Para federaciones que necesitan control total y escala.',
    features: [
      'Todo lo de Liga',
      'Ranking oficial nacional',
      'Multi-categoría y género',
      'Torneos sancionados',
      'Integración con sistemas propios',
      'SLA garantizado',
      'Gerente de cuenta dedicado',
    ],
    cta: 'Contactar Equipo',
    href: '/about',
    highlight: false,
  },
];

const faq = [
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Podés hacer upgrade o downgrade desde tu dashboard en cualquier momento. Los cambios se aplican al siguiente ciclo de facturación.' },
  { q: '¿Cómo funciona la prueba gratuita?', a: 'Los planes Club y Liga incluyen 14 días de prueba sin tarjeta de crédito. Si decidís no continuar, tu cuenta se convierte automáticamente al plan Gratis.' },
  { q: '¿Cuántos torneos puedo crear?', a: 'En el plan Gratis podés participar en torneos pero crear hasta 3 por mes. En Club y Liga, los torneos son ilimitados.' },
  { q: '¿El precio incluye impuestos?', a: 'Los precios mostrados no incluyen impuestos locales (IVA / VAT) que pueden aplicar según tu país.' },
];

function CheckoutButton({ plan, highlight }: { plan: typeof plans[number]; highlight: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Free and Federation plans use normal links
  if (plan.href) {
    return (
      <Link href={plan.href} className="btn btn-lg" style={{
        display: 'block', textAlign: 'center', borderRadius: 0,
        background: highlight ? 'var(--neon)' : 'transparent',
        color: 'var(--black)',
        border: highlight ? 'none' : '2px solid var(--black)',
        fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 13,
      }}>
        {plan.cta}
      </Link>
    );
  }

  async function handleCheckout() {
    setError('');
    setLoading(true);
    try {
      const userRaw = typeof window !== 'undefined' ? localStorage.getItem('padelmgt_user') : null;
      const userEmail = userRaw ? (JSON.parse(userRaw) as { email?: string }).email : undefined;

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, userEmail }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Error al iniciar el pago. Intentá de nuevo.');
        setLoading(false);
      }
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="btn btn-lg"
        style={{
          display: 'block', width: '100%', textAlign: 'center', borderRadius: 0,
          background: highlight ? 'var(--neon)' : 'transparent',
          color: 'var(--black)',
          border: highlight ? 'none' : '2px solid var(--black)',
          fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 13,
          opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Redirigiendo...' : plan.cta}
      </button>
      {error && (
        <p style={{ marginTop: 8, fontSize: 12, color: '#dc2626', textAlign: 'center' }}>{error}</p>
      )}
    </div>
  );
}

export default function PricingPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Planes para cada tipo de usuario.</div>
          <h1 className="page-title">PLANES</h1>
          <p className="page-sub">Desde el jugador casual hasta la federación nacional. Elige tu plan y empieza hoy.</p>
        </div>
      </div>

      <section style={{ padding: '64px 48px 96px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* Pricing grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 80 }}>
            {plans.map((plan) => (
              <div key={plan.name} style={{ background: plan.highlight ? 'var(--black)' : '#fff', padding: '40px 32px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {plan.highlight && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--neon)' }} />}
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: 20, right: 24, background: 'var(--neon)', color: 'var(--black)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px' }}>
                    Popular
                  </div>
                )}

                <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: plan.highlight ? 'var(--neon)' : 'var(--grey-400)', fontWeight: 600, marginBottom: 10 }}>{plan.role}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', color: plan.highlight ? '#fff' : 'var(--black)', marginBottom: 4 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, color: plan.highlight ? '#fff' : 'var(--black)', letterSpacing: '-0.03em' }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.5)' : 'var(--grey-400)' }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.6)' : 'var(--grey-500)', lineHeight: 1.5, marginBottom: 28, minHeight: 40 }}>{plan.desc}</p>

                <ul style={{ margin: '0 0 32px', padding: 0, listStyle: 'none', flex: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.8)' : 'var(--grey-600)', marginBottom: 10, lineHeight: 1.4 }}>
                      <span style={{ color: plan.highlight ? 'var(--neon)' : 'var(--turf-green)', fontWeight: 700, fontSize: 12, flexShrink: 0, paddingTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <CheckoutButton plan={plan} highlight={plan.highlight} />
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div style={{ marginBottom: 80 }}>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px, 4vw, 56px)', marginBottom: 40 }}>COMPARAR PLANES</h2>
            <div style={{ border: '1px solid var(--grey-200)', overflowX: 'auto' }}>
              <table className="rank-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 32 }}>Funcionalidad</th>
                    {plans.map((p) => (
                      <th key={p.name} style={{ textAlign: 'center', background: p.highlight ? 'var(--black)' : undefined, color: p.highlight ? 'var(--neon)' : undefined }}>{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Torneos (crear)', vals: ['3/mes', '∞', '∞', '∞'] },
                    { feature: 'Miembros', vals: ['–', '500', '5,000', 'Ilimitado'] },
                    { feature: 'Ranking personal', vals: ['✓', '✓', '✓', '✓'] },
                    { feature: 'Reservas en línea', vals: ['–', '✓', '✓', '✓'] },
                    { feature: 'Multi-sede', vals: ['–', '–', '✓', '✓'] },
                    { feature: 'White-label', vals: ['–', '–', '✓', '✓'] },
                    { feature: 'API access', vals: ['–', '–', '✓', '✓'] },
                    { feature: 'SLA garantizado', vals: ['–', '–', '–', '✓'] },
                  ].map((row) => (
                    <tr key={row.feature}>
                      <td style={{ paddingLeft: 32, fontWeight: 500, color: 'var(--black)' }}>{row.feature}</td>
                      {row.vals.map((v, i) => (
                        <td key={i} style={{ textAlign: 'center', background: i === 1 ? 'rgba(0,0,0,0.02)' : undefined, fontFamily: v === '✓' || v === '–' ? undefined : 'var(--font-display)', fontWeight: v !== '–' ? 600 : 400, color: v === '✓' ? 'var(--turf-green)' : v === '–' ? 'var(--grey-300)' : 'var(--black)' }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px, 4vw, 56px)', marginBottom: 40 }}>PREGUNTAS FRECUENTES</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
              {faq.map((item, i) => (
                <div key={i} style={{ background: '#fff', padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)' }}>{item.q}</div>
                  <div style={{ fontSize: 14, color: 'var(--grey-500)', lineHeight: 1.6 }}>{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: '#111', color: '#fff', padding: '80px 48px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 0.95 }}>¿DUDAS SOBRE EL PLAN?</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: 0 }}>Habla con nuestro equipo y encontramos la solución ideal para tu organización.</p>
          </div>
          <Link href="/about" className="btn btn-on-dark btn-lg" style={{ flexShrink: 0 }}>Contactar Equipo</Link>
        </div>
      </section>
    </div>
  );
}
