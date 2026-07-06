// plan-store.ts — Subscription pricing board and plan change history
// Works alongside plan-config.ts (limits) and adds pricing + Stripe IDs

import { createLocalStore } from './local-store';
export type { PlanId } from './plan-config';
import type { PlanId } from './plan-config';

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  description: string;
  group: 'player' | 'liga' | 'club' | 'federation' | 'special';
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  features: PlanFeature[];
  isActive: boolean;
  isFeatured: boolean;
  updatedAt: string;
}

export interface PlanChangeRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  fromPlan: PlanId;
  toPlan: PlanId;
  changedBy: string;
  changedAt: string;
  reason?: string;
  stripeSubscriptionId?: string;
}

// Unified player ladder — a single plan governs games, tournaments AND leagues.
// Club plans are kept (isActive: false) so they can be re-enabled later without
// re-creating them; liga_* plans are retired (leagues are now a player feature).
const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Para empezar a jugar',
    group: 'player',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'USD',
    features: [
      { text: 'Hasta 3 juegos/mes', included: true },
      { text: 'Hasta 8 jugadores por juego', included: true },
      { text: '1 torneo/mes (hasta 8 jugadores)', included: true },
      { text: '1 liga activa (hasta 8 jugadores)', included: true },
      { text: 'Clasificación básica', included: true },
      { text: 'Soporte por email', included: false },
      { text: 'Estadísticas avanzadas', included: false },
    ],
    isActive: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'player_basic',
    name: 'Player Basic',
    description: 'Para jugar más seguido',
    group: 'player',
    priceMonthly: 3,
    priceAnnual: 28.80,
    currency: 'USD',
    features: [
      { text: 'Hasta 10 juegos/mes', included: true },
      { text: 'Hasta 12 jugadores por juego', included: true },
      { text: '3 torneos/mes (hasta 16 jugadores)', included: true },
      { text: '3 ligas activas (hasta 16 jugadores)', included: true },
      { text: 'Clasificación completa', included: true },
      { text: 'Soporte por email', included: true },
      { text: 'Estadísticas avanzadas', included: false },
    ],
    isActive: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'player_pro',
    name: 'Player Pro',
    description: 'Para jugadores serios',
    group: 'player',
    priceMonthly: 5,
    priceAnnual: 48,
    currency: 'USD',
    features: [
      { text: 'Juegos ilimitados', included: true },
      { text: 'Hasta 24 jugadores por juego', included: true },
      { text: '5 torneos/mes (hasta 64 jugadores)', included: true },
      { text: '10 ligas activas (hasta 32 jugadores)', included: true },
      { text: 'Clasificación avanzada + categorías', included: true },
      { text: 'Soporte por email', included: true },
      { text: 'Estadísticas avanzadas', included: true },
    ],
    isActive: true,
    isFeatured: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'player_unlimited',
    name: 'Player Ilimitado',
    description: 'Sin límites',
    group: 'player',
    priceMonthly: 10,
    priceAnnual: 96,
    currency: 'USD',
    features: [
      { text: 'Juegos ilimitados', included: true },
      { text: 'Hasta 32 jugadores por juego', included: true },
      { text: 'Torneos ilimitados', included: true },
      { text: 'Ligas ilimitadas (jugadores ilimitados)', included: true },
      { text: 'Clasificación avanzada + categorías', included: true },
      { text: 'Soporte por email', included: true },
      { text: 'Estadísticas avanzadas', included: true },
    ],
    isActive: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'club_starter',
    name: 'Club Starter',
    description: 'Para clubes que empiezan',
    group: 'club',
    priceMonthly: 29.99,
    priceAnnual: 289.99,
    currency: 'USD',
    features: [
      { text: 'Gestión de socios', included: true },
      { text: 'Canchas y reservas', included: true },
      { text: 'Hasta 100 socios', included: true },
      { text: 'White-label', included: false },
    ],
    isActive: false,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'club_pro',
    name: 'Club Pro',
    description: 'Para clubes medianos',
    group: 'club',
    priceMonthly: 79.99,
    priceAnnual: 759.99,
    currency: 'USD',
    features: [
      { text: 'Gestión de socios ilimitada', included: true },
      { text: 'Canchas y reservas', included: true },
      { text: 'Torneos y ligas incluidos', included: true },
      { text: 'White-label', included: true },
    ],
    isActive: false,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'club_liga',
    name: 'Club + Liga',
    description: 'Club completo con gestión de liga',
    group: 'club',
    priceMonthly: 129.99,
    priceAnnual: 1249.99,
    currency: 'USD',
    features: [
      { text: 'Todo de Club Pro', included: true },
      { text: 'Ligas ilimitadas', included: true },
      { text: 'API access', included: true },
      { text: 'Soporte dedicado', included: true },
    ],
    isActive: false,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
];

