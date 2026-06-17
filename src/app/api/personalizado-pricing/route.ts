import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import {
  DEFAULT_PERSONALIZADO_PRICING,
  PERSONALIZADO_PRICING_KEY,
  type PersonalizadoPricingConfig,
  type PersonalizadoPromo,
} from '@/lib/personalizado-pricing';

// Public, read-only. Returns the pricing tiers plus only the promos that are safe
// to expose: codeless auto-applied sales and promos explicitly flagged for display.
// Secret codes are stripped so they can't be scraped from the client.
export async function GET() {
  const svc = serviceClient();
  if (!svc) return NextResponse.json(DEFAULT_PERSONALIZADO_PRICING);

  const { data, error } = await svc
    .from('platform_config')
    .select('value')
    .eq('key', PERSONALIZADO_PRICING_KEY)
    .maybeSingle();

  if (error || !data?.value) return NextResponse.json(DEFAULT_PERSONALIZADO_PRICING);

  const config = data.value as PersonalizadoPricingConfig;
  const safePromos = (config.promos ?? []).filter(
    (p: PersonalizadoPromo) => !p.code || p.displayOnPricing,
  );

  return NextResponse.json({ ...config, promos: safePromos });
}
