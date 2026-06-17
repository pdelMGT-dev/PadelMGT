// ─────────────────────────────────────────────────────────────────────────────
// Torneo Personalizado — pricing & promotions.
//
// Single source of truth lives in Supabase `platform_config` under the key
// `personalizado_pricing`. The SA edits it from the PLANES tab; every public and
// private surface (landing, /tournaments, /pricing, wizard, organizer payment)
// reads the same config so prices never drift.
// ─────────────────────────────────────────────────────────────────────────────

export interface PricingTier {
  id: string;
  /** "up to N total teams" (sum of every category's maxTeams). null = catch-all. */
  maxTeams: number | null;
  price: number;
}

export type PromoEffect =
  | { kind: 'percent'; value: number }        // value: 0–100 (% off the tier price)
  | { kind: 'fixed'; value: number }          // value: USD off the tier price
  | { kind: 'free' }                          // 100% off
  | { kind: 'flat_price'; price: number }     // whole tournament costs exactly this
  | { kind: 'tier_override'; maxTeams: number | null; price: number }; // override one tier

export interface PersonalizadoPromo {
  id: string;
  /** Empty → applies automatically (e.g. a scheduled sale). Non-empty → needs the code. */
  code: string;
  effect: PromoEffect;
  /** ISO yyyy-mm-dd, inclusive. null = no bound. */
  startDate: string | null;
  endDate: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  description: string;
  /** Show this promo on public pricing surfaces (codes are never auto-revealed). */
  displayOnPricing: boolean;
  displayText: string;
  displayBadge: string;
}

export interface PersonalizadoPricingConfig {
  currency: string;
  tiers: PricingTier[];
  promos: PersonalizadoPromo[];
  updatedAt: string;
  updatedBy?: string;
}

export const PERSONALIZADO_PRICING_KEY = 'personalizado_pricing';
const LOCAL_KEY = 'padelmgt_personalizado_pricing';

