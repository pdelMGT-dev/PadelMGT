import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/supabase-server';

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

  // NOTE: `plan` is intentionally NOT accepted from the client — plan changes
  // only happen via the Stripe webhook (service role) or the SA back-office.
  const { id, name, email, phone, city, country, sex, level, rankingPoints, shortId, authUserId, nationality, description, birthDate, photoUrl } = body as Record<string, string | number | undefined>;

  if (!id || !email) return NextResponse.json({ error: 'Missing id or email' }, { status: 400 });

  // Verified Supabase session of the caller (may be null right after signup
  // when email confirmation is pending)
  const caller = await getServerUser(request);

  // authUserId binding: a caller may only bind a player row to THEIR OWN auth
  // user. With a session, enforce equality; without one, binding is only
  // allowed on brand-new rows (registration flow).
  if (authUserId && caller && caller.id !== authUserId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const resolvedCountry = (country || nationality || 'ES') as string;

  // Fetch existing row: ownership check + preserve custom_fields (plan etc.)
  const { data: existing } = await sb.from('players').select('user_id, email, custom_fields').eq('id', id).maybeSingle();
  const existingCf = (existing?.custom_fields as Record<string, unknown>) ?? {};

  if (existing) {
    const ownerUserId = existing.user_id as string | null;
    if (ownerUserId) {
      // Row already belongs to an auth user → only that user can modify it
      if (!caller || caller.id !== ownerUserId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    } else {
      // Unclaimed row → require a session whose email matches the row
      const rowEmail = ((existing.email as string) ?? '').toLowerCase();
      if (!caller || (caller.email ?? '').toLowerCase() !== rowEmail) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }
  }

  // Resolve the user_id to write: prefer the verified session id
  const bindUserId = caller?.id ?? (!existing ? authUserId : undefined);

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
    ...(bindUserId ? { user_id: bindUserId } : {}),
    custom_fields: {
      ...existingCf,
      shortId,
      ...(sex   ? { sex }   : {}),
      ...(level ? { level } : {}),
      // Profile fields round-trip through custom_fields so edits made on one
      // device show up on every other device.
      ...(description !== undefined ? { description: String(description) } : {}),
      ...(birthDate   !== undefined ? { birthDate: String(birthDate) }     : {}),
      // photoUrl may be a base64 data URL (uploads are capped at 2 MB client-side)
      ...(photoUrl    !== undefined ? { photoUrl: String(photoUrl) }       : {}),
      profileCompleted: 'true',
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (error) {
    console.error('[PlayerUpdate] Supabase error:', error.message);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
