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

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Acceso básico a la plataforma',
    group: 'player',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'USD',
    features: [
      { text: 'Hasta 3 juegos/mes', included: true },
      { text: 'Hasta 8 jugadores por juego', included: true },
      { text: '1 torneo/mes', included: true },
      { text: 'Soporte por email', included: false },
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
    priceMonthly: 9.99,
    priceAnnual: 89.99,
    currency: 'USD',
    features: [
      { text: 'Juegos ilimitados', included: true },
      { text: 'Hasta 32 jugadores por juego', included: true },
      { text: 'Torneos ilimitados', included: true },
      { text: 'Soporte por email', included: true },
      { text: 'Estadísticas avanzadas', included: true },
    ],
    isActive: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'liga_free',
    name: 'Liga Free',
    description: 'Gestión básica de ligas',
    group: 'liga',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'USD',
    features: [
      { text: 'Hasta 1 liga activa', included: true },
      { text: 'Hasta 20 jugadores', included: true },
      { text: 'Clasificación básica', included: true },
      { text: 'Soporte prioritario', included: false },
    ],
    isActive: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'liga_basic',
    name: 'Liga Basic',
    description: 'Para ligas pequeñas',
    group: 'liga',
    priceMonthly: 19.99,
    priceAnnual: 189.99,
    currency: 'USD',
    features: [
      { text: 'Hasta 3 ligas activas', included: true },
      { text: 'Hasta 50 jugadores', included: true },
      { text: 'Clasificación completa', included: true },
      { text: 'Soporte prioritario', included: true },
    ],
    isActive: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'liga_pro',
    name: 'Liga Pro',
    description: 'Para ligas profesionales',
    group: 'liga',
    priceMonthly: 49.99,
    priceAnnual: 479.99,
    currency: 'USD',
    features: [
      { text: 'Hasta 10 ligas activas', included: true },
      { text: 'Jugadores ilimitados', included: true },
      { text: 'Stats avanzadas', included: true },
      { text: 'Soporte prioritario 24/7', included: true },
    ],
    isActive: true,
    isFeatured: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'liga_unlimited',
    name: 'Liga Unlimited',
    description: 'Sin límites para grandes organizaciones',
    group: 'liga',
    priceMonthly: 99.99,
    priceAnnual: 959.99,
    currency: 'USD',
    features: [
      { text: 'Ligas ilimitadas', included: true },
      { text: 'Jugadores ilimitados', included: true },
      { text: 'API access', included: true },
      { text: 'Soporte dedicado', included: true },
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
    isActive: true,
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
    isActive: true,
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
    isActive: true,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  },
];

const _planStore = createLocalStore<SubscriptionPlan[]>(
  'padelmgt_subscription_plans',
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

export function updatePlan(id: PlanId, updates: Partial<SubscriptionPlan>): SubscriptionPlan | null {
  const all = _planStore.load();
  const idx = all.findIndex(p => p.id === id);
  if (idx < 0) return null;
  const updated = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  all[idx] = updated;
  _planStore.persist(all);
  return updated;
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
