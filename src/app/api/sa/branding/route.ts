import { NextRequest, NextResponse } from 'next/server';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';
import { serviceClient } from '@/lib/supabase-server';

const DEFAULTS = {
  logoFull:  '/assets/brand/logo-full.png',
  logoWhite: '/assets/brand/logo-white.png',
  logoBlack: '/assets/brand/logo-black.png',
  logoIcon:  '/assets/brand/logo-icon.png',
};

export async function GET(request: NextRequest) {
  const session = await requireSARequest(request);
  if (!session) return saUnauthorized();

  try {
    const sb = serviceClient();
    if (sb) {
      const { data } = await sb
        .from('platform_config')
        .select('value')
        .eq('key', 'branding')
        .single();
      if (data?.value) return NextResponse.json({ ...DEFAULTS, ...data.value });
    }
  } catch {}
  return NextResponse.json(DEFAULTS);
}

export async function POST(request: NextRequest) {
  const session = await requireSARequest(request);
  if (!session || session.role !== 'superadmin') return saUnauthorized();

  let body: { branding?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { branding } = body;
  if (!branding || typeof branding !== 'object') {
    return NextResponse.json({ error: 'Missing branding data' }, { status: 400 });
  }

  // Validate: each value must be a data URL (max 500KB) or a valid path
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(branding)) {
    if (typeof v !== 'string') continue;
    if (v.startsWith('data:image/')) {
      if (v.length > 700_000) {
        return NextResponse.json({ error: `Image ${k} too large (max 500KB)` }, { status: 400 });
      }
      cleaned[k] = v;
    } else if (v.startsWith('/')) {
      cleaned[k] = v;
    }
  }

  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { error } = await sb
    .from('platform_config')
    .upsert({ key: 'branding', value: cleaned }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
