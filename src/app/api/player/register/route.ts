import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/supabase-server';
import { sanitizeText, isValidEmail } from '@/lib/sanitize';

/**
 * Server-first player registration. The player id / shortId are assigned HERE,
 * from what actually exists in Supabase — never computed in the browser (the
 * old client-side counter collided across devices and silently dropped every
 * new registration after the first).
 *
 * Idempotent by email: registering an email that already has a player row
 * returns that row (optionally binding it to the caller's auth user). This
 * doubles as the login self-heal path for auth users whose player row was
 * lost to the old bug.
 */

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

// Seeds occupy #00101–#00118 and the first real account is #00119;
// server-assigned ids always start above both.
const MIN_SHORT_NUM = 120;

function rowToPlayer(row: Record<string, unknown>) {
  const cf = (row.custom_fields as Record<string, string>) ?? {};
  return {
    id: row.id as string,
    shortId: cf.shortId ?? '',
    name: (row.name as string) ?? '',
    email: (row.email as string) ?? '',
    sex: cf.sex,
    country: (row.country as string) ?? '',
    city: (row.city as string) ?? '',
    level: cf.level ?? '1.0',
    plan: cf.plan ?? 'free',
    ranking: 0,
    rankingPoints: (row.ranking_points as number) ?? 0,
    profileCompleted: cf.profileCompleted === 'true',
  };
}

export async function POST(request: NextRequest) {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 }); }

  const name = sanitizeText((body.name as string) ?? '', 100);
  const email = ((body.email as string) ?? '').trim().toLowerCase().slice(0, 200);
  const country = sanitizeText((body.country as string) ?? '', 60);
  const sex = ['M', 'F'].includes(body.sex as string) ? (body.sex as string) : undefined;
  const authUserIdFromBody = (body.authUserId as string) || undefined;

  if (!isValidEmail(email)) return NextResponse.json({ error: 'Email no válido' }, { status: 400 });

  // Verified session if there is one (self-heal at login); at signup time the
  // email isn't confirmed yet so this is usually null and we trust the
  // freshly-created auth user id from the body (same exposure as before).
  const caller = await getServerUser(request);
  const bindUserId = caller?.id ?? authUserIdFromBody ?? null;
  if (caller && authUserIdFromBody && caller.id !== authUserIdFromBody) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // ── Idempotency: existing row for this email wins ────────────────────────────
  const { data: existing } = await sb.from('players').select('*').ilike('email', email).maybeSingle();
  if (existing) {
    const row = existing as Record<string, unknown>;
    // Bind unclaimed rows to the (verified) caller so future writes authorize.
    if (!row.user_id && caller && (caller.email ?? '').toLowerCase() === email) {
      await sb.from('players').update({ user_id: caller.id }).eq('id', row.id as string);
      row.user_id = caller.id;
    }
    return NextResponse.json({ player: rowToPlayer(row), existed: true });
  }

  if (!name) return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 });

  // ── Assign the next shortId from what's really in the database ──────────────
  const { data: idRows } = await sb.from('players').select('id, custom_fields');
  let maxNum = MIN_SHORT_NUM - 1;
  for (const r of (idRows ?? []) as Array<{ id: string; custom_fields: Record<string, string> | null }>) {
    const fromShort = parseInt((r.custom_fields?.shortId ?? '').replace('#', ''), 10);
    const fromId = parseInt((r.id ?? '').replace(/^player-/, ''), 10);
    for (const n of [fromShort, fromId]) if (!isNaN(n) && n > maxNum) maxNum = n;
  }

  // Insert with retry: concurrent registrations may compute the same number,
  // in which case the PK conflict surfaces and we advance and try again.
  for (let attempt = 0; attempt < 5; attempt++) {
    const num = maxNum + 1 + attempt;
    const shortId = '#' + String(num).padStart(5, '0');
    const id = `player-${String(num).padStart(5, '0')}`;
    const { error } = await sb.from('players').insert({
      id,
      name,
      email,
      country: country || 'ES',
      ranking_points: 0,
      status: 'active',
      role: 'player',
      ...(bindUserId ? { user_id: bindUserId } : {}),
      custom_fields: {
        shortId,
        level: '1.0',
        plan: 'free',
        profileCompleted: 'false',
        ...(sex ? { sex } : {}),
      },
      joined_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    });
    if (!error) {
      return NextResponse.json({
        player: {
          id, shortId, name, email, sex, country: country || 'ES',
          level: '1.0', plan: 'free', ranking: 0, rankingPoints: 0, profileCompleted: false,
        },
        existed: false,
      });
    }
    // 23505 = unique violation (id or email raced us)
    if (error.code === '23505') {
      const { data: raced } = await sb.from('players').select('*').ilike('email', email).maybeSingle();
      if (raced) return NextResponse.json({ player: rowToPlayer(raced as Record<string, unknown>), existed: true });
      continue;
    }
    console.error('[player/register] insert error:', error.message);
    return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 500 });
  }
  return NextResponse.json({ error: 'No se pudo asignar un ID, intentá de nuevo' }, { status: 500 });
}
