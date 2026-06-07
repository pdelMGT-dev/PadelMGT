'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getPlans,
  updatePlan,
  getPlanChanges,
  type SubscriptionPlan,
  type PlanFeature,
} from '@/lib/plan-store';

const GROUP_LABELS: Record<string, string> = {
  player: 'Jugador',
  liga: 'Liga',
  club: 'Club',
  federation: 'Federación',
  special: 'Especial',
};

const PLAN_ACCENT: Record<string, string> = {
  free:           'var(--grey-500)',
  player_pro:     '#92400e',
  liga_free:      '#0369a1',
  liga_basic:     '#1d4ed8',
  liga_pro:       'var(--black)',
  liga_unlimited: '#7c3aed',
  club_starter:   '#166534',
  club_pro:       '#065f46',
  club_liga:      '#134e4a',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)',
  fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none',
  boxSizing: 'border-box', color: 'var(--black)', background: '#fff',
};

const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--grey-500)', display: 'block', marginBottom: 5,
};

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div style={{ background: '#fff', padding: '32px 36px', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {children}
      </div>
    </div>
  );
}

interface StripeSyncStatus {
  status: 'idle' | 'syncing' | 'ok' | 'error' | 'unconfigured';
  message: string;
  lastSync: string | null;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [tab, setTab] = useState<'pricing' | 'history'>('pricing');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editForm, setEditForm] = useState<Partial<SubscriptionPlan>>({});
  const [editFeatures, setEditFeatures] = useState<PlanFeature[]>([]);
  const [stripeSync, setStripeSync] = useState<StripeSyncStatus>({ status: 'idle', message: '', lastSync: null });
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);
  const [stripePrices, setStripePrices] = useState<Record<string, { monthly?: number; annual?: number }>>({});

  useEffect(() => {
    setPlans(getPlans());
  }, []);

  const syncFromStripe = useCallback(async () => {
    setStripeSync(s => ({ ...s, status: 'syncing', message: 'Consultando Stripe...' }));
    try {
      const res = await fetch('/api/stripe/prices');
      if (res.status === 503) {
        setStripeSync({ status: 'unconfigured', message: 'Stripe no configurado — configurá STRIPE_SECRET_KEY en Vercel.', lastSync: null });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as Record<string, { monthly?: number; annual?: number }>;
      setStripePrices(data);
      setStripeSync({ status: 'ok', message: 'Precios sincronizados desde Stripe', lastSync: new Date().toISOString() });
    } catch {
      setStripeSync({ status: 'error', message: 'Error conectando con Stripe. Verificá la configuración.', lastSync: null });
    }
  }, []);

  useEffect(() => {
    syncFromStripe();
  }, [syncFromStripe]);

  function toast(msg: string, ok = true) {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }

  function openEdit(plan: SubscriptionPlan) {
    setEditingPlan(plan);
    setEditForm({
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceAnnual: plan.priceAnnual,
      stripePriceIdMonthly: plan.stripePriceIdMonthly ?? '',
      stripePriceIdAnnual: plan.stripePriceIdAnnual ?? '',
      isFeatured: plan.isFeatured,
      isActive: plan.isActive,
    });
    setEditFeatures(plan.features.map(f => ({ ...f })));
  }

  function handleSave() {
    if (!editingPlan) return;
    const updated = updatePlan(editingPlan.id, {
      ...editForm,
      features: editFeatures,
      stripePriceIdMonthly: editForm.stripePriceIdMonthly || undefined,
      stripePriceIdAnnual: editForm.stripePriceIdAnnual || undefined,
    });
    if (!updated) { toast('Error al guardar', false); return; }
    setPlans(getPlans());
    setEditingPlan(null);
    toast('Plan actualizado');
  }

  function handleFeatureChange(idx: number, field: keyof PlanFeature, value: string | boolean) {
    setEditFeatures(f => f.map((feat, i) => i === idx ? { ...feat, [field]: value } : feat));
  }

  // Group plans by category
  const grouped = plans.reduce<Record<string, SubscriptionPlan[]>>((acc, p) => {
    const g = p.group ?? 'player';
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});

  const changes = getPlanChanges();

  const syncBg: Record<StripeSyncStatus['status'], string> = {
    idle: '#fff', syncing: '#f0f9ff', ok: '#f0fdf4', error: '#fef2f2', unconfigured: '#fffbeb',
  };
  const syncBorder: Record<StripeSyncStatus['status'], string> = {
    idle: 'var(--grey-200)', syncing: '#bae6fd', ok: '#bbf7d0', error: '#fecaca', unconfigured: '#fcd34d',
  };
  const syncTextColor: Record<StripeSyncStatus['status'], string> = {
    idle: 'var(--grey-600)', syncing: '#0369a1', ok: '#166534', error: '#dc2626', unconfigured: '#92400e',
  };

  return (
    <div style={{ padding: '32px 40px', fontFamily: 'var(--font-body)' }}>
      {/* Toasts */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.ok ? '#0a0a0a' : '#dc2626', color: '#fff', padding: '12px 20px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', borderLeft: `3px solid ${t.ok ? 'var(--turf-green)' : '#fca5a5'}` }}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Suscripciones</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Planes y Precios</h1>
      </div>

      {/* Stripe sync banner */}
      {stripeSync.status !== 'idle' && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12,
          background: syncBg[stripeSync.status],
          border: `1px solid ${syncBorder[stripeSync.status]}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>
              {stripeSync.status === 'ok' ? '✓' : stripeSync.status === 'syncing' ? '⟳' : stripeSync.status === 'error' ? '✕' : '⚠'}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: syncTextColor[stripeSync.status] }}>
                {stripeSync.message}
              </div>
              {stripeSync.lastSync && (
                <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 2 }}>
                  Sincronizado: {new Date(stripeSync.lastSync).toLocaleString('es-ES')}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={syncFromStripe}
            disabled={stripeSync.status === 'syncing'}
            style={{ padding: '6px 16px', border: '1px solid var(--grey-200)', background: '#fff', cursor: stripeSync.status === 'syncing' ? 'wait' : 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-600)' }}
          >
            {stripeSync.status === 'syncing' ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--grey-200)', marginBottom: 28 }}>
        {([
          { key: 'pricing', label: 'Tabla de precios' },
          { key: 'history', label: `Historial de cambios (${changes.length})` },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: tab === key ? 'var(--black)' : 'var(--grey-400)',
            borderBottom: tab === key ? '2px solid var(--turf-green)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* PRICING TAB */}
      {tab === 'pricing' && (
        <div>
          {Object.entries(grouped).map(([group, groupPlans]) => (
            <div key={group} style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)' }}>
                {GROUP_LABELS[group] ?? group}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {groupPlans.map(plan => {
                  const accent = PLAN_ACCENT[plan.id] ?? 'var(--grey-500)';
                  const stripeData = stripePrices[plan.id];
                  const hasDiff = stripeData && (
                    (stripeData.monthly !== undefined && Math.abs(stripeData.monthly - plan.priceMonthly) > 0.01) ||
                    (stripeData.annual !== undefined && Math.abs(stripeData.annual - plan.priceAnnual) > 0.01)
                  );

                  return (
                    <div key={plan.id} style={{ background: '#fff', border: `1px solid ${plan.isFeatured ? accent : 'var(--grey-200)'}`, borderTop: `3px solid ${accent}`, padding: '20px', position: 'relative' }}>
                      {plan.isFeatured && (
                        <div style={{ position: 'absolute', top: -1, right: 16, background: accent, color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                          Destacado
                        </div>
                      )}
                      {!plan.isActive && (
                        <div style={{ position: 'absolute', top: 10, right: 10, background: '#fee2e2', color: '#dc2626', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Inactivo
                        </div>
                      )}

                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{plan.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 14 }}>{plan.description}</div>

                      <div style={{ background: 'var(--grey-50)', padding: '12px', marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-end' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--grey-500)', letterSpacing: '0.08em' }}>Mensual</span>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
                              {plan.priceMonthly === 0 ? 'Gratis' : `$${plan.priceMonthly.toFixed(2)}`}
                            </span>
                            {stripeData?.monthly !== undefined && (
                              <div style={{ fontSize: 10, color: hasDiff ? '#dc2626' : '#166534', marginTop: 1 }}>
                                Stripe: ${stripeData.monthly.toFixed(2)} {hasDiff ? '⚠' : '✓'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--grey-500)', letterSpacing: '0.08em' }}>Anual</span>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
                              {plan.priceAnnual === 0 ? 'Gratis' : `$${plan.priceAnnual.toFixed(2)}`}
                            </span>
                            {stripeData?.annual !== undefined && (
                              <div style={{ fontSize: 10, color: hasDiff ? '#dc2626' : '#166534', marginTop: 1 }}>
                                Stripe: ${stripeData.annual.toFixed(2)} {hasDiff ? '⚠' : '✓'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                        {plan.features.map((f, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                            <span style={{ color: f.included ? '#166534' : 'var(--grey-300)', fontWeight: 700, flexShrink: 0 }}>{f.included ? '✓' : '–'}</span>
                            <span style={{ color: f.included ? 'var(--grey-700)' : 'var(--grey-400)' }}>{f.text}</span>
                          </div>
                        ))}
                      </div>

                      {(plan.stripePriceIdMonthly || plan.stripePriceIdAnnual) && (
                        <div style={{ marginBottom: 14, fontSize: 10, color: 'var(--grey-400)', fontFamily: 'monospace', lineHeight: 1.7, background: 'var(--grey-50)', padding: '6px 8px', wordBreak: 'break-all' }}>
                          {plan.stripePriceIdMonthly && <div>mo: {plan.stripePriceIdMonthly}</div>}
                          {plan.stripePriceIdAnnual && <div>yr: {plan.stripePriceIdAnnual}</div>}
                        </div>
                      )}

                      <button
                        onClick={() => openEdit(plan)}
                        style={{ width: '100%', padding: '9px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                      >
                        Editar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div>
          {changes.length === 0 ? (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--grey-400)', border: '1px solid var(--grey-200)' }}>
              <div style={{ fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Sin historial</div>
              <div style={{ fontSize: 13 }}>Los cambios de plan de usuarios aparecerán aquí.</div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                    {['Usuario', 'De', 'A', 'Cambiado por', 'Motivo', 'Fecha'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {changes.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{c.userName}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{c.userEmail}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: 'var(--grey-100)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{c.fromPlan}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{c.toPlan}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)' }}>{c.changedBy}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', fontStyle: c.reason ? 'normal' : 'italic' }}>{c.reason ?? '–'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{new Date(c.changedAt).toLocaleString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPlan && (
        <Modal onClose={() => setEditingPlan(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
              Editar — {editingPlan.name}
            </h2>
            <button onClick={() => setEditingPlan(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', padding: 0, lineHeight: 1 }}>×</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Descripción</label>
                <input style={inp} value={editForm.description ?? ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Precio mensual (USD)</label>
                <input style={inp} type="number" min="0" step="0.01" value={editForm.priceMonthly ?? 0} onChange={e => setEditForm(f => ({ ...f, priceMonthly: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={lbl}>Precio anual (USD)</label>
                <input style={inp} type="number" min="0" step="0.01" value={editForm.priceAnnual ?? 0} onChange={e => setEditForm(f => ({ ...f, priceAnnual: Number(e.target.value) }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Stripe Price ID — Mensual</label>
                <input style={{ ...inp, fontFamily: 'monospace', fontSize: 11 }} placeholder="price_..." value={editForm.stripePriceIdMonthly ?? ''} onChange={e => setEditForm(f => ({ ...f, stripePriceIdMonthly: e.target.value.trim() }))} />
              </div>
              <div>
                <label style={lbl}>Stripe Price ID — Anual</label>
                <input style={{ ...inp, fontFamily: 'monospace', fontSize: 11 }} placeholder="price_..." value={editForm.stripePriceIdAnnual ?? ''} onChange={e => setEditForm(f => ({ ...f, stripePriceIdAnnual: e.target.value.trim() }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={editForm.isActive ?? true} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))} />
                Plan activo
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={editForm.isFeatured ?? false} onChange={e => setEditForm(f => ({ ...f, isFeatured: e.target.checked }))} />
                Destacado
              </label>
            </div>

            {/* Features editor */}
            <div>
              <div style={{ ...lbl, marginBottom: 10 }}>Características</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {editFeatures.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleFeatureChange(i, 'included', !f.included)}
                      style={{ width: 28, height: 28, border: `2px solid ${f.included ? '#166534' : 'var(--grey-300)'}`, background: f.included ? '#dcfce7' : '#fff', cursor: 'pointer', flexShrink: 0, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.included ? '#166534' : 'var(--grey-300)' }}
                    >
                      {f.included ? '✓' : '–'}
                    </button>
                    <input
                      style={{ ...inp, flex: 1 }}
                      value={f.text}
                      onChange={e => handleFeatureChange(i, 'text', e.target.value)}
                      placeholder="Característica del plan"
                    />
                    <button onClick={() => setEditFeatures(fts => fts.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setEditFeatures(f => [...f, { text: '', included: true }])}
                style={{ padding: '6px 14px', border: '1px dashed var(--grey-300)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)', fontWeight: 600 }}
              >
                + Agregar
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setEditingPlan(null)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '9px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
