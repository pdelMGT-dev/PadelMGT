import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

// SA-managed player-to-player relationships (friend/rival/teammate), used by
// the SA Jugadores drawer. The player_relationships table only grants
// anon/authenticated SELECT — all writes go through here with the
// service-role key, guarded by the signed SA session cookie.

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ relationships: [] });

  const { data, error } = await sb.from('player_relationships').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    relationships: (data ?? []).map(r => ({
      id: r.id,
      playerId: r.player_id,
      relatedPlayerId: r.related_player_id,
      type: r.relationship_type,
      createdAt: r.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let body: { id?: string; playerId?: string; relatedPlayerId?: string; type?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.playerId || !body.relatedPlayerId || !body.type) {
    return NextResponse.json({ error: 'playerId, relatedPlayerId y type son requeridos' }, { status: 400 });
  }

  const { data, error } = await sb.from('player_relationships').insert({
    id: body.id ?? crypto.randomUUID(),
    player_id: body.playerId,
    related_player_id: body.relatedPlayerId,
    relationship_type: body.type,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    relationship: { id: data.id, playerId: data.player_id, relatedPlayerId: data.related_player_id, type: data.relationship_type, createdAt: data.created_at },
  });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

  const { error } = await sb.from('player_relationships').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
