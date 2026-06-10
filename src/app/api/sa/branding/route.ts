import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest } from '@/lib/sa-session';

// SA-managed branding (logo variants). Values are data URLs (uploaded images)
// or static paths. Protected by the signed SA session cookie.

const MAX_DATA_URL = 700 * 1024; // ~500KB image → ~700KB base64
const ALLOWED_KEYS = new Set(['logoFull', 'logoWhite', 'logoBlack', 'logoIcon']);

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  if (!(await requireSARequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ branding: null });

  const { data } = await sb.from('platform_config').select('value').eq('key', 'branding').maybeSingle();
  return NextResponse.json({ branding: data?.value ?? null });
}

export async function POST(request: NextRequest) {
  const session = await requireSARequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  let body: { branding: Record<string, string> };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const branding: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.branding ?? {})) {
    if (!ALLOWED_KEYS.has(k) || typeof v !== 'string' || !v) continue;
    const isDataUrl = v.startsWith('data:image/');
    const isPath = v.startsWith('/');
    if (!isDataUrl && !isPath) continue;
    if (isDataUrl && v.length > MAX_DATA_URL) {
      return NextResponse.json({ error: `La imagen de ${k} supera los 500KB` }, { status: 413 });
    }
    branding[k] = v;
  }

  const { error } = await sb.from('platform_config').upsert({
    key:        'branding',
    value:      branding,
    updated_by: session.email,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
