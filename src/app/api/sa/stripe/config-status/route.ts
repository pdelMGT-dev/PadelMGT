import { NextRequest, NextResponse } from 'next/server';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

const PRICE_ENV_VARS: Array<{ planId: string; label: string; envVar: string }> = [
  { planId: 'player_basic',          label: 'Player Basic — mensual',     envVar: 'STRIPE_PRICE_PLAYER_BASIC_MONTHLY' },
  { planId: 'player_basic_year',     label: 'Player Basic — anual',       envVar: 'STRIPE_PRICE_PLAYER_BASIC_YEARLY' },
  { planId: 'player_pro',            label: 'Player Pro — mensual',       envVar: 'STRIPE_PRICE_PLAYER_PRO_MONTHLY' },
  { planId: 'player_pro_year',       label: 'Player Pro — anual',         envVar: 'STRIPE_PRICE_PLAYER_PRO_YEARLY' },
  { planId: 'player_unlimited',      label: 'Player Ilimitado — mensual', envVar: 'STRIPE_PRICE_PLAYER_UNLIMITED_MONTHLY' },
  { planId: 'player_unlimited_year', label: 'Player Ilimitado — anual',   envVar: 'STRIPE_PRICE_PLAYER_UNLIMITED_YEARLY' },
];

// SA-only. Never returns secret values — only presence/shape checks and a real
// Stripe API call to confirm the configured key actually works. Env vars live
// in Vercel exclusively; this route reports on them, it doesn't manage them.
export async function GET(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://padelmgt.com';
  const webhookSecretSet = !!process.env.STRIPE_WEBHOOK_SECRET;
  const prices = PRICE_ENV_VARS.map(p => {
    const val = process.env[p.envVar];
    return { ...p, set: !!val && !val.startsWith('price_...') };
  });

  const configured = !!secretKey && !secretKey.startsWith('sk_test_...');
  const mode: 'test' | 'live' | null = !configured
    ? null
    : secretKey!.startsWith('sk_live_') ? 'live' : secretKey!.startsWith('sk_test_') ? 'test' : null;

  if (!configured) {
    return NextResponse.json({ configured: false, mode: null, apiReachable: false, error: null, webhookSecretSet, appUrl, prices });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey!);
    await stripe.balance.retrieve();
    return NextResponse.json({ configured: true, mode, apiReachable: true, error: null, webhookSecretSet, appUrl, prices });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ configured: true, mode, apiReachable: false, error: message, webhookSecretSet, appUrl, prices });
  }
}
