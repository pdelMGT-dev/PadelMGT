import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.startsWith('sk_test_...')) {
    return NextResponse.json({ error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY en Vercel.' }, { status: 503 });
  }

  let body: { planId: string; planName: string; priceMonthly: number; priceAnnual?: number; currency?: string };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { planId, planName, priceMonthly, priceAnnual, currency = 'usd' } = body;
  if (!planId || !planName || priceMonthly === undefined) {
    return NextResponse.json({ error: 'planId, planName y priceMonthly son requeridos' }, { status: 400 });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    // Create or retrieve the Product
    const products = await stripe.products.search({ query: `metadata['padelmgt_plan_id']:'${planId}'`, limit: 1 });
    let product = products.data[0];

    if (!product) {
      product = await stripe.products.create({
        name: `PadelMGT — ${planName}`,
        metadata: { padelmgt_plan_id: planId },
      });
    } else {
      product = await stripe.products.update(product.id, { name: `PadelMGT — ${planName}` });
    }

    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(priceMonthly * 100),
      currency,
      recurring: { interval: 'month' },
      metadata: { padelmgt_plan_id: planId, billing: 'monthly' },
    });

    let annualPriceId: string | undefined;

    if (priceAnnual && priceAnnual > 0) {
      const annualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(priceAnnual * 100),
        currency,
        recurring: { interval: 'year' },
        metadata: { padelmgt_plan_id: planId, billing: 'annual' },
      });
      annualPriceId = annualPrice.id;
    }

    return NextResponse.json({
      ok: true,
      productId: product.id,
      monthlyPriceId: monthlyPrice.id,
      annualPriceId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[SA stripe/create-price]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