// v2 key forces a clean re-seed to the unified player ladder (the old key held
// the legacy player+liga+club board and its stale Stripe IDs).
const _planStore = createLocalStore<SubscriptionPlan[]>(
  'padelmgt_subscription_plans_v2',
  DEFAULT_PLANS,
  { seedOnFirstLoad: true },
);

const _changeStore = createLocalStore<PlanChangeRecord[]>(
  'padelmgt_plan_changes',
  [],
  { seedOnFirstLoad: false },
);

export function getPlans(): SubscriptionPlan[] {
  return _planStore.load();
}

export function getPlan(id: PlanId): SubscriptionPlan | undefined {
  return _planStore.load().find(p => p.id === id);
}

// ── Supabase sync (best-effort) ───────────────────────────────────────────────
// The SA's working catalog is stored server-side (platform_config, service-role
// writes only) so edits made on one device/browser show up on every other —
// the local cache below is kept purely for instant paint / offline fallback.

async function pushPlansToSupabase(plans: SubscriptionPlan[]): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/sa/plan-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plans }),
    });
  } catch { /* fire-and-forget */ }
}

/** Pull the SA's catalog from Supabase and replace the local cache. Returns
 * the fetched plans, or null if unavailable (fetch failed / nothing saved
 * yet) — callers should keep showing the local cache in that case. */
export async function syncPlansFromSupabase(): Promise<SubscriptionPlan[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/sa/plan-catalog');
    if (!res.ok) return null;
    const json = await res.json();
    const plans = json.plans as SubscriptionPlan[] | null;
    if (!plans || plans.length === 0) return null;
    _planStore.persist(plans);
    return plans;
  } catch {
    return null;
  }
}

export function updatePlan(id: PlanId, updates: Partial<SubscriptionPlan>): SubscriptionPlan | null {
  const all = _planStore.load();
  const idx = all.findIndex(p => p.id === id);
  if (idx < 0) return null;
  const updated = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  all[idx] = updated;
  _planStore.persist(all);
  pushPlansToSupabase(all).catch(() => {});
  return updated;
}

export function addPlan(plan: SubscriptionPlan): SubscriptionPlan {
  const all = _planStore.load();
  const withTimestamp = { ...plan, updatedAt: new Date().toISOString() };
  const updated = [...all, withTimestamp];
  _planStore.persist(updated);
  pushPlansToSupabase(updated).catch(() => {});
  return withTimestamp;
}

export function deletePlan(id: string): boolean {
  const all = _planStore.load();
  const filtered = all.filter(p => p.id !== id);
  if (filtered.length === all.length) return false;
  _planStore.persist(filtered);
  pushPlansToSupabase(filtered).catch(() => {});
  return true;
}

export function getPlanChanges(): PlanChangeRecord[] {
  return _changeStore.load();
}

export function recordPlanChange(record: Omit<PlanChangeRecord, 'id' | 'changedAt'>): PlanChangeRecord {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ch-${Date.now()}`;
  const change: PlanChangeRecord = {
    ...record,
    id,
    changedAt: new Date().toISOString(),
  };
  const all = _changeStore.load();
  _changeStore.persist([change, ...all]);
  return change;
}
