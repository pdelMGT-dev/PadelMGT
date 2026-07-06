import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

/**
 * The SA's working plan catalog (draft board edited in /superadmin/plans),
 * stored as a single JSONB blob in platform_config — same pattern as
 * personalizado-pricing and published_plans. This is distinct from
 * 'published_plans' (the explicitly-published snapshot the public /pricing
 * page reads): editing here just keeps the SA's own board in sync across
 * devices/browsers; "Publicar al sitio web" still copies it to the public key.
 */
const CATALOG_KEY = 'sa_plan_catalog';

export async function GET(request: NextRequest) {
  const session = await requireSARequest(request);
  if (!session) return saUnauthorized();

  const svc = serviceClient();
  if (!svc) return NextResponse.json({ plans: null });

  const { data, error } = await svc
    .from('platform_config')
    .select('value')
    .eq('key', CATALOG_KEY)
    .maybeSingle();

  if (error || !data?.value) return NextResponse.json({ plans: null });
  return NextResponse.json({ plans: data.value });
}

export async function POST(request: NextRequest) {
  const session = await requireSARequest(request);
  if (!session) return saUnauthorized();

  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });

  let body: { plans: unknown };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!Array.isArray(body.plans)) {
    return NextResponse.json({ error: 'plans debe ser un array' }, { status: 400 });
  }

  const { error } = await svc.from('platform_config').upsert({
    key:        CATALOG_KEY,
    value:      body.plans,
    updated_by: session.email,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
