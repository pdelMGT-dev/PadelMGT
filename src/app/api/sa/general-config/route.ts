import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest } from '@/lib/sa-session';

// SA-managed general platform settings (platform name, support email).
// Protected by the signed SA session cookie.

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

  const { data } = await sb.from('platform_config').select('value').eq('key', 'general').maybeSingle();
  return NextResponse.json({ config: data?.value ?? null });
}

export async function POST(request: NextRequest) {
  const session = await requireSARequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  let body: { platformName?: string; supportEmail?: string };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const platformName = typeof body.platformName === 'string' ? body.platformName.trim().slice(0, 100) : '';
  const supportEmail = typeof body.supportEmail === 'string' ? body.supportEmail.trim().slice(0, 200) : '';
  if (!platformName || !supportEmail) {
    return NextResponse.json({ error: 'platformName y supportEmail son requeridos' }, { status: 400 });
  }

  const { error } = await sb.from('platform_config').upsert({
    key:        'general',
    value:      { platformName, supportEmail },
    updated_by: session.email,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
