import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { id, name, email, phone, city, country, sex, level, rankingPoints, shortId, authUserId, plan, nationality } = body as Record<string, string | number | undefined>;

  if (!id || !email) return NextResponse.json({ error: 'Missing id or email' }, { status: 400 });

  const resolvedCountry = (country || nationality || 'ES') as string;

  // Fetch existing custom_fields so we don't overwrite plan/subscriptionStatus set by Stripe webhook
  const { data: existing } = await sb.from('players').select('custom_fields').eq('id', id).maybeSingle();
  const existingCf = (existing?.custom_fields as Record<string, unknown>) ?? {};

  const { error } = await sb.from('players').upsert({
    id,
    name,
    email,
    phone: phone ?? null,
    city: city ?? null,
    country: resolvedCountry,
    ranking_points: rankingPoints ?? 0,
    status: 'active',
    role: 'player',
    ...(authUserId ? { user_id: authUserId } : {}),
    custom_fields: {
      ...existingCf,
      shortId,
      ...(sex   ? { sex }   : {}),
      ...(level ? { level } : {}),
      ...(plan  ? { plan }  : {}),
      profileCompleted: 'true',
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (error) {
    console.error('[PlayerUpdate] Supabase error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
