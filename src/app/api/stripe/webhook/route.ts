import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_PLAYER_BASIC_MONTHLY     ?? '']: 'player_basic',
  [process.env.STRIPE_PRICE_PLAYER_BASIC_YEARLY      ?? '']: 'player_basic',
  [process.env.STRIPE_PRICE_PLAYER_PRO_MONTHLY       ?? '']: 'player_pro',
  [process.env.STRIPE_PRICE_PLAYER_PRO_YEARLY        ?? '']: 'player_pro',
  [process.env.STRIPE_PRICE_PLAYER_UNLIMITED_MONTHLY ?? '']: 'player_unlimited',
  [process.env.STRIPE_PRICE_PLAYER_UNLIMITED_YEARLY  ?? '']: 'player_unlimited',
  [process.env.STRIPE_PRICE_LIGA_BASIC_MONTHLY  ?? '']: 'liga_basic',
  [process.env.STRIPE_PRICE_LIGA_PRO_MONTHLY    ?? '']: 'liga_pro',
  [process.env.STRIPE_PRICE_LIGA_UNLIMITED_MONTHLY ?? '']: 'liga_unlimited',
  [process.env.STRIPE_PRICE_CLUB_STARTER_MONTHLY ?? '']: 'club_starter',
  [process.env.STRIPE_PRICE_CLUB_PRO_MONTHLY    ?? '']: 'club_pro',
  [process.env.STRIPE_PRICE_CLUB_LIGA_MONTHLY   ?? '']: 'club_liga',
};

function derivePlanFromPriceId(priceId: string): string {
  return PRICE_TO_PLAN[priceId] ?? 'player_pro';
}

// Normalize billing-variant plan IDs to their base plan for DB storage
const PLAN_NORMALIZE: Record<string, string> = {
  player_basic_year:     'player_basic',
  player_basic_monthly:  'player_basic',
  player_pro_year:       'player_pro',
  player_pro_monthly:    'player_pro',
  player_unlimited_year: 'player_unlimited',
  player_unlimited_monthly: 'player_unlimited',
  liga_basic_yearly:   'liga_basic',
  liga_pro_yearly:     'liga_pro',
  liga_unlimited_yearly: 'liga_unlimited',
  club_starter_yearly: 'club_starter',
  club_pro_yearly:     'club_pro',
  club_liga_yearly:    'club_liga',
};

