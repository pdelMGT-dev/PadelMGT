import { NextRequest, NextResponse } from 'next/server';

// Map plan IDs to env var names
const PRICE_ENV_MAP: Record<string, string> = {
  player_pro:       'STRIPE_PRICE_PLAYER_PRO_MONTHLY',
  player_pro_year:  'STRIPE_PRICE_PLAYER_PRO_YEARLY',
  liga_basic:       'STRIPE_PRICE_LIGA_BASIC_MONTHLY',
  liga_pro:         'STRIPE_PRICE_LIGA_PRO_MONTHLY',
  liga_unlimited:   'STRIPE_PRICE_LIGA_UNLIMITED_MONTHLY',
  club_starter:     'STRIPE_PRICE_CLUB_STARTER_MONTHLY',
  club_pro:         'STRIPE_PRICE_CLUB_PRO_MONTHLY',
  club_liga:        'STRIPE_PRICE_CLUB_LIGA_MONTHLY',
  fed_basic:        'STRIPE_PRICE_FED_BASIC_MONTHLY',
  fed_pro:          'STRIPE_PRICE_FED_PRO_MONTHLY',
};

const DASHBOARD_REDIRECT: Record<string, string> = {
  player_pro:      '/dashboard/player?subscription=success',
  player_pro_year: '/dashboard/player?subscription=success',
  liga_basic:      '/dashboard/league?subscription=success',
  liga_pro:        '/dashboard/league?subscription=success',
  liga_unlimited:  '/dashboard/league?subscription=success',
  club_starter:    '/dashboard/club?subscription=success',
  club_pro:        '/dashboard/club?subscription=success',
  club_liga:       '/dashboard/club?subscription=success',
  fed_basic:       '/dashboard/federation?subscription=success',
  fed_pro:         '/dashboard/federation?subscription=success',
};

const TRIAL_DAYS: Record<string, number> = {
  player_pro: 0, player_pro_year: 0,   // no trial for individual players
  liga_basic: 14, liga_pro: 14, liga_unlimited: 14,
  club_starter: 14, club_pro: 14, club_liga: 14,
  fed_basic: 30, fed_pro: 30,
};

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const isDevMode = process.env.STRIPE_DEV_MODE === 'true';

  let plan: string, userEmail: string | undefined, couponCode: string | undefined;
  try {
    const body = await request.json() as { plan: string; userEmail?: string; couponCode?: string };
    plan       = body.plan;
    userEmail  = body.userEmail;
    couponCode = body.couponCode;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const envKey  = PRICE_ENV_MAP[plan];
  const priceId = envKey ? process.env[envKey] : undefined;

  if (!envKey || (!isDevMode && (!priceId || priceId.startsWith('price_...')))) {
    return NextResponse.json({ error: 'Plan no válido o precio no configurado' }, { status: 400 });
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://padelmgt.com';
  const successPath = DASHBOARD_REDIRECT[plan] ?? '/dashboard/player?subscription=success';
  const trialDays   = TRIAL_DAYS[plan] ?? 0;

  // Dev mode: return a fake checkout URL that skips Stripe
  if (isDevMode || !stripeSecretKey || stripeSecretKey.startsWith('sk_test_...')) {
    const fakeUrl = `${appUrl}${successPath}&plan=${plan}&session_id=cs_dev_${Date.now()}`;
    return NextResponse.json({ url: fakeUrl });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);

    // Resolve coupon: look up Stripe promotion code if provided
    let stripePromotionCodeId: string | undefined;
    if (couponCode) {
      try {
        const promoCodes = await stripe.promotionCodes.list({ code: couponCode, active: true, limit: 1 });
        if (promoCodes.data.length > 0) stripePromotionCodeId = promoCodes.data[0].id;
      } catch { /* coupon lookup failed — proceed without discount */ }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}${successPath}&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/pricing`,
      allow_promotion_codes: !stripePromotionCodeId, // allow manual entry if no auto-apply
      ...(stripePromotionCodeId ? { discounts: [{ promotion_code: stripePromotionCodeId }] } : {}),
      ...(userEmail ? { customer_email: userEmail } : {}),
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: { plan, userEmail: userEmail ?? '' },
      },
      metadata: { plan, userEmail: userEmail ?? '' },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] create-checkout-session error:', err);
    return NextResponse.json({ error: 'Error al crear la sesión de pago' }, { status: 500 });
  }
}
