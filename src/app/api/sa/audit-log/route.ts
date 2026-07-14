import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

// SA action audit trail. service_role only — guarded by the signed SA
// session cookie so entries can't be spoofed or read by non-SA callers.

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ entries: [] });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

  const { data, error } = await sb.from('sa_audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    entries: (data ?? []).map(e => ({
      id: e.id, action: e.action, actor: e.actor,
      targetType: e.target_type ?? undefined, targetId: e.target_id ?? undefined, targetName: e.target_name ?? undefined,
      details: e.details ?? undefined, createdAt: e.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let body: { id?: string; action?: string; actor?: string; targetType?: string; targetId?: string; targetName?: string; details?: string; createdAt?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.id || !body.action || !body.actor) {
    return NextResponse.json({ error: 'id, action y actor son requeridos' }, { status: 400 });
  }

  const { error } = await sb.from('sa_audit_log').insert({
    id: body.id,
    action: body.action,
    actor: body.actor,
    target_type: body.targetType ?? null,
    target_id: body.targetId ?? null,
    target_name: body.targetName ?? null,
    details: body.details ?? null,
    created_at: body.createdAt ?? new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { error } = await sb.from('sa_audit_log').delete().gte('created_at', '1970-01-01');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
