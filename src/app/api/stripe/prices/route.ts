import { NextResponse } from 'next/server';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Map of plan ID → expected Stripe product name patterns
const PLAN_NAME_MAP: Record<string, string> = {
  free:  'free',
  basic: 'basic',
  pro:   'pro',
  club:  'club',
};

export async function GET() {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  try {
    // Fetch active prices from Stripe
    const res = await fetch('https://api.stripe.com/v1/prices?active=true&expand[]=data.product&limit=100', {
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      return NextResponse.json({ error: err.error?.message ?? 'Stripe API error' }, { status: 502 });
    }

    const data = await res.json() as {
      data: Array<{
        id: string;
        unit_amount: number;
        currency: string;
        recurring?: { interval: 'month' | 'year' };
        product: { name: string; active: boolean };
      }>;
    };

    // Build plan pricing map
    const result: Record<string, { monthly?: number; annual?: number; priceIds?: { monthly?: string; annual?: string } }> = {};

    for (const price of data.data) {
      if (!price.recurring || !price.product.active) continue;
      const productName = price.product.name.toLowerCase();
      const planId = Object.keys(PLAN_NAME_MAP).find(id => productName.includes(PLAN_NAME_MAP[id]));
      if (!planId) continue;

      if (!result[planId]) result[planId] = {};
      const amount = price.unit_amount / 100; // convert cents to dollars

      if (price.recurring.interval === 'month') {
        result[planId].monthly = amount;
        if (!result[planId].priceIds) result[planId].priceIds = {};
        result[planId].priceIds!.monthly = price.id;
      } else if (price.recurring.interval === 'year') {
        result[planId].annual = amount;
        if (!result[planId].priceIds) result[planId].priceIds = {};
        result[planId].priceIds!.annual = price.id;
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Stripe prices fetch error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
