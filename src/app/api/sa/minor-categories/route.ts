import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest } from '@/lib/sa-session';

// SA-managed minor (age) categories. Protected by the signed SA session
// cookie. Read side for everyone else is /api/minor-categories.

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  if (!(await requireSARequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ categories: null });

  const { data } = await sb.from('platform_config').select('value').eq('key', 'minor_categories').maybeSingle();
  return NextResponse.json({ categories: data?.value ?? null });
}

export async function POST(request: NextRequest) {
  const session = await requireSARequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  let body: { categories?: Array<{ id?: string; name?: string; maxAge?: number }> };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!Array.isArray(body.categories)) return NextResponse.json({ error: 'categories debe ser un array' }, { status: 400 });

  const categories = body.categories
    .filter(c => typeof c.id === 'string' && c.id && typeof c.name === 'string' && Number.isFinite(Number(c.maxAge)))
    .map(c => ({ id: c.id as string, name: c.name as string, maxAge: Number(c.maxAge) }));

  const { error } = await sb.from('platform_config').upsert({
    key:        'minor_categories',
    value:      categories,
    updated_by: session.email,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
  return NextResponse.json({ ok: true, categories });
}
