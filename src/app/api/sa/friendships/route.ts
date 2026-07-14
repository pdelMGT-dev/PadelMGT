import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

// SA management of the same friend_requests table used by the player-facing
// /api/friends route. SA writes go straight to 'accepted' — no approval step.

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

interface Row {
  id: string; from_id: string; from_name: string | null;
  to_id: string; to_name: string | null;
  status: 'pending' | 'accepted' | 'rejected'; created_at: string;
}

export async function GET(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ friendships: [] });

  const { data, error } = await sb.from('friend_requests').select('*').eq('status', 'accepted').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Row[];
  return NextResponse.json({
    friendships: rows.map(r => ({
      id: r.id, aId: r.from_id, aName: r.from_name ?? '', bId: r.to_id, bName: r.to_name ?? '', since: r.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let body: { aId?: string; aName?: string; bId?: string; bName?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { aId, bId } = body;
  if (!aId || !bId) return NextResponse.json({ error: 'aId y bId son requeridos' }, { status: 400 });
  if (aId === bId) return NextResponse.json({ error: 'No se puede vincular un jugador consigo mismo' }, { status: 400 });

  const { data: existing } = await sb.from('friend_requests').select('*')
    .or(`and(from_id.eq.${aId},to_id.eq.${bId}),and(from_id.eq.${bId},to_id.eq.${aId})`);
  const rows = (existing ?? []) as Row[];
  const existingRow = rows[0];

  if (existingRow) {
    if (existingRow.status === 'accepted') return NextResponse.json({ ok: true, already: 'friends' });
    const { error } = await sb.from('friend_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', existingRow.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const id = `fr-${aId}-${bId}`;
  const { error } = await sb.from('friend_requests').insert({
    id, from_id: aId, from_name: body.aName ?? null,
    to_id: bId, to_name: body.bName ?? null,
    status: 'accepted', updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const aId = searchParams.get('aId');
  const bId = searchParams.get('bId');
  if (!aId || !bId) return NextResponse.json({ error: 'Missing aId/bId params' }, { status: 400 });

  const { error } = await sb.from('friend_requests').delete()
    .or(`and(from_id.eq.${aId},to_id.eq.${bId}),and(from_id.eq.${bId},to_id.eq.${aId})`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
