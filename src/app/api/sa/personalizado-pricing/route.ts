import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';
import {
  DEFAULT_PERSONALIZADO_PRICING,
  PERSONALIZADO_PRICING_KEY,
  type PersonalizadoPricingConfig,
} from '@/lib/personalizado-pricing';

// Full config (including secret promo codes) — SA only.
export async function GET(request: NextRequest) {
  const session = await requireSARequest(request);
  if (!session) return saUnauthorized();

  const svc = serviceClient();
  if (!svc) return NextResponse.json(DEFAULT_PERSONALIZADO_PRICING);

  const { data, error } = await svc
    .from('platform_config')
    .select('value')
    .eq('key', PERSONALIZADO_PRICING_KEY)
    .maybeSingle();

  if (error || !data?.value) return NextResponse.json(DEFAULT_PERSONALIZADO_PRICING);
  return NextResponse.json(data.value as PersonalizadoPricingConfig);
}

export async function POST(request: NextRequest) {
  const session = await requireSARequest(request);
  if (!session) return saUnauthorized();

  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });

  let body: { config: PersonalizadoPricingConfig };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const config = body.config;
  if (!config || !Array.isArray(config.tiers) || config.tiers.length === 0) {
    return NextResponse.json({ error: 'Debe haber al menos un tramo de precio' }, { status: 400 });
  }

  // Validate tiers.
  for (const t of config.tiers) {
    if (typeof t.price !== 'number' || t.price < 0) {
      return NextResponse.json({ error: 'Precio de tramo no válido' }, { status: 400 });
    }
    if (t.maxTeams !== null && (typeof t.maxTeams !== 'number' || t.maxTeams <= 0)) {
      return NextResponse.json({ error: 'Cantidad de equipos del tramo no válida' }, { status: 400 });
    }
  }
  // Exactly one catch-all tier (maxTeams === null) must exist.
  const catchAll = config.tiers.filter(t => t.maxTeams === null).length;
  if (catchAll !== 1) {
    return NextResponse.json({ error: 'Debe existir exactamente un tramo "Más de…" (sin límite)' }, { status: 400 });
  }

  const toSave: PersonalizadoPricingConfig = {
    currency: config.currency || 'usd',
    tiers: config.tiers,
    promos: Array.isArray(config.promos) ? config.promos : [],
    updatedAt: new Date().toISOString(),
    updatedBy: session.email,
  };

  const { error } = await svc.from('platform_config').upsert({
    key:        PERSONALIZADO_PRICING_KEY,
    value:      toSave,
    updated_by: session.email,
    updated_at: toSave.updatedAt,
  }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, config: toSave });
}
