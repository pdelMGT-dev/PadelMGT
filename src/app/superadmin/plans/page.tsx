'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getPlans,
  updatePlan,
  addPlan,
  deletePlan,
  getPlanChanges,
  type SubscriptionPlan,
  type PlanFeature,
} from '@/lib/plan-store';
import { saGetSession } from '@/lib/superadmin-auth';
import { type PlanLimits } from '@/lib/plan-config';

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

interface PromoCodeExtended {
  id: string;
  code: string;
  type: 'percent_off' | 'fixed_off' | 'free_trial' | 'feature_unlock';
  value: number;
  description: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  eligibility: 'all' | 'new_users' | 'existing_users';
  unlockPlan?: string;
  unlockMonths?: number;
  displayOnPricing: boolean;
  displayText?: string;
  displayBadge?: string;
}

const DEFAULT_PLAN_LIMITS: PlanLimits = {
  maxPlayersPerGame: 8,
  maxGamesPerMonth: 3,
  maxPlayersPerTournament: 16,
  maxTournamentsPerMonth: 1,
  maxLeaguePlayers: 20,
  maxActiveTournaments: 1,
  rankingTier: 'none' as const,
  hasCategories: false,
  maxSeasonHistory: 0,
  maxCourts: 0,
  canCustomizePage: false,
  clubMaxTournamentsPerMonth: 0,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [tab, setTab] = useState<'pricing' | 'promos' | 'history'>('pricing');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editForm, setEditForm] = useState<Partial<SubscriptionPlan>>({});
  const [editFeatures, setEditFeatures] = useState<PlanFeature[]>([]);
  const [editLimits, setEditLimits] = useState<PlanLimits>({ ...DEFAULT_PLAN_LIMITS });
  const [allPlanLimits, setAllPlanLimits] = useState<Record<string, PlanLimits>>({});
  const [stripeSync, setStripeSync] = useState<StripeSyncStatus>({ status: 'idle', message: '', lastSync: null });
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);
  const [stripePrices, setStripePrices] = useState<Record<string, { monthly?: number; annual?: number }>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  // Create plan state
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [createForm, setCreateForm] = useState<{ id: string; name: string; description: string; group: SubscriptionPlan['group']; priceMonthly: number; priceAnnual: number; stripePriceIdMonthly: string; stripePriceIdAnnual: string }>({
    id: '', name: '', description: '', group: 'player', priceMonthly: 0, priceAnnual: 0, stripePriceIdMonthly: '', stripePriceIdAnnual: '',
  });
  const [createFeatures, setCreateFeatures] = useState<PlanFeature[]>([]);
  const [createLimits, setCreateLimits] = useState<PlanLimits>({ ...DEFAULT_PLAN_LIMITS });

  // Delete plan state
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  // Promos state
  const [promos, setPromos] = useState<PromoCodeExtended[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [showCreatePromo, setShowCreatePromo] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeExtended | null>(null);
  const [promoForm, setPromoForm] = useState<Partial<PromoCodeExtended>>({
    code: '', type: 'feature_unlock', value: 0, description: '', maxUses: 200,
    expiresAt: null, isActive: true, eligibility: 'new_users', unlockPlan: 'player_pro',
    unlockMonths: 3, displayOnPricing: true, displayText: '', displayBadge: 'LANZAMIENTO',
  });

  useEffect(() => {
    setPlans(getPlans());
  }, []);

  useEffect(() => {
    fetch('/api/plan-limits')
      .then(r => r.ok ? r.json() : null)
      .then((data: { limits?: Record<string, PlanLimits> } | null) => {
        if (data?.limits) setAllPlanLimits(data.limits);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== 'promos') return;
    setLoadingPromos(true);
    fetch('/api/sa/promos')
      .then(r => r.ok ? r.json() : { promos: [] })
      .then((data: { promos?: PromoCodeExtended[] }) => {
        setPromos(data.promos ?? []);
        setLoadingPromos(false);
      })
      .catch(() => setLoadingPromos(false));
  }, [tab]);

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

  async function publishPlans() {
    setPublishing(true);
    const session = saGetSession();
    try {
      const res = await fetch('/api/sa/plans/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans, updatedBy: session?.email ?? 'superadmin' }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (json.ok) {
        setPublishedAt(new Date().toISOString());
        toast('Planes publicados en el sitio ✓');
      } else {
        toast(json.error ?? 'Error al publicar', false);
      }
    } catch {
      toast('Error de conexión', false);
    }
    setPublishing(false);
  }

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
    setEditLimits({ ...DEFAULT_PLAN_LIMITS, ...(allPlanLimits[plan.id] ?? {}) });
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
    const limitsPayload = { ...allPlanLimits, [editingPlan.id]: editLimits };
    fetch('/api/sa/plan-limits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limits: limitsPayload }),
    }).catch(() => {});
    setAllPlanLimits(limitsPayload);
    setEditingPlan(null);
    toast('Plan actualizado');
  }

  function handleFeatureChange(idx: number, field: keyof PlanFeature, value: string | boolean) {
    setEditFeatures(f => f.map((feat, i) => i === idx ? { ...feat, [field]: value } : feat));
  }

  async function handleDeletePlan(planId: string) {
    try {
      const res = await fetch(`/api/sa/check-plan-subscribers?planId=${planId}`);
      if (!res.ok) { toast('Error al verificar suscriptores', false); setDeletingPlanId(null); return; }
      const data = await res.json() as { hasSubscribers: boolean };
      if (data.hasSubscribers) {
        toast('Este plan tiene suscriptores activos. Solo puedes desactivarlo.', false);
        setDeletingPlanId(null);
        return;
      }
    } catch {
      toast('Error al verificar suscriptores', false);
      setDeletingPlanId(null);
      return;
    }
    const ok = deletePlan(planId);
    if (ok) {
      setPlans(getPlans());
      toast('Plan eliminado');
    } else {
      toast('Error al eliminar el plan', false);
    }
    setDeletingPlanId(null);
  }

  function handleCreatePlan() {
    if (!createForm.id.trim() || !createForm.name.trim()) { toast('ID y nombre son requeridos', false); return; }
    const slug = createForm.id.trim().toLowerCase().replace(/\s+/g, '_');
    const newPlan: SubscriptionPlan = {
      id: slug as SubscriptionPlan['id'],
      name: createForm.name,
      description: createForm.description,
      group: createForm.group,
      priceMonthly: createForm.priceMonthly,
      priceAnnual: createForm.priceAnnual,
      currency: 'USD',
      stripePriceIdMonthly: createForm.stripePriceIdMonthly || undefined,
      stripePriceIdAnnual: createForm.stripePriceIdAnnual || undefined,
      features: createFeatures,
      isActive: true,
      isFeatured: false,
      updatedAt: new Date().toISOString(),
    };
    addPlan(newPlan);
    const limitsPayload = { ...allPlanLimits, [slug]: createLimits };
    fetch('/api/sa/plan-limits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limits: limitsPayload }),
    }).catch(() => {});
    setAllPlanLimits(limitsPayload);
    setPlans(getPlans());
    setShowCreatePlan(false);
    setCreateForm({ id: '', name: '', description: '', group: 'player', priceMonthly: 0, priceAnnual: 0, stripePriceIdMonthly: '', stripePriceIdAnnual: '' });
    setCreateFeatures([]);
    setCreateLimits({ ...DEFAULT_PLAN_LIMITS });
    toast('Plan creado exitosamente');
  }

  async function handleSavePromo() {
    if (!promoForm.code?.trim()) { toast('El código es requerido', false); return; }
    try {
      const isEdit = !!editingPromo;
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit
        ? JSON.stringify({ id: editingPromo!.id, updates: promoForm })
        : JSON.stringify({ promo: promoForm });
      const res = await fetch('/api/sa/promos', { method, headers: { 'Content-Type': 'application/json' }, body });
      if (!res.ok) throw new Error();
      toast(isEdit ? 'Promoción actualizada' : 'Promoción creada');
      setShowCreatePromo(false);
      setEditingPromo(null);
      const data = await fetch('/api/sa/promos').then(r => r.json()) as { promos?: PromoCodeExtended[] };
      setPromos(data.promos ?? []);
    } catch {
      toast('Error al guardar la promoción', false);
    }
  }

  async function handleTogglePromo(promo: PromoCodeExtended) {
    try {
      const res = await fetch('/api/sa/promos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promo.id, updates: { isActive: !promo.isActive } }),
      });
      if (!res.ok) throw new Error();
      setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, isActive: !p.isActive } : p));
      toast(promo.isActive ? 'Promoción desactivada' : 'Promoción activada');
    } catch {
      toast('Error al actualizar la promoción', false);
    }
  }

  function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setPromoForm(f => ({ ...f, code }));
  }

  function openEditPromo(promo: PromoCodeExtended) {
    setEditingPromo(promo);
    setPromoForm({ ...promo });
    setShowCreatePromo(true);
  }

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

  function LimitsEditor({ limits, onChange, group }: { limits: PlanLimits; onChange: (l: PlanLimits) => void; group: string }) {
    function setField<K extends keyof PlanLimits>(key: K, val: PlanLimits[K]) {
      onChange({ ...limits, [key]: val });
    }
    const isLiga = group === 'liga';
    const isClub = group === 'club';
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#92400e' }}>
          Estos valores controlan el comportamiento real de la plataforma (no solo el texto)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Máx jugadores por juego</label>
            <input style={inp} type="number" value={limits.maxPlayersPerGame} onChange={e => setField('maxPlayersPerGame', Number(e.target.value))} />
            <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 2 }}>(-1 = ilimitado)</div>
          </div>
          <div>
            <label style={lbl}>Juegos por mes</label>
            <input style={inp} type="number" value={limits.maxGamesPerMonth} onChange={e => setField('maxGamesPerMonth', Number(e.target.value))} />
            <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 2 }}>(-1 = ilimitado)</div>
          </div>
          <div>
            <label style={lbl}>Máx jugadores por torneo</label>
            <input style={inp} type="number" value={limits.maxPlayersPerTournament} onChange={e => setField('maxPlayersPerTournament', Number(e.target.value))} />
          </div>
          <div>
            <label style={lbl}>Torneos por mes</label>
            <input style={inp} type="number" value={limits.maxTournamentsPerMonth} onChange={e => setField('maxTournamentsPerMonth', Number(e.target.value))} />
            <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 2 }}>(-1 = ilimitado)</div>
          </div>
        </div>
        {isLiga && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div>
              <label style={lbl}>Jugadores en la liga</label>
              <input style={inp} type="number" value={limits.maxLeaguePlayers} onChange={e => setField('maxLeaguePlayers', Number(e.target.value))} />
            </div>
            <div>
              <label style={lbl}>Torneos activos simultáneos</label>
              <input style={inp} type="number" value={limits.maxActiveTournaments} onChange={e => setField('maxActiveTournaments', Number(e.target.value))} />
            </div>
            <div>
              <label style={lbl}>Ranking tier</label>
              <select
                style={{ ...inp }}
                value={limits.rankingTier}
                onChange={e => setField('rankingTier', e.target.value as PlanLimits['rankingTier'])}
              >
                <option value="none">none</option>
                <option value="basic">basic</option>
                <option value="advanced">advanced</option>
                <option value="full">full</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Historial temporadas</label>
              <input style={inp} type="number" value={limits.maxSeasonHistory} onChange={e => setField('maxSeasonHistory', Number(e.target.value))} />
              <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 2 }}>(-1 = ilimitado)</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={limits.hasCategories} onChange={e => setField('hasCategories', e.target.checked)} />
                Categorías habilitadas
              </label>
            </div>
          </div>
        )}
        {isClub && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div>
              <label style={lbl}>Canchas máx</label>
              <input style={inp} type="number" value={limits.maxCourts} onChange={e => setField('maxCourts', Number(e.target.value))} />
            </div>
            <div>
              <label style={lbl}>Torneos/mes del club</label>
              <input style={inp} type="number" value={limits.clubMaxTournamentsPerMonth} onChange={e => setField('clubMaxTournamentsPerMonth', Number(e.target.value))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={limits.canCustomizePage} onChange={e => setField('canCustomizePage', e.target.checked)} />
                Puede personalizar página
              </label>
            </div>
          </div>
        )}
      </div>
    );
  }

  const promoTypeBadge: Record<PromoCodeExtended['type'], { label: string; bg: string; color: string }> = {
    feature_unlock: { label: 'Desbloqueo', bg: '#ede9fe', color: '#7c3aed' },
    percent_off:    { label: '% Descuento', bg: '#dbeafe', color: '#1d4ed8' },
    fixed_off:      { label: '$ Descuento', bg: '#dcfce7', color: '#166534' },
    free_trial:     { label: 'Prueba gratis', bg: '#fef9c3', color: '#92400e' },
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
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 5 }}>Suscripciones</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Planes y Precios</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <button
            onClick={publishPlans}
            disabled={publishing}
            style={{ padding: '10px 22px', background: publishing ? 'var(--grey-300)' : '#111', color: '#c8f135', border: 'none', cursor: publishing ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {publishing ? '⟳ Publicando...' : '↑ Publicar al sitio web'}
          </button>
          {publishedAt && (
            <div style={{ fontSize: 11, color: '#166534' }}>Publicado: {new Date(publishedAt).toLocaleString('es-ES')}</div>
          )}
          <div style={{ fontSize: 11, color: 'var(--grey-400)', maxWidth: 260, textAlign: 'right', lineHeight: 1.4 }}>
            Publica los precios editados en la página pública /pricing
          </div>
        </div>
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
          { key: 'promos', label: 'Promociones' },
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button
              onClick={() => setShowCreatePlan(true)}
              style={{ padding: '9px 20px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              + Nuevo Plan
            </button>
          </div>
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
                  const isConfirmingDelete = deletingPlanId === plan.id;

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
                        style={{ width: '100%', padding: '9px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}
                      >
                        Editar
                      </button>

                      {isConfirmingDelete ? (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 10px', fontSize: 11 }}>
                          <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: 6 }}>¿Eliminar este plan?</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleDeletePlan(plan.id)}
                              style={{ flex: 1, padding: '5px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeletingPlanId(null)}
                              style={{ flex: 1, padding: '5px', background: '#fff', color: 'var(--grey-600)', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11 }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingPlanId(plan.id)}
                          style={{ width: '100%', padding: '6px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PROMOS TAB */}
      {tab === 'promos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button
              onClick={() => { setEditingPromo(null); setPromoForm({ code: '', type: 'feature_unlock', value: 0, description: '', maxUses: 200, expiresAt: null, isActive: true, eligibility: 'new_users', unlockPlan: 'player_pro', unlockMonths: 3, displayOnPricing: true, displayText: '', displayBadge: 'LANZAMIENTO' }); setShowCreatePromo(true); }}
              style={{ padding: '9px 20px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              + Nueva Promoción
            </button>
          </div>

          {loadingPromos ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>Cargando promociones...</div>
          ) : promos.length === 0 ? (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--grey-400)', border: '1px solid var(--grey-200)' }}>
              <div style={{ fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Sin promociones</div>
              <div style={{ fontSize: 13 }}>Crea tu primera promoción para activar descuentos y desbloqueos.</div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-200)' }}>
                    {['Código', 'Tipo', 'Detalles', 'Cupos', 'Vence', 'Visible en /pricing', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-500)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {promos.map(promo => {
                    const badge = promoTypeBadge[promo.type];
                    const isExhausted = promo.maxUses !== null && promo.usedCount >= promo.maxUses;
                    let details = '';
                    if (promo.type === 'feature_unlock') details = `Plan ${promo.unlockPlan ?? '—'} × ${promo.unlockMonths ?? 0} meses`;
                    else if (promo.type === 'percent_off') details = `${promo.value}% off`;
                    else if (promo.type === 'fixed_off') details = `$${promo.value} off`;
                    else if (promo.type === 'free_trial') details = `${promo.value} días gratis`;
                    return (
                      <tr key={promo.id} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{promo.code}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: badge.bg, color: badge.color, padding: '2px 8px', fontSize: 10, fontWeight: 700, borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{badge.label}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-600)' }}>{details}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>
                          {promo.usedCount} / {promo.maxUses === null ? '∞' : promo.maxUses}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey-500)' }}>
                          {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString('es-ES') : '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button
                            onClick={() => handleTogglePromo({ ...promo, isActive: !promo.isActive, displayOnPricing: !promo.displayOnPricing })}
                            style={{ background: promo.displayOnPricing ? '#dcfce7' : 'var(--grey-100)', color: promo.displayOnPricing ? '#166534' : 'var(--grey-500)', border: 'none', cursor: 'pointer', padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 10 }}
                          >
                            {promo.displayOnPricing ? 'Sí' : 'No'}
                          </button>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {isExhausted ? (
                            <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', fontSize: 10, fontWeight: 700, borderRadius: 10, textTransform: 'uppercase' }}>Agotado</span>
                          ) : promo.isActive ? (
                            <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', fontSize: 10, fontWeight: 700, borderRadius: 10, textTransform: 'uppercase' }}>Activo</span>
                          ) : (
                            <span style={{ background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '2px 8px', fontSize: 10, fontWeight: 700, borderRadius: 10, textTransform: 'uppercase' }}>Inactivo</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => openEditPromo(promo)}
                              style={{ padding: '4px 12px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleTogglePromo(promo)}
                              style={{ padding: '4px 12px', background: '#fff', color: 'var(--grey-600)', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11 }}
                            >
                              {promo.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

            <div>
              <div style={{ ...lbl, marginBottom: 8 }}>Límites funcionales</div>
              <LimitsEditor limits={editLimits} onChange={setEditLimits} group={editingPlan.group} />
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

      {/* CREATE PLAN MODAL */}
      {showCreatePlan && (
        <Modal onClose={() => setShowCreatePlan(false)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
              Nuevo Plan
            </h2>
            <button onClick={() => setShowCreatePlan(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', padding: 0, lineHeight: 1 }}>×</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>ID del plan (slug)</label>
                <input
                  style={inp}
                  placeholder="ej: liga_premium"
                  value={createForm.id}
                  onChange={e => setCreateForm(f => ({ ...f, id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                />
              </div>
              <div>
                <label style={lbl}>Grupo</label>
                <select
                  style={{ ...inp }}
                  value={createForm.group}
                  onChange={e => setCreateForm(f => ({ ...f, group: e.target.value as SubscriptionPlan['group'] }))}
                >
                  <option value="player">Jugador</option>
                  <option value="liga">Liga</option>
                  <option value="club">Club</option>
                  <option value="federation">Federación</option>
                  <option value="special">Especial</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Descripción</label>
                <input style={inp} value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Precio mensual (USD)</label>
                <input style={inp} type="number" min="0" step="0.01" value={createForm.priceMonthly} onChange={e => setCreateForm(f => ({ ...f, priceMonthly: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={lbl}>Precio anual (USD)</label>
                <input style={inp} type="number" min="0" step="0.01" value={createForm.priceAnnual} onChange={e => setCreateForm(f => ({ ...f, priceAnnual: Number(e.target.value) }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Stripe Price ID — Mensual</label>
                <input style={{ ...inp, fontFamily: 'monospace', fontSize: 11 }} placeholder="price_..." value={createForm.stripePriceIdMonthly} onChange={e => setCreateForm(f => ({ ...f, stripePriceIdMonthly: e.target.value.trim() }))} />
              </div>
              <div>
                <label style={lbl}>Stripe Price ID — Anual</label>
                <input style={{ ...inp, fontFamily: 'monospace', fontSize: 11 }} placeholder="price_..." value={createForm.stripePriceIdAnnual} onChange={e => setCreateForm(f => ({ ...f, stripePriceIdAnnual: e.target.value.trim() }))} />
              </div>
            </div>

            <div>
              <div style={{ ...lbl, marginBottom: 10 }}>Características</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {createFeatures.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setCreateFeatures(fts => fts.map((feat, j) => j === i ? { ...feat, included: !feat.included } : feat))}
                      style={{ width: 28, height: 28, border: `2px solid ${f.included ? '#166534' : 'var(--grey-300)'}`, background: f.included ? '#dcfce7' : '#fff', cursor: 'pointer', flexShrink: 0, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.included ? '#166534' : 'var(--grey-300)' }}
                    >
                      {f.included ? '✓' : '–'}
                    </button>
                    <input
                      style={{ ...inp, flex: 1 }}
                      value={f.text}
                      onChange={e => setCreateFeatures(fts => fts.map((feat, j) => j === i ? { ...feat, text: e.target.value } : feat))}
                      placeholder="Característica del plan"
                    />
                    <button onClick={() => setCreateFeatures(fts => fts.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCreateFeatures(f => [...f, { text: '', included: true }])}
                style={{ padding: '6px 14px', border: '1px dashed var(--grey-300)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)', fontWeight: 600 }}
              >
                + Agregar
              </button>
            </div>

            <div>
              <div style={{ ...lbl, marginBottom: 8 }}>Límites funcionales</div>
              <LimitsEditor limits={createLimits} onChange={setCreateLimits} group={createForm.group} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setShowCreatePlan(false)} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
              <button onClick={handleCreatePlan} style={{ padding: '9px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                Crear Plan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE / EDIT PROMO MODAL */}
      {showCreatePromo && (
        <Modal onClose={() => { setShowCreatePromo(false); setEditingPromo(null); }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
              {editingPromo ? 'Editar Promoción' : 'Nueva Promoción'}
            </h2>
            <button onClick={() => { setShowCreatePromo(false); setEditingPromo(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', padding: 0, lineHeight: 1 }}>×</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={lbl}>Tipo</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  { value: 'feature_unlock', label: 'Desbloqueo de plan (X meses gratis)' },
                  { value: 'percent_off', label: 'Descuento porcentual' },
                  { value: 'fixed_off', label: 'Descuento fijo ($)' },
                  { value: 'free_trial', label: 'Prueba gratuita (X días)' },
                ] as const).map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="promo_type" checked={promoForm.type === opt.value} onChange={() => setPromoForm(f => ({ ...f, type: opt.value }))} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {promoForm.type === 'feature_unlock' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Plan a desbloquear</label>
                  <select style={{ ...inp }} value={promoForm.unlockPlan ?? 'player_pro'} onChange={e => setPromoForm(f => ({ ...f, unlockPlan: e.target.value }))}>
                    <option value="free">Free</option>
                    <option value="player_pro">Player Pro</option>
                    <option value="liga_free">Liga Free</option>
                    <option value="liga_basic">Liga Basic</option>
                    <option value="liga_pro">Liga Pro</option>
                    <option value="liga_unlimited">Liga Unlimited</option>
                    <option value="club_starter">Club Starter</option>
                    <option value="club_pro">Club Pro</option>
                    <option value="club_liga">Club + Liga</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Meses gratis</label>
                  <input style={inp} type="number" min="1" value={promoForm.unlockMonths ?? 3} onChange={e => setPromoForm(f => ({ ...f, unlockMonths: Number(e.target.value) }))} />
                </div>
              </div>
            )}

            {promoForm.type === 'percent_off' && (
              <div>
                <label style={lbl}>Porcentaje de descuento (%)</label>
                <input style={inp} type="number" min="1" max="100" value={promoForm.value ?? 0} onChange={e => setPromoForm(f => ({ ...f, value: Number(e.target.value) }))} />
              </div>
            )}

            {promoForm.type === 'fixed_off' && (
              <div>
                <label style={lbl}>Descuento fijo (USD)</label>
                <input style={inp} type="number" min="0" step="0.01" value={promoForm.value ?? 0} onChange={e => setPromoForm(f => ({ ...f, value: Number(e.target.value) }))} />
              </div>
            )}

            {promoForm.type === 'free_trial' && (
              <div>
                <label style={lbl}>Días de prueba</label>
                <input style={inp} type="number" min="1" value={promoForm.value ?? 0} onChange={e => setPromoForm(f => ({ ...f, value: Number(e.target.value) }))} />
              </div>
            )}

            <div>
              <label style={lbl}>Código promocional</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inp, flex: 1, textTransform: 'uppercase' }}
                  value={promoForm.code ?? ''}
                  onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="CODIGO2026"
                />
                <button
                  type="button"
                  onClick={generatePromoCode}
                  style={{ padding: '9px 14px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--grey-600)', whiteSpace: 'nowrap' }}
                >
                  Generar código
                </button>
              </div>
            </div>

            <div>
              <label style={lbl}>Descripción</label>
              <input style={inp} value={promoForm.description ?? ''} onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción interna del promo" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Cupos máximos</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    style={inp}
                    type="number"
                    min="1"
                    value={promoForm.maxUses ?? ''}
                    disabled={promoForm.maxUses === null}
                    onChange={e => setPromoForm(f => ({ ...f, maxUses: Number(e.target.value) }))}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                    <input type="checkbox" checked={promoForm.maxUses === null} onChange={e => setPromoForm(f => ({ ...f, maxUses: e.target.checked ? null : 200 }))} />
                    Sin límite
                  </label>
                </div>
              </div>
              <div>
                <label style={lbl}>Vencimiento</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    style={inp}
                    type="date"
                    value={promoForm.expiresAt ?? ''}
                    disabled={promoForm.expiresAt === null}
                    onChange={e => setPromoForm(f => ({ ...f, expiresAt: e.target.value || null }))}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                    <input type="checkbox" checked={promoForm.expiresAt === null} onChange={e => setPromoForm(f => ({ ...f, expiresAt: e.target.checked ? null : '' }))} />
                    Sin vencimiento
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label style={lbl}>Elegibilidad</label>
              <div style={{ display: 'flex', gap: 16 }}>
                {([
                  { value: 'all', label: 'Todos' },
                  { value: 'new_users', label: 'Solo nuevos usuarios' },
                  { value: 'existing_users', label: 'Solo usuarios existentes' },
                ] as const).map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="eligibility" checked={promoForm.eligibility === opt.value} onChange={() => setPromoForm(f => ({ ...f, eligibility: opt.value }))} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ border: '1px solid var(--grey-200)', padding: '14px 16px' }}>
              <div style={{ ...lbl, marginBottom: 10 }}>Mostrar en /pricing</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 10 }}>
                <input type="checkbox" checked={promoForm.displayOnPricing ?? false} onChange={e => setPromoForm(f => ({ ...f, displayOnPricing: e.target.checked }))} />
                Mostrar banner en la página de precios
              </label>
              {promoForm.displayOnPricing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={lbl}>Texto principal del banner</label>
                    <input style={inp} value={promoForm.displayText ?? ''} onChange={e => setPromoForm(f => ({ ...f, displayText: e.target.value }))} placeholder="ej: 3 meses gratis con código LAUNCH" />
                  </div>
                  <div>
                    <label style={lbl}>Badge del banner (ej: LANZAMIENTO)</label>
                    <input style={inp} value={promoForm.displayBadge ?? ''} onChange={e => setPromoForm(f => ({ ...f, displayBadge: e.target.value }))} placeholder="LANZAMIENTO" />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => { setShowCreatePromo(false); setEditingPromo(null); }} style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', cursor: 'pointer', background: '#fff', fontSize: 13, color: 'var(--grey-500)' }}>Cancelar</button>
              <button onClick={handleSavePromo} style={{ padding: '9px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {editingPromo ? 'Actualizar' : 'Crear Promoción'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