function normalizePlan(plan: string): string {
  return PLAN_NORMALIZE[plan] ?? plan;
}

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
  // Stripe issues a SEPARATE signing secret per mode even for the same
  // endpoint URL — if this URL is registered as a webhook destination in
  // both Test mode and Live mode, only one secret can live in
  // STRIPE_WEBHOOK_SECRET. Set STRIPE_WEBHOOK_SECRET_TEST to the test-mode
  // endpoint's secret (Stripe Dashboard → Developers → Webhooks → toggle
  // Test mode → this endpoint → Signing secret) so both verify correctly.
  const webhookSecretTest = process.env.STRIPE_WEBHOOK_SECRET_TEST;

  if (!stripeSecretKey || !webhookSecret) {
    console.error('[Stripe] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as typeof event;
    } catch (liveErr) {
      if (!webhookSecretTest) throw liveErr;
      event = stripe.webhooks.constructEvent(body, signature, webhookSecretTest) as typeof event;
    }
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
      const plan   = (sub['metadata'] as Record<string, string>)?.plan ?? '';
      let   email  = (sub['metadata'] as Record<string, string>)?.userEmail ?? '';
      const status = sub['status'] as string;

      // If metadata is missing email, fetch it from the Stripe customer object
      if (!email && sub['customer']) {
        try {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(stripeSecretKey!);
          const customer = await stripe.customers.retrieve(sub['customer'] as string);
          if ('email' in customer && customer.email) email = customer.email;
        } catch { /* non-blocking */ }
      }

      // Derive plan from price ID if not in metadata
      const resolvedPlan = plan || derivePlanFromPriceId(
        ((sub['items'] as Record<string, unknown>)?.['data'] as Array<Record<string, unknown>>)?.[0]
          ?.['price'] ? (((sub['items'] as Record<string, unknown>)?.['data'] as Array<Record<string, unknown>>)[0]['price'] as Record<string, unknown>)['id'] as string : ''
      );

      console.log(`[Stripe] Subscription ${event.type}: plan=${resolvedPlan} email=${email} status=${status}`);

      if (sb && email) {
        const { error: subErr } = await sb.from('subscriptions').upsert({
          stripe_subscription_id: sub['id'],
          stripe_customer_id:     sub['customer'],
          plan: normalizePlan(resolvedPlan),
          status,
          email,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' });
        if (subErr) console.error('[Stripe] subscriptions upsert error:', subErr.message);

        // Try lookup by email first
        let { data: player, error: playerErr } = await sb.from('players')
          .select('id, custom_fields')
          .eq('email', email.toLowerCase())
          .maybeSingle();
        if (playerErr) console.warn('[Stripe] player lookup by email error:', playerErr.message);

        // Fallback: look up auth user by email, then player by user_id
        if (!player) {
          console.log(`[Stripe] No player found by email=${email}, trying auth lookup...`);
          const { data: authList } = await sb.auth.admin.listUsers();
          const authUser = authList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
          if (authUser) {
            console.log(`[Stripe] Found auth user: ${authUser.id}, looking up player by user_id...`);
            const { data: playerByUid } = await sb.from('players')
              .select('id, custom_fields')
              .eq('user_id', authUser.id)
              .maybeSingle();
            if (playerByUid) player = playerByUid;
          } else {
            console.warn(`[Stripe] No auth user found with email=${email}`);
          }
        }

        if (player) {
          const normalizedPlan = normalizePlan(resolvedPlan);
          const cf = (player['custom_fields'] as Record<string, unknown>) ?? {};
          // 'infinity' is an explicit SA-granted override (not a sellable
          // plan) — no Stripe subscription should ever downgrade it, mirroring
          // the same protection /api/me/plan already applies on the read side.
          if (cf.plan === 'infinity') {
            console.log(`[Stripe] Player ${player['id']} has plan=infinity (SA override) — not overwriting from subscription`);
            const { error: statusErr } = await sb.from('players')
              .update({ custom_fields: { ...cf, subscriptionStatus: status } })
              .eq('id', player['id']);
            if (statusErr) console.error('[Stripe] player status update error:', statusErr.message);
          } else {
            console.log(`[Stripe] Updating player ${player['id']} with plan=${normalizedPlan}`);
            const { error: updateErr } = await sb.from('players')
              .update({ custom_fields: { ...cf, plan: normalizedPlan, subscriptionStatus: status } })
              .eq('id', player['id']);
            if (updateErr) console.error('[Stripe] player update error:', updateErr.message);
            else console.log(`[Stripe] Player ${player['id']} plan updated to ${normalizedPlan} ✓`);
          }
        } else {
          console.warn(`[Stripe] No player record found for email=${email} — plan not saved to players table`);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub   = event.data.object;
      const email = (sub['metadata'] as Record<string, string>)?.userEmail ?? '';

      console.log('[Stripe] Subscription cancelled:', sub['id']);

      if (sb && email) {
        const { error: cancelErr } = await sb.from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub['id']);
        if (cancelErr) console.warn('[Supabase] subscription cancel failed:', cancelErr.message);

        const { data: player } = await sb.from('players')
          .select('id, custom_fields')
          .eq('email', email.toLowerCase())
          .maybeSingle();
        if (player) {
          const cf = (player['custom_fields'] as Record<string, unknown>) ?? {};
          // Same infinity protection as the created/updated handler above.
          const nextPlan = cf.plan === 'infinity' ? 'infinity' : 'free';
          await sb.from('players')
            .update({ custom_fields: { ...cf, plan: nextPlan, subscriptionStatus: 'canceled' } })
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
        const { error: pastDueErr } = await sb.from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('email', email.toLowerCase());
        if (pastDueErr) console.warn('[Supabase] subscription past_due update failed:', pastDueErr.message);
      }
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
