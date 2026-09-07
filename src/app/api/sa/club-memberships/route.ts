import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

// SA-wide read of all club memberships, for the Relations panel's
// Club-Jugador tab. The player-facing /api/club-memberships route only
// returns the caller's own rows, which is useless for an SA overview.

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ memberships: [] });

  const { data, error } = await sb.from('club_memberships').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    memberships: (data ?? []).map(m => ({
      playerId: m.player_id, clubId: m.club_id,
      clubName: m.club_name ?? '', clubCity: m.club_city ?? '', clubCountry: m.club_country ?? '',
      joinedAt: m.joined_at ?? '',
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let body: { playerId?: string; clubId?: string; clubName?: string; clubCity?: string; clubCountry?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { playerId, clubId } = body;
  if (!playerId || !clubId) return NextResponse.json({ error: 'playerId y clubId son requeridos' }, { status: 400 });

  const { error } = await sb.from('club_memberships').upsert({
    id: `${playerId}:${clubId}`,
    player_id: playerId,
    club_id: clubId,
    club_name: body.clubName ?? null,
    club_city: body.clubCity ?? null,
    club_country: body.clubCountry ?? null,
    joined_at: new Date().toISOString().split('T')[0],
  }, { onConflict: 'player_id,club_id' });

  if (error) { console.warn('[sa/club-memberships join]', error.message); return NextResponse.json({ error: 'No se pudo unir' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const clubId = searchParams.get('clubId');
  if (!playerId || !clubId) return NextResponse.json({ error: 'Missing playerId/clubId params' }, { status: 400 });

  const { error } = await sb.from('club_memberships').delete().eq('player_id', playerId).eq('club_id', clubId);
  if (error) return NextResponse.json({ error: 'No se pudo salir' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
