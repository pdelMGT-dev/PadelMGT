import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import {
  PERSONALIZADO_PRICING_KEY,
  type PersonalizadoPricingConfig,
} from '@/lib/personalizado-pricing';

// Stripe sends the raw body for signature verification — do NOT let Next.js parse it.
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  // See src/app/api/stripe/webhook/route.ts for why a second, test-mode
  // secret is needed when the same URL is registered in both Stripe modes.
  const webhookSecretTest = process.env.STRIPE_WEBHOOK_SECRET_TEST;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !stripeSecretKey) {
    // No Stripe configured — return 200 so Stripe stops retrying.
    return NextResponse.json({ received: true });
  }

  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: import('stripe').Stripe.Event;
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (liveErr) {
      if (!webhookSecretTest) throw liveErr;
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecretTest);
    }
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Only handle completed checkouts for personalizado open-registration.
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as import('stripe').Stripe.Checkout.Session;

  if (session.metadata?.kind !== 'personalizado_open_registration') {
    return NextResponse.json({ received: true });
  }

  const promoCode = session.metadata?.promoCode;
  if (!promoCode) {
    // No promo was used — nothing to track.
    return NextResponse.json({ received: true });
  }

  const svc = serviceClient();
  if (!svc) {
    console.warn('[stripe-webhook] No Supabase service client — skipping usedCount update');
    return NextResponse.json({ received: true });
  }

  try {
    const { data } = await svc
      .from('platform_config')
      .select('value')
      .eq('key', PERSONALIZADO_PRICING_KEY)
      .maybeSingle();

    const cfg = data?.value as PersonalizadoPricingConfig | undefined;
    if (!cfg?.promos?.length) {
      return NextResponse.json({ received: true });
    }

    const norm = promoCode.trim().toUpperCase();
    const idx = cfg.promos.findIndex(p => p.code && p.code.toUpperCase() === norm);
    if (idx === -1) {
      console.warn('[stripe-webhook] Promo code not found in config:', promoCode);
      return NextResponse.json({ received: true });
    }

    const promos = cfg.promos.map((p, i) =>
      i === idx ? { ...p, usedCount: (p.usedCount ?? 0) + 1 } : p,
    );
    await svc
      .from('platform_config')
      .update({ value: { ...cfg, promos } })
      .eq('key', PERSONALIZADO_PRICING_KEY);

    console.log(`[stripe-webhook] usedCount++ for promo "${promoCode}" (session ${session.id})`);
  } catch (err) {
    console.error('[stripe-webhook] Failed to update usedCount:', err);
    // Return 200 — Stripe retrying won't help if Supabase is down; log for ops.
  }

  return NextResponse.json({ received: true });
}
