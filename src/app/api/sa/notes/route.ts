import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

// SA-private notes on players/clubs/tournaments. service_role only —
// guarded by the signed SA session cookie.

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ notes: [] });

  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get('targetType');
  const targetId = searchParams.get('targetId');

  let query = sb.from('sa_notes').select('*').order('created_at', { ascending: false });
  if (targetType) query = query.eq('target_type', targetType);
  if (targetId) query = query.eq('target_id', targetId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    notes: (data ?? []).map(n => ({
      id: n.id, targetType: n.target_type, targetId: n.target_id, targetName: n.target_name,
      note: n.note, createdBy: n.created_by, createdAt: n.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let body: { id?: string; targetType?: string; targetId?: string; targetName?: string; note?: string; createdBy?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.id || !body.targetType || !body.targetId || !body.note) {
    return NextResponse.json({ error: 'id, targetType, targetId y note son requeridos' }, { status: 400 });
  }

  const { error } = await sb.from('sa_notes').insert({
    id: body.id,
    target_type: body.targetType,
    target_id: body.targetId,
    target_name: body.targetName ?? '',
    note: body.note,
    created_by: body.createdBy ?? 'Super Admin',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

  const { error } = await sb.from('sa_notes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
