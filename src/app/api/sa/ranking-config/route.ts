import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest } from '@/lib/sa-session';

// SA-managed global ranking point config. Protected by the signed SA
// session cookie. Read side for everyone else is /api/ranking-config.

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  if (!(await requireSARequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ config: null });

  const { data } = await sb.from('platform_config').select('value').eq('key', 'ranking_global').maybeSingle();
  return NextResponse.json({ config: data?.value ?? null });
}

export async function POST(request: NextRequest) {
  const session = await requireSARequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  let body: { pointsWin?: number; pointsDraw?: number; pointsLoss?: number };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const pointsWin = Number(body.pointsWin);
  const pointsDraw = Number(body.pointsDraw);
  const pointsLoss = Number(body.pointsLoss);
  if (!Number.isFinite(pointsWin) || !Number.isFinite(pointsDraw) || !Number.isFinite(pointsLoss)) {
    return NextResponse.json({ error: 'pointsWin, pointsDraw y pointsLoss deben ser números' }, { status: 400 });
  }

  const value = {
    id: 'global', name: 'Global', scope: 'global' as const,
    pointsWin, pointsDraw, pointsLoss,
    active: true, createdAt: new Date().toISOString(),
  };

  const { error } = await sb.from('platform_config').upsert({
    key:        'ranking_global',
    value,
    updated_by: session.email,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
  return NextResponse.json({ ok: true, config: value });
}
