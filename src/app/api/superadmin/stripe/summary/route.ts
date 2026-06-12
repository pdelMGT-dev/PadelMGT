import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

// SA-only revenue summary pulled live from Stripe: balance, recent payments
// and an MRR estimate from active subscriptions. Returns { connected: false }
// when STRIPE_SECRET_KEY isn't configured so the dashboard degrades gracefully.

export async function GET(request: NextRequest) {
  const sa = await requireSARequest(request);
  if (!sa) return saUnauthorized();

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ connected: false });

  const stripe = new Stripe(key);

  try {
    const [balance, charges, subs] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.charges.list({ limit: 20 }),
      stripe.subscriptions.list({ status: 'active', limit: 100 }),
    ]);

    const sum = (items: { amount: number; currency: string }[]) => {
      const byCurrency: Record<string, number> = {};
      for (const i of items) byCurrency[i.currency] = (byCurrency[i.currency] ?? 0) + i.amount;
      return byCurrency;
    };

    // Revenue this calendar month (succeeded charges)
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthRevenue = charges.data
      .filter(c => c.status === 'succeeded' && c.created * 1000 >= monthStart.getTime())
      .reduce((acc, c) => acc + c.amount, 0);

    // MRR estimate from active subscriptions (normalize yearly → monthly)
    let mrrCents = 0;
    for (const s of subs.data) {
      for (const item of s.items.data) {
        const price = item.price;
        const unit = price.unit_amount ?? 0;
        const qty = item.quantity ?? 1;
        if (price.recurring?.interval === 'year') mrrCents += (unit * qty) / 12;
        else if (price.recurring?.interval === 'month') mrrCents += unit * qty;
      }
    }

    return NextResponse.json({
      connected: true,
      livemode: charges.data[0]?.livemode ?? !key.startsWith('sk_test_'),
      balanceAvailable: sum(balance.available),
      balancePending: sum(balance.pending),
      monthRevenueCents: monthRevenue,
      mrrCents: Math.round(mrrCents),
      activeSubscriptions: subs.data.length,
      recentCharges: charges.data.map(c => ({
        id: c.id,
        amount: c.amount,
        currency: c.currency,
        status: c.status,
        description: c.description ?? c.billing_details?.email ?? '',
        email: c.billing_details?.email ?? c.receipt_email ?? '',
        created: c.created * 1000,
        refunded: c.refunded,
      })),
    });
  } catch (err) {
    console.error('[SA Stripe] summary error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ connected: false, error: 'No se pudo conectar con Stripe' });
  }
}
