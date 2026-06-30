import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ config: null });

  const { data } = await sb
    .from('platform_config')
    .select('value')
    .eq('key', 'homepage_stats')
    .maybeSingle();

  return NextResponse.json({ config: data?.value ?? null });
}

export async function POST(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let body: { config: Record<string, unknown>; updatedBy?: string };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { error } = await sb.from('platform_config').upsert({
    key:        'homepage_stats',
    value:      body.config,
    updated_by: body.updatedBy ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
