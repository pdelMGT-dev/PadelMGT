import { NextRequest, NextResponse } from 'next/server';

/**
 * Stripe webhook endpoint.
 * Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in environment variables.
 * Register this URL in Stripe Dashboard → Developers → Webhooks.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret   = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    console.error('[Stripe] Missing environment variables: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };

  try {
    // Dynamic import so the build doesn't fail if stripe is not installed yet
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as typeof event;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    console.error('[Stripe webhook]', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Handle events
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      console.log('[Stripe] Payment succeeded:', pi['id']);
      // TODO: update subscription/payment record in database
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      console.error('[Stripe] Payment failed:', pi['id']);
      // TODO: notify user or retry logic
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log(`[Stripe] Subscription ${event.type}:`, sub['id']);
      // TODO: update user plan in database
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object;
      console.log('[Stripe] Invoice paid:', invoice['id']);
      break;
    }
    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
