'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface PriceStatus {
  planId: string;
  label: string;
  envVar: string;
  set: boolean;
}

interface ConfigStatus {
  configured: boolean;
  mode: 'test' | 'live' | null;
  apiReachable: boolean;
  error: string | null;
  webhookSecretSet: boolean;
  webhookSecretTestSet: boolean;
  appUrl: string;
  prices: PriceStatus[];
}

interface RevenueSummary {
  connected: boolean;
  livemode?: boolean;
  monthRevenueCents?: number;
  mrrCents?: number;
  activeSubscriptions?: number;
}

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, padding: '24px 28px', marginBottom: 20,
};
const secTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: '#707072', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #f0f0f0',
};
const mono: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 12, background: '#f5f5f5', padding: '2px 6px', borderRadius: 3, wordBreak: 'break-all',
};

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span style={{ color: ok ? '#166534' : '#dc2626', fontWeight: 700 }}>{ok ? '✓' : '✕'}</span>;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ padding: '4px 10px', border: '1px solid #e5e5e5', background: '#fff', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#707072', borderRadius: 4 }}
    >
      {copied ? 'Copiado ✓' : 'Copiar'}
    </button>
  );
}

export default function StripePage() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, revenueRes] = await Promise.all([
        fetch('/api/sa/stripe/config-status'),
        fetch('/api/superadmin/stripe/summary'),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (revenueRes.ok) setRevenue(await revenueRes.json());
    } catch { /* status stays null → treated as "unknown" in the UI */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const appUrl = status?.appUrl ?? 'https://padelmgt.com';
  const connected = !!status?.configured && status.apiReachable;

  return (
    <div style={{ padding: '40px 40px 80px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#707072', fontWeight: 600, marginBottom: 6 }}>Pagos</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>Stripe</h1>
      </div>

      {/* Status banner */}
      <div style={{
        padding: '14px 20px', borderRadius: 6, marginBottom: 24,
        background: loading ? '#f5f5f5' : connected ? '#dcfce7' : '#fef2f2',
        border: `1px solid ${loading ? '#e5e5e5' : connected ? '#86efac' : '#fca5a5'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{loading ? '…' : connected ? '✓' : '⚠'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: loading ? '#707072' : connected ? '#166534' : '#991b1b' }}>
              {loading
                ? 'Consultando Stripe…'
                : !status?.configured
                  ? 'Sin configurar — falta STRIPE_SECRET_KEY en Vercel'
                  : connected
                    ? `Conectado — modo ${status.mode === 'live' ? 'PRODUCCIÓN' : 'TEST'}`
                    : `Clave configurada pero Stripe rechazó la conexión: ${status.error ?? 'error desconocido'}`}
            </div>
          </div>
        </div>
        <button
          onClick={loadStatus}
          disabled={loading}
          style={{ padding: '8px 18px', border: 'none', borderRadius: 4, cursor: loading ? 'wait' : 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#111', color: '#d6ff00' }}
        >
          {loading ? 'Verificando…' : 'Verificar conexión'}
        </button>
      </div>

      {/* Revenue snapshot */}
      {revenue?.connected && (
        <div style={card}>
          <div style={secTitle}>Ingresos (en vivo)</div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{fmtMoney(revenue.monthRevenueCents ?? 0)}</div>
              <div style={{ fontSize: 11, color: '#707072', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Este mes</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{fmtMoney(revenue.mrrCents ?? 0)}</div>
              <div style={{ fontSize: 11, color: '#707072', textTransform: 'uppercase', letterSpacing: '0.06em' }}>MRR estimado</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{revenue.activeSubscriptions ?? 0}</div>
              <div style={{ fontSize: 11, color: '#707072', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suscripciones activas</div>
            </div>
          </div>
          {revenue.livemode === false && (
            <div style={{ marginTop: 12, fontSize: 11, color: '#92400e', fontWeight: 600 }}>⚠ Estos datos son del modo TEST de Stripe, no de producción.</div>
          )}
        </div>
      )}

      {/* Secret key */}
      <div style={card}>
        <div style={secTitle}>Clave secreta (servidor)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <StatusDot ok={!!status?.configured} />
          <span style={{ fontSize: 13 }}>
            {status?.configured ? `STRIPE_SECRET_KEY configurada (modo ${status.mode === 'live' ? 'PRODUCCIÓN' : 'TEST'})` : 'STRIPE_SECRET_KEY no configurada'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#707072', lineHeight: 1.6 }}>
          Esta clave <strong>nunca se ingresa desde este panel</strong> — vive solo en Vercel: <strong>padel-mgt → Settings → Environment Variables</strong>.
          Sacala de <span style={mono}>dashboard.stripe.com → Developers → API keys</span> (modo Test o Live según el toggle arriba a la derecha del dashboard de Stripe)
          y después de guardarla hacé un <strong>Redeploy</strong> para que tome efecto.
        </div>
      </div>

      {/* Webhooks */}
      <div style={card}>
        <div style={secTitle}>Webhooks</div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <StatusDot ok={!!status?.webhookSecretSet} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Suscripciones — {status?.webhookSecretSet ? 'STRIPE_WEBHOOK_SECRET configurado' : 'STRIPE_WEBHOOK_SECRET no configurado'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={mono}>{appUrl}/api/stripe/webhook</span>
            <CopyBtn text={`${appUrl}/api/stripe/webhook`} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 6 }}>
            <StatusDot ok={!!status?.webhookSecretTestSet} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {status?.webhookSecretTestSet ? 'STRIPE_WEBHOOK_SECRET_TEST configurado' : 'STRIPE_WEBHOOK_SECRET_TEST no configurado'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
            Necesario si esta misma URL está registrada como endpoint también en el modo Test de Stripe — cada modo firma con un secreto distinto.
          </div>
          <div style={{ fontSize: 11, color: '#707072', lineHeight: 1.6 }}>
            Creá este endpoint en <span style={mono}>Stripe → Developers → Webhooks</span> con los eventos:{' '}
            {['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed'].map(ev => (
              <span key={ev} style={{ ...mono, marginRight: 4, display: 'inline-block', marginTop: 4 }}>{ev}</span>
            ))}
            <br />Copiá el <em>Signing secret</em> (<span style={mono}>whsec_...</span>) a <span style={mono}>STRIPE_WEBHOOK_SECRET</span> en Vercel.
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={mono}>{appUrl}/api/webhooks/stripe</span>
            <CopyBtn text={`${appUrl}/api/webhooks/stripe`} />
          </div>
          <div style={{ fontSize: 11, color: '#707072', lineHeight: 1.6 }}>
            Opcional — solo si usás <strong>códigos promo de pago en Torneo Personalizado</strong>: cuenta los usos de la promo al completarse el checkout.
            Evento: <span style={mono}>checkout.session.completed</span>. Comparte el mismo <span style={mono}>STRIPE_WEBHOOK_SECRET</span> solo si registrás
            este endpoint como el <em>mismo</em> destino en Stripe; si creás un endpoint separado, necesita su propio signing secret — este código no lo soporta hoy, así que si lo usás, apuntá ambos eventos al primer endpoint.
          </div>
        </div>
      </div>

      {/* Price IDs */}
      <div style={card}>
        <div style={secTitle}>Precios (Price IDs)</div>
        {status?.prices ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {status.prices.map(p => (
              <div key={p.envVar} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <StatusDot ok={p.set} />
                <span style={{ minWidth: 160 }}>{p.label}</span>
                <span style={{ ...mono, color: '#707072' }}>{p.envVar}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#707072', marginBottom: 16 }}>Sin datos todavía.</div>
        )}
        <div style={{ fontSize: 12, color: '#39393b', lineHeight: 1.6, background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: 4, padding: '12px 16px' }}>
          Para crear los precios en Stripe automáticamente a partir de los planes activos, andá a{' '}
          <Link href="/superadmin/plans" style={{ color: '#1a4ed8', fontWeight: 600 }}>Planes y Precios</Link> y usá el botón <strong>&quot;Sincronizar con Stripe&quot;</strong>.
          Después copiá los Price IDs resultantes (Stripe → Products) en las variables de arriba, en Vercel.
        </div>
      </div>
    </div>
  );
}
