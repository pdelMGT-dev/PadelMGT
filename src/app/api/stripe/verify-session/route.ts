import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id requerido' }, { status: 400 });
  }

  // Dev mode: fake session IDs — ONLY honored when dev mode is explicitly
  // enabled AND we are not in production. Otherwise this would let anyone
  // self-upgrade to any plan with ?session_id=cs_dev_x&plan=club_liga.
  if (sessionId.startsWith('cs_dev_')) {
    const devModeAllowed = process.env.STRIPE_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';
    if (!devModeAllowed) {
      return NextResponse.json({ status: 'error' }, { status: 400 });
    }
    const plan = request.nextUrl.searchParams.get('plan') ?? undefined;
    return NextResponse.json({ status: 'paid', plan, customerEmail: undefined });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey || stripeSecretKey.startsWith('sk_test_...')) {
    return NextResponse.json({ status: 'not_configured' });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      return NextResponse.json({ status: 'pending', paymentStatus: session.payment_status });
    }

    const plan = session.metadata?.plan as string | undefined;
    const customerEmail = session.customer_email ?? session.customer_details?.email ?? undefined;

    return NextResponse.json({ status: 'paid', plan, customerEmail });
  } catch (err) {
    console.error('[Stripe] verify-session error:', err);
    return NextResponse.json({ status: 'error' });
  }
}
