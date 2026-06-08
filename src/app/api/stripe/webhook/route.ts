import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const body      = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret   = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    console.error('[Stripe] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as typeof event;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    console.error('[Stripe webhook] signature error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const sb = supabaseAdmin();

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub    = event.data.object;
      const plan   = (sub['metadata'] as Record<string, string>)?.plan ?? 'club';
      const email  = (sub['metadata'] as Record<string, string>)?.userEmail ?? '';
      const status = sub['status'] as string; // 'active' | 'trialing' | 'past_due' | etc.

      console.log(`[Stripe] Subscription ${event.type}: plan=${plan} email=${email} status=${status}`);

      if (sb && email) {
        // Upsert into subscriptions table; also patch player's custom_fields.plan
        await sb.from('subscriptions').upsert({
          stripe_subscription_id: sub['id'],
          stripe_customer_id:     sub['customer'],
          plan,
          status,
          email,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' }).catch(err =>
          console.warn('[Supabase] subscription upsert failed:', err)
        );

        // Reflect plan on the player record so the dashboard can check it
        const { data: player } = await sb.from('players')
          .select('id, custom_fields')
          .eq('email', email.toLowerCase())
          .maybeSingle();
        if (player) {
          const cf = (player['custom_fields'] as Record<string, unknown>) ?? {};
          await sb.from('players')
            .update({ custom_fields: { ...cf, plan, subscriptionStatus: status } })
            .eq('id', player['id']);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub   = event.data.object;
      const email = (sub['metadata'] as Record<string, string>)?.userEmail ?? '';

      console.log('[Stripe] Subscription cancelled:', sub['id']);

      if (sb && email) {
        await sb.from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub['id'])
          .catch(err => console.warn('[Supabase] subscription cancel failed:', err));

        const { data: player } = await sb.from('players')
          .select('id, custom_fields')
          .eq('email', email.toLowerCase())
          .maybeSingle();
        if (player) {
          const cf = (player['custom_fields'] as Record<string, unknown>) ?? {};
          await sb.from('players')
            .update({ custom_fields: { ...cf, plan: 'free', subscriptionStatus: 'canceled' } })
            .eq('id', player['id']);
        }
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      console.log('[Stripe] Invoice paid:', invoice['id'], 'amount:', invoice['amount_paid']);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const email   = (invoice['customer_email'] as string) ?? '';
      console.error('[Stripe] Payment failed for:', email, 'invoice:', invoice['id']);

      if (sb && email) {
        await sb.from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('email', email.toLowerCase())
          .catch(err => console.warn('[Supabase] subscription past_due update failed:', err));
      }
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
