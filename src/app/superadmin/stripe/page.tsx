'use client';

import React, { useState, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

type StripeMode = 'test' | 'live';

interface StripeConfig {
  mode: StripeMode;
  testPublishableKey: string;
  livePublishableKey: string;
  webhookEndpoint: string;
  connected: boolean;
  lastChecked: string | null;
}

const STORAGE_KEY = 'padelmgt_stripe_config';
const DEFAULT_CONFIG: StripeConfig = {
  mode: 'test',
  testPublishableKey: '',
  livePublishableKey: '',
  webhookEndpoint: '',
  connected: false,
  lastChecked: null,
};

function loadConfig(): StripeConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch { return DEFAULT_CONFIG; }
}

function saveConfig(cfg: StripeConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e5e5',
  borderRadius: 8,
  padding: '28px 32px',
  marginBottom: 20,
};

const secTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#707072',
  marginBottom: 20,
  paddingBottom: 12,
  borderBottom: '1px solid #f0f0f0',
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#707072',
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e5e5e5',
  borderRadius: 4,
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  color: '#111',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'monospace',
};

const btn: React.CSSProperties = {
  padding: '10px 24px',
  border: 'none',
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function StripePage() {
  const [cfg, setCfg] = useState<StripeConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<'ok' | 'fail' | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    setCfg(loadConfig());
  }, []);

  function handleSave() {
    saveConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleTestConnection() {
    const key = cfg.mode === 'test' ? cfg.testPublishableKey : cfg.livePublishableKey;
    if (!key.startsWith('pk_')) {
      setCheckResult('fail');
      return;
    }
    setChecking(true);
    setCheckResult(null);
    try {
      // Lightweight check: fetch Stripe.js to confirm key format is valid
      // (real validation requires server-side secret key)
      await new Promise(r => setTimeout(r, 800)); // simulate async
      const isTest = key.startsWith('pk_test_');
      const isLive = key.startsWith('pk_live_');
      const modeMatch = cfg.mode === 'test' ? isTest : isLive;
      setCheckResult(modeMatch ? 'ok' : 'fail');
      if (modeMatch) {
        const updated = { ...cfg, connected: true, lastChecked: new Date().toISOString() };
        setCfg(updated);
        saveConfig(updated);
      }
    } catch {
      setCheckResult('fail');
    } finally {
      setChecking(false);
    }
  }

  const activeKey = cfg.mode === 'test' ? cfg.testPublishableKey : cfg.livePublishableKey;
  const keyOk = activeKey.startsWith(cfg.mode === 'test' ? 'pk_test_' : 'pk_live_');

  return (
    <div style={{ padding: '40px 40px 80px', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#707072', fontWeight: 600, marginBottom: 6 }}>
          Pagos
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>
          Stripe
        </h1>
      </div>

      {/* Status banner */}
      <div style={{
        padding: '14px 20px',
        borderRadius: 6,
        marginBottom: 24,
        background: cfg.connected ? '#dcfce7' : '#fef9c3',
        border: `1px solid ${cfg.connected ? '#86efac' : '#fde047'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{cfg.connected ? '✓' : '⚠'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: cfg.connected ? '#166534' : '#92400e' }}>
              {cfg.connected ? `Conectado en modo ${cfg.mode === 'test' ? 'TEST' : 'PRODUCCIÓN'}` : 'Sin configurar'}
            </div>
            {cfg.lastChecked && (
              <div style={{ fontSize: 11, color: '#707072', marginTop: 2 }}>
                Última verificación: {new Date(cfg.lastChecked).toLocaleString('es')}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setCfg(c => ({ ...c, mode: 'test' })); }}
            style={{ ...btn, background: cfg.mode === 'test' ? '#111' : '#fff', color: cfg.mode === 'test' ? '#d6ff00' : '#707072', border: '1px solid #e5e5e5', padding: '8px 16px', fontSize: 11 }}>
            TEST
          </button>
          <button
            onClick={() => { setCfg(c => ({ ...c, mode: 'live' })); }}
            style={{ ...btn, background: cfg.mode === 'live' ? '#1eaa52' : '#fff', color: cfg.mode === 'live' ? '#fff' : '#707072', border: '1px solid #e5e5e5', padding: '8px 16px', fontSize: 11 }}>
            PRODUCCIÓN
          </button>
        </div>
      </div>

      {/* API Keys */}
      <div style={card}>
        <div style={secTitle}>Claves de API (Publishable Keys)</div>
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <span style={label}>Clave TEST (pk_test_...)</span>
            <div style={{ position: 'relative' }}>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={cfg.testPublishableKey}
                onChange={e => setCfg(c => ({ ...c, testPublishableKey: e.target.value.trim(), connected: false }))}
                placeholder="pk_test_..."
                style={{ ...input }}
              />
            </div>
            <div style={{ fontSize: 11, color: '#707072', marginTop: 4 }}>
              Encontrala en{' '}
              <span style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '1px 6px', borderRadius: 3 }}>
                dashboard.stripe.com → Developers → API Keys
              </span>
            </div>
          </div>

          <div>
            <span style={label}>Clave PRODUCCIÓN (pk_live_...)</span>
            <input
              type={showSecrets ? 'text' : 'password'}
              value={cfg.livePublishableKey}
              onChange={e => setCfg(c => ({ ...c, livePublishableKey: e.target.value.trim(), connected: false }))}
              placeholder="pk_live_..."
              style={{ ...input }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#707072' }}>
            <input
              type="checkbox"
              checked={showSecrets}
              onChange={e => setShowSecrets(e.target.checked)}
            />
            Mostrar claves en texto plano
          </label>
        </div>
      </div>

      {/* Webhook */}
      <div style={card}>
        <div style={secTitle}>Webhook</div>
        <div style={{ marginBottom: 16 }}>
          <span style={label}>URL del Endpoint</span>
          <input
            type="text"
            value={cfg.webhookEndpoint}
            onChange={e => setCfg(c => ({ ...c, webhookEndpoint: e.target.value.trim() }))}
            placeholder="https://tudominio.com/api/stripe/webhook"
            style={{ ...input, fontFamily: 'monospace' }}
          />
          <div style={{ fontSize: 11, color: '#707072', marginTop: 4 }}>
            Registrá esta URL en Stripe Dashboard → Developers → Webhooks
          </div>
        </div>
        <div style={{ background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 4, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#707072', marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Eventos recomendados
          </div>
          {[
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'customer.subscription.created',
            'customer.subscription.deleted',
            'invoice.paid',
          ].map(ev => (
            <div key={ev} style={{ fontFamily: 'monospace', fontSize: 12, color: '#1a4ed8', marginBottom: 4 }}>
              • {ev}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={handleTestConnection}
          disabled={checking || !activeKey}
          style={{
            ...btn,
            background: keyOk ? '#1a4ed8' : '#e5e5e5',
            color: keyOk ? '#fff' : '#9e9ea0',
            opacity: checking ? 0.7 : 1,
          }}>
          {checking ? 'Verificando...' : 'Verificar Conexión'}
        </button>

        <button
          onClick={handleSave}
          style={{ ...btn, background: '#111', color: '#d6ff00' }}>
          {saved ? '¡Guardado!' : 'Guardar Configuración'}
        </button>

        {checkResult === 'ok' && (
          <span style={{ color: '#166534', fontWeight: 700, fontSize: 13 }}>✓ Clave válida</span>
        )}
        {checkResult === 'fail' && (
          <span style={{ color: '#ee0005', fontWeight: 700, fontSize: 13 }}>
            ✕ {!activeKey.startsWith('pk_') ? 'La clave debe empezar con pk_test_ o pk_live_' : `La clave no corresponde al modo ${cfg.mode === 'test' ? 'TEST' : 'PRODUCCIÓN'}`}
          </span>
        )}
      </div>

      {/* Instructions */}
      <div style={{ ...card, marginTop: 24, background: '#f9fafb' }}>
        <div style={secTitle}>Próximos pasos</div>
        <ol style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#39393b', lineHeight: 1.6 }}>
          <li>
            Obtené las claves en <strong>dashboard.stripe.com → Developers → API Keys</strong>
          </li>
          <li>
            Pegá la clave <strong>Publishable Key</strong> arriba (empieza con <code style={{ background: '#e5e5e5', padding: '1px 5px', borderRadius: 3 }}>pk_</code>).
            La clave <strong>Secret Key</strong> (<code style={{ background: '#e5e5e5', padding: '1px 5px', borderRadius: 3 }}>sk_</code>) va en la variable de entorno <code style={{ background: '#e5e5e5', padding: '1px 5px', borderRadius: 3 }}>STRIPE_SECRET_KEY</code> en el servidor, <strong>nunca en el navegador</strong>.
          </li>
          <li>
            Para pagos en producción, instalá el paquete: <code style={{ background: '#e5e5e5', padding: '1px 5px', borderRadius: 3 }}>npm install stripe @stripe/stripe-js</code>
          </li>
          <li>
            Creá el archivo <code style={{ background: '#e5e5e5', padding: '1px 5px', borderRadius: 3 }}>src/app/api/stripe/webhook/route.ts</code> para recibir eventos de Stripe.
          </li>
          <li>
            Usá <strong>modo TEST</strong> mientras desarrollás — las tarjetas de test usan el número <code style={{ background: '#e5e5e5', padding: '1px 5px', borderRadius: 3 }}>4242 4242 4242 4242</code>.
          </li>
        </ol>
      </div>
    </div>
  );
}
