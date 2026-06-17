import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import {
  DEFAULT_PERSONALIZADO_PRICING,
  PERSONALIZADO_PRICING_KEY,
  resolvePrice,
  totalTeamsOf,
  type PersonalizadoPricingConfig,
} from '@/lib/personalizado-pricing';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  // Dev mode requires explicit opt-in AND non-production. A missing Stripe key
  // in production must NOT silently grant fake "paid" checkouts.
  const isDevMode = process.env.STRIPE_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';

  let tournamentId: string, tournamentCode: string, clientPrice: number | undefined,
    userEmail: string | undefined, promoCode: string | undefined;
  try {
    const body = await request.json() as {
      tournamentId: string; tournamentCode: string; price?: number; userEmail?: string; promoCode?: string;
    };
    tournamentId   = body.tournamentId;
    tournamentCode = body.tournamentCode;
    clientPrice    = body.price;
    userEmail      = body.userEmail;
    promoCode      = body.promoCode;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!tournamentId || !tournamentCode) {
    return NextResponse.json({ error: 'Datos del torneo incompletos' }, { status: 400 });
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://padelmgt.com';
  const successPath = `/dashboard/player/tournaments/personalizado/${tournamentId}?registration=opened`;

  // ── Authoritative price: recompute server-side from config + team count + promo ──
  // The client price is only a fallback when Supabase isn't reachable.
  const svc = serviceClient();
  let price = typeof clientPrice === 'number' && Number.isFinite(clientPrice) ? clientPrice : NaN;
  let appliedPromoId: string | null = null;

  if (svc) {
    let config: PersonalizadoPricingConfig = DEFAULT_PERSONALIZADO_PRICING;
    const { data: cfgRow } = await svc
      .from('platform_config').select('value').eq('key', PERSONALIZADO_PRICING_KEY).maybeSingle();
    if (cfgRow?.value) config = cfgRow.value as PersonalizadoPricingConfig;

    const { data: tRow } = await svc
      .from('personalizado_tournaments').select('categories').eq('id', tournamentId).maybeSingle();
    if (tRow) {
      const categories = (tRow.categories as { maxTeams: number }[]) ?? [];
      const resolution = resolvePrice(config, totalTeamsOf(categories), promoCode ?? null);
      price = resolution.finalPrice;
      appliedPromoId = resolution.appliedPromo?.id ?? null;
    }
  }

  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'Precio no válido' }, { status: 400 });
  }

  // Best-effort redemption tracking (no webhook infra — increments at hand-off).
  async function bumpRedemption() {
    if (!svc || !appliedPromoId) return;
    try {
      const { data } = await svc
        .from('platform_config').select('value').eq('key', PERSONALIZADO_PRICING_KEY).maybeSingle();
      const cfg = data?.value as PersonalizadoPricingConfig | undefined;
      if (!cfg?.promos) return;
      const promos = cfg.promos.map(p =>
        p.id === appliedPromoId ? { ...p, usedCount: (p.usedCount ?? 0) + 1 } : p,
      );
      await svc.from('platform_config').update({ value: { ...cfg, promos } }).eq('key', PERSONALIZADO_PRICING_KEY);
    } catch { /* non-blocking */ }
  }

  // Free (100% off / promo) → open without Stripe.
  if (price === 0) {
    await bumpRedemption();
    return NextResponse.json({ url: `${appUrl}${successPath}&session_id=cs_free_${Date.now()}`, free: true });
  }

  // Dev mode: return a fake checkout URL that skips Stripe (never in production)
  if (isDevMode) {
    await bumpRedemption();
    return NextResponse.json({ url: `${appUrl}${successPath}&session_id=cs_dev_${Date.now()}` });
  }

  // Stripe not configured and not in dev mode → explicit error, no fake success
  if (!stripeSecretKey || stripeSecretKey.startsWith('sk_test_...')) {
    return NextResponse.json({ error: 'Pagos no disponibles temporalmente' }, { status: 503 });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Apertura de inscripción — ${tournamentCode}` },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      success_url: `${appUrl}${successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/dashboard/player/tournaments/personalizado/${tournamentId}`,
      ...(userEmail ? { customer_email: userEmail } : {}),
      metadata: { tournamentId, tournamentCode, kind: 'personalizado_open_registration', ...(promoCode ? { promoCode } : {}) },
    });

    // Redemption count is updated by the Stripe webhook on checkout.session.completed,
    // so we don't bump here — this avoids counting abandoned checkout sessions.
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] open-registration error:', err);
    return NextResponse.json({ error: 'Error al crear la sesión de pago' }, { status: 500 });
  }
}
