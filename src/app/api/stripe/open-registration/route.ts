import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  // Dev mode requires explicit opt-in AND non-production. A missing Stripe key
  // in production must NOT silently grant fake "paid" checkouts.
  const isDevMode = process.env.STRIPE_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';

  let tournamentId: string, tournamentCode: string, price: number, userEmail: string | undefined;
  try {
    const body = await request.json() as { tournamentId: string; tournamentCode: string; price: number; userEmail?: string };
    tournamentId   = body.tournamentId;
    tournamentCode = body.tournamentCode;
    price          = body.price;
    userEmail      = body.userEmail;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!tournamentId || !tournamentCode) {
    return NextResponse.json({ error: 'Datos del torneo incompletos' }, { status: 400 });
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: 'Precio no válido' }, { status: 400 });
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://padelmgt.com';
  const successPath = `/dashboard/player/tournaments/personalizado/${tournamentId}?registration=opened`;

  // Dev mode: return a fake checkout URL that skips Stripe (never in production)
  if (isDevMode) {
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
      metadata: { tournamentId, tournamentCode, kind: 'personalizado_open_registration' },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] open-registration error:', err);
    return NextResponse.json({ error: 'Error al crear la sesión de pago' }, { status: 500 });
  }
}
