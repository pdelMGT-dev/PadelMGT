import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import {
  DEFAULT_PERSONALIZADO_PRICING,
  PERSONALIZADO_PRICING_KEY,
  resolvePrice,
  totalTeamsOf,
  type PersonalizadoPricingConfig,
} from '@/lib/personalizado-pricing';

/**
 * Server-side price preview for an organizer opening registration.
 * Recomputes the team count from Supabase so the discount can't be forged.
 */
export async function POST(request: NextRequest) {
  let body: { tournamentId?: string; code?: string };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { tournamentId, code } = body;
  if (!tournamentId) return NextResponse.json({ error: 'tournamentId requerido' }, { status: 400 });

  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503 });

  // Pricing config.
  let config: PersonalizadoPricingConfig = DEFAULT_PERSONALIZADO_PRICING;
  const { data: cfgRow } = await svc
    .from('platform_config')
    .select('value')
    .eq('key', PERSONALIZADO_PRICING_KEY)
    .maybeSingle();
  if (cfgRow?.value) config = cfgRow.value as PersonalizadoPricingConfig;

  // Tournament team count.
  const { data: tRow, error: tErr } = await svc
    .from('personalizado_tournaments')
    .select('categories')
    .eq('id', tournamentId)
    .maybeSingle();
  if (tErr || !tRow) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });

  const categories = (tRow.categories as { maxTeams: number }[]) ?? [];
  const totalTeams = totalTeamsOf(categories);

  const resolution = resolvePrice(config, totalTeams, code ?? null);
  return NextResponse.json({
    basePrice:  resolution.basePrice,
    finalPrice: resolution.finalPrice,
    appliedPromo: resolution.appliedPromo
      ? { code: resolution.appliedPromo.code, description: resolution.appliedPromo.description }
      : null,
    reason: resolution.reason ?? null,
    totalTeams,
  });
}
