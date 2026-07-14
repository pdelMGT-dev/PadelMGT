// promotion-store.ts — Promo code management (localStorage + Supabase)

import { createLocalStore } from './local-store';
import { supabase } from './supabase';

export type PromoType = 'percent_off' | 'fixed_off' | 'free_trial' | 'feature_unlock';

export interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  description: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface PromoRedemption {
  id: string;
  promoId: string;
  promoCode: string;
  userId: string;
  userEmail: string;
  userName: string;
  redeemedAt: string;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `promo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const _promoStore = createLocalStore<PromoCode[]>('padelmgt_promo_codes', [], { seedOnFirstLoad: false });
const _redemptionStore = createLocalStore<PromoRedemption[]>('padelmgt_promo_redemptions', [], { seedOnFirstLoad: false });

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function getPromoCodes(): PromoCode[] {
  return _promoStore.load();
}

export function createPromoCode(data: Omit<PromoCode, 'id' | 'createdAt' | 'usedCount'>): PromoCode {
  const promo: PromoCode = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    usedCount: 0,
    code: data.code.toUpperCase().trim(),
  };
  const all = _promoStore.load();
  _promoStore.persist([...all, promo]);
  syncPromoToSupabase(promo).catch(() => {});
  return promo;
}

export function updatePromoCode(id: string, updates: Partial<PromoCode>): PromoCode | null {
  const all = _promoStore.load();
  const idx = all.findIndex(p => p.id === id);
  if (idx < 0) return null;
  const updated = { ...all[idx], ...updates };
  if (updates.code) updated.code = updates.code.toUpperCase().trim();
  all[idx] = updated;
  _promoStore.persist(all);
  syncPromoToSupabase(updated).catch(() => {});
  return updated;
}

export function deletePromoCode(id: string): void {
  const all = _promoStore.load().filter(p => p.id !== id);
  _promoStore.persist(all);
  syncPromoDeleteToSupabase(id).catch(() => {});
}

// ── Validation + Redemption ───────────────────────────────────────────────────

export type PromoValidationResult =
  | { valid: true; promo: PromoCode }
  | { valid: false; error: string };

export function validatePromoCode(code: string): PromoValidationResult {
  const normalized = code.toUpperCase().trim();
  const all = _promoStore.load();
  const promo = all.find(p => p.code === normalized);

  if (!promo) return { valid: false, error: 'El código promocional no existe.' };
  if (!promo.isActive) return { valid: false, error: 'Este código está inactivo.' };
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { valid: false, error: 'Este código ha vencido.' };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { valid: false, error: 'Este código ya alcanzó su límite de usos.' };
  }
  return { valid: true, promo };
}

export function redeemPromoCode(
  code: string,
  user: { id: string; email: string; name: string },
): PromoValidationResult {
  const result = validatePromoCode(code);
  if (!result.valid) return result;

  const redemption: PromoRedemption = {
    id: generateId(),
    promoId: result.promo.id,
    promoCode: result.promo.code,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    redeemedAt: new Date().toISOString(),
  };

  const redemptions = _redemptionStore.load();
  _redemptionStore.persist([...redemptions, redemption]);

  updatePromoCode(result.promo.id, { usedCount: result.promo.usedCount + 1 });
  syncRedemptionToSupabase(redemption).catch(() => {});

  return { valid: true, promo: result.promo };
}

export function getRedemptions(): PromoRedemption[] {
  return _redemptionStore.load();
}

export function getRedemptionsForPromo(promoId: string): PromoRedemption[] {
  return _redemptionStore.load().filter(r => r.promoId === promoId);
}

// ── Supabase sync ─────────────────────────────────────────────────────────────

async function syncPromoToSupabase(p: PromoCode): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('promo_codes').upsert({
      id: p.id,
      code: p.code,
      type: p.type,
      value: p.value,
      description: p.description,
      max_uses: p.maxUses,
      used_count: p.usedCount,
      expires_at: p.expiresAt,
      is_active: p.isActive,
      created_by: p.createdBy,
    }, { onConflict: 'id' });
  } catch {
    // fire-and-forget
  }
}

async function syncPromoDeleteToSupabase(id: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('promo_codes').delete().eq('id', id);
  } catch {
    // fire-and-forget
  }
}

async function syncRedemptionToSupabase(r: PromoRedemption): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('promo_redemptions').upsert({
      id: r.id,
      promo_id: r.promoId,
      promo_code: r.promoCode,
      user_id: r.userId,
      user_email: r.userEmail,
      user_name: r.userName,
      redeemed_at: r.redeemedAt,
    }, { onConflict: 'id' });
  } catch {
    // fire-and-forget
  }
}

export async function fetchPromosFromSupabase(): Promise<PromoCode[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('promo_codes').select('*');
    if (error || !data) return [];
    return data.map(row => ({
      id: row.id,
      code: row.code,
      type: row.type as PromoType,
      value: row.value ?? 0,
      description: row.description ?? '',
      maxUses: row.max_uses ?? null,
      usedCount: row.used_count ?? 0,
      expiresAt: row.expires_at ?? null,
      isActive: row.is_active ?? true,
      createdAt: row.created_at,
      createdBy: row.created_by ?? '',
    }));
  } catch {
    return [];
  }
}
