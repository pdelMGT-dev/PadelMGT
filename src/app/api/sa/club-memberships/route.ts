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
