import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey || stripeSecretKey.startsWith('sk_test_...')) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 });
  }

  let plan: string, userEmail: string | undefined;
  try {
    const body = await request.json() as { plan: string; userEmail?: string };
    plan      = body.plan;
    userEmail = body.userEmail;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const priceEnvMap: Record<string, string | undefined> = {
    club: process.env.STRIPE_PRICE_CLUB_MONTHLY,
    liga: process.env.STRIPE_PRICE_LIGA_MONTHLY,
  };
  const priceId = priceEnvMap[plan];
  if (!priceId || priceId.startsWith('price_...')) {
    return NextResponse.json({ error: 'Plan no válido o precio no configurado' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://padelmgt.com';
  const dashboardPath = plan === 'club' ? '/dashboard/club' : '/dashboard/league';

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}${dashboardPath}?subscription=success`,
      cancel_url:  `${appUrl}/pricing`,
      ...(userEmail ? { customer_email: userEmail } : {}),
      subscription_data: {
        trial_period_days: 14,
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
