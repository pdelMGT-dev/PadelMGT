import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

// SA-wide read of all family members + links, for the Relations panel's
// Familia tab. The player-facing /api/family/* routes only return the
// caller's own data, which is useless for an SA overview.

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ members: [], links: [] });

  const [{ data: members, error: mErr }, { data: links, error: lErr }] = await Promise.all([
    sb.from('family_members').select('*'),
    sb.from('family_links').select('*'),
  ]);
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  return NextResponse.json({
    members: (members ?? []).map(m => ({
      id: m.id, ownerId: m.owner_id, fullName: m.full_name, relationType: m.relation_type,
      sex: m.sex, birthDate: m.birth_date, email: m.email ?? undefined,
      linkedPlayerId: m.linked_player_id ?? undefined, invitationStatus: m.invitation_status, createdAt: m.created_at,
    })),
    links: (links ?? []).map(l => ({
      id: l.id, fromPlayerId: l.from_player_id, toPlayerId: l.to_player_id, toPlayerEmail: l.to_player_email,
      fromPlayerName: l.from_player_name, relationFromTo: l.relation_from_to, relationToFrom: l.relation_to_from,
      status: l.status, createdAt: l.created_at,
    })),
  });
}
