import { NextResponse } from 'next/server';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export async function GET() {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const prices = await stripe.prices.list({ active: true, expand: ['data.product'], limit: 100 });

    const result: Record<string, { monthly?: number; annual?: number; priceIds?: { monthly?: string; annual?: string } }> = {};

    for (const price of prices.data) {
      const product = price.product;
      if (typeof product === 'string' || product.deleted || !product.active) continue;
      const planId = product.metadata?.padelmgt_plan_id;
      if (!planId || !price.recurring || price.unit_amount === null) continue;

      if (!result[planId]) result[planId] = {};
      const amount = price.unit_amount / 100;

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