// Defaults match the publicly-advertised tiers (Hasta 8/16/32 equipos · $9/$19/$29/$49).
export const DEFAULT_PERSONALIZADO_PRICING: PersonalizadoPricingConfig = {
  currency: 'usd',
  tiers: [
    { id: 'tier-8',  maxTeams: 8,    price: 9 },
    { id: 'tier-16', maxTeams: 16,   price: 19 },
    { id: 'tier-32', maxTeams: 32,   price: 29 },
    { id: 'tier-inf', maxTeams: null, price: 49 },
  ],
  promos: [],
  updatedAt: '1970-01-01T00:00:00.000Z',
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Total teams = sum of every category's capacity. */
export function totalTeamsOf(categories: { maxTeams: number }[]): number {
  return categories.reduce((s, c) => s + (c.maxTeams || 0), 0);
}

/** Tiers sorted ascending by threshold, with the catch-all (null) tier last. */
function sortedTiers(config: PersonalizadoPricingConfig): PricingTier[] {
  return [...config.tiers].sort((a, b) => {
    if (a.maxTeams === null) return 1;
    if (b.maxTeams === null) return -1;
    return a.maxTeams - b.maxTeams;
  });
}

export function tierFor(config: PersonalizadoPricingConfig, totalTeams: number): PricingTier {
  const sorted = sortedTiers(config);
  for (const t of sorted) {
    if (t.maxTeams === null) return t;
    if (totalTeams <= t.maxTeams) return t;
  }
  return sorted[sorted.length - 1] ?? DEFAULT_PERSONALIZADO_PRICING.tiers[0];
}

export function basePriceForTeams(config: PersonalizadoPricingConfig, totalTeams: number): number {
  return tierFor(config, totalTeams).price;
}

export function tierLabel(tier: PricingTier): string {
  return tier.maxTeams === null ? 'Sin límite de equipos' : `Hasta ${tier.maxTeams} equipos`;
}

/** Label that knows the full ladder, so the catch-all reads "Más de X equipos". */
export function tierLabelInList(tier: PricingTier, tiers: PricingTier[]): string {
  if (tier.maxTeams !== null) return `Hasta ${tier.maxTeams} equipos`;
  const finite = tiers.filter(t => t.maxTeams !== null).map(t => t.maxTeams as number);
  const largest = finite.length ? Math.max(...finite) : 0;
  return `Más de ${largest} equipos`;
}

export function isPromoActiveNow(promo: PersonalizadoPromo, now: Date = new Date()): boolean {
  if (!promo.isActive) return false;
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return false;
  const t = now.getTime();
  if (promo.startDate && t < Date.parse(promo.startDate)) return false;
  // endDate is inclusive through the end of that day.
  if (promo.endDate && t > Date.parse(promo.endDate) + 24 * 60 * 60 * 1000 - 1) return false;
  return true;
}

/** Price after a promo, or null when the promo doesn't apply to this tournament. */
function priceWithPromo(promo: PersonalizadoPromo, base: number, tier: PricingTier): number | null {
  const e = promo.effect;
  switch (e.kind) {
    case 'percent':    return round2(Math.max(0, base * (1 - e.value / 100)));
    case 'fixed':      return round2(Math.max(0, base - e.value));
    case 'free':       return 0;
    case 'flat_price': return round2(Math.max(0, e.price));
    case 'tier_override':
      return e.maxTeams === tier.maxTeams ? round2(Math.max(0, e.price)) : null;
    default:           return null;
  }
}

export interface PriceResolution {
  basePrice: number;
  finalPrice: number;
  appliedPromo: PersonalizadoPromo | null;
  /** Set when a code was supplied but rejected. */
  reason?: string;
}

/**
 * Resolve the price an organizer pays.
 * - Auto promos (no code) active now are applied automatically, picking the best price.
 * - A supplied code, when valid, replaces the auto promo (no stacking).
 */
export function resolvePrice(
  config: PersonalizadoPricingConfig,
  totalTeams: number,
  code?: string | null,
  now: Date = new Date(),
): PriceResolution {
  const tier = tierFor(config, totalTeams);
  const base = tier.price;

  // 1) Best automatic (codeless) promo.
  let best: { price: number; promo: PersonalizadoPromo | null } = { price: base, promo: null };
  for (const p of config.promos) {
    if (p.code) continue;
    if (!isPromoActiveNow(p, now)) continue;
    const candidate = priceWithPromo(p, base, tier);
    if (candidate != null && candidate < best.price) best = { price: candidate, promo: p };
  }

  // 2) Explicit code.
  if (code && code.trim()) {
    const norm = code.trim().toUpperCase();
    const p = config.promos.find(x => x.code && x.code.toUpperCase() === norm);
    if (!p) return { basePrice: base, finalPrice: best.price, appliedPromo: best.promo, reason: 'Código no válido' };
    if (!isPromoActiveNow(p, now)) return { basePrice: base, finalPrice: best.price, appliedPromo: best.promo, reason: 'Código expirado o no disponible' };
    const candidate = priceWithPromo(p, base, tier);
    if (candidate == null) return { basePrice: base, finalPrice: best.price, appliedPromo: best.promo, reason: 'El código no aplica a este torneo' };
    return { basePrice: base, finalPrice: candidate, appliedPromo: p };
  }

  return { basePrice: base, finalPrice: best.price, appliedPromo: best.promo };
}

export function describeEffect(effect: PromoEffect): string {
  switch (effect.kind) {
    case 'percent':       return `${effect.value}% de descuento`;
    case 'fixed':         return `-$${effect.value} de descuento`;
    case 'free':          return 'Gratis (100% off)';
    case 'flat_price':    return `Precio especial $${effect.price}`;
    case 'tier_override': return `Tramo ${effect.maxTeams === null ? 'mayor' : '≤' + effect.maxTeams} → $${effect.price}`;
    default:              return '';
  }
}

// ── Client cache (localStorage) ──────────────────────────────────────────────

export function getPersonalizadoPricingLocal(): PersonalizadoPricingConfig {
  if (typeof window === 'undefined') return DEFAULT_PERSONALIZADO_PRICING;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return DEFAULT_PERSONALIZADO_PRICING;
    const parsed = JSON.parse(raw) as PersonalizadoPricingConfig;
    if (!parsed.tiers || parsed.tiers.length === 0) return DEFAULT_PERSONALIZADO_PRICING;
    return { ...DEFAULT_PERSONALIZADO_PRICING, ...parsed, promos: parsed.promos ?? [] };
  } catch {
    return DEFAULT_PERSONALIZADO_PRICING;
  }
}

export function savePersonalizadoPricingLocal(config: PersonalizadoPricingConfig): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(config)); } catch { /* ignore */ }
}

/** Public fetch — returns tiers + only the promos flagged for public display. */
export async function fetchPersonalizadoPricing(): Promise<PersonalizadoPricingConfig> {
  try {
    const res = await fetch('/api/personalizado-pricing');
    if (!res.ok) return getPersonalizadoPricingLocal();
    const config = await res.json() as PersonalizadoPricingConfig;
    if (!config?.tiers?.length) return getPersonalizadoPricingLocal();
    savePersonalizadoPricingLocal(config);
    return config;
  } catch {
    return getPersonalizadoPricingLocal();
  }
}
