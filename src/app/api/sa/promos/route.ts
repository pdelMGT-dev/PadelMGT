import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

function rowToPromo(row: Record<string, unknown>) {
  return {
    id:               row.id,
    code:             row.code,
    type:             row.type,
    value:            row.value ?? 0,
    description:      row.description ?? '',
    maxUses:          row.max_uses ?? null,
    usedCount:        row.used_count ?? 0,
    expiresAt:        row.expires_at ?? null,
    isActive:         row.is_active ?? true,
    createdAt:        row.created_at,
    createdBy:        row.created_by ?? '',
    eligibility:      row.eligibility ?? 'all',
    unlockPlan:       row.unlock_plan ?? null,
    unlockMonths:     row.unlock_months ?? null,
    displayOnPricing: row.display_on_pricing ?? false,
    displayText:      row.display_text ?? '',
    displayBadge:     row.display_badge ?? '',
  };
}

export async function GET() {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ promos: [] });

  const { data, error } = await sb
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ promos: (data ?? []).map(rowToPromo) });
}

export async function POST(request: NextRequest) {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let body: { promo: Record<string, unknown> };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const p = body.promo;
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `promo-${Date.now()}`;

  const { error } = await sb.from('promo_codes').insert({
    id,
    code:               String(p.code ?? '').toUpperCase().trim(),
    type:               p.type ?? 'feature_unlock',
    value:              p.value ?? 0,
    description:        p.description ?? '',
    max_uses:           p.maxUses ?? null,
    used_count:         0,
    expires_at:         p.expiresAt ?? null,
    is_active:          p.isActive ?? true,
    created_by:         p.createdBy ?? '',
    eligibility:        p.eligibility ?? 'all',
    unlock_plan:        p.unlockPlan ?? null,
    unlock_months:      p.unlockMonths ?? null,
    display_on_pricing: p.displayOnPricing ?? false,
    display_text:       p.displayText ?? '',
    display_badge:      p.displayBadge ?? '',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(request: NextRequest) {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let body: { id: string; updates: Record<string, unknown> };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const dbUpdates: Record<string, unknown> = {};
  const u = body.updates;
  if (u.code        !== undefined) dbUpdates.code               = String(u.code).toUpperCase().trim();
  if (u.type        !== undefined) dbUpdates.type               = u.type;
  if (u.value       !== undefined) dbUpdates.value              = u.value;
  if (u.description !== undefined) dbUpdates.description        = u.description;
  if (u.maxUses     !== undefined) dbUpdates.max_uses           = u.maxUses;
  if (u.usedCount   !== undefined) dbUpdates.used_count         = u.usedCount;
  if (u.expiresAt   !== undefined) dbUpdates.expires_at         = u.expiresAt;
  if (u.isActive    !== undefined) dbUpdates.is_active          = u.isActive;
  if (u.eligibility !== undefined) dbUpdates.eligibility        = u.eligibility;
  if (u.unlockPlan  !== undefined) dbUpdates.unlock_plan        = u.unlockPlan;
  if (u.unlockMonths!== undefined) dbUpdates.unlock_months      = u.unlockMonths;
  if (u.displayOnPricing !== undefined) dbUpdates.display_on_pricing = u.displayOnPricing;
  if (u.displayText !== undefined) dbUpdates.display_text       = u.displayText;
  if (u.displayBadge!== undefined) dbUpdates.display_badge      = u.displayBadge;

  const { error } = await sb.from('promo_codes').update(dbUpdates).eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await sb.from('promo_codes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
