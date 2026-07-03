import { NextRequest, NextResponse } from 'next/server';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

interface PlanInput {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  currency?: string;
  isActive: boolean;
}

interface SyncResult {
  planId: string;
  productId?: string;
  monthlyPriceId?: string;
  annualPriceId?: string;
  skipped?: boolean;
}

/**
 * Push SA's plan board to Stripe: one Product per plan (matched via
 * `padelmgt_plan_id` metadata, created if missing), one active Price per
 * billing interval. Stripe Prices are immutable, so a changed amount creates
 * a new Price and deactivates the old one instead of patching it in place.
 * Only active plans with a non-zero price are synced — free plans need no
 * Stripe object.
 */
export async function POST(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.startsWith('sk_test_...')) {
    return NextResponse.json({ error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY en Vercel.' }, { status: 503 });
  }

  let body: { plans: PlanInput[] };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const activePlans = (body.plans ?? []).filter(p => p.isActive);
  if (activePlans.length === 0) {
    return NextResponse.json({ error: 'No hay planes activos para sincronizar' }, { status: 400 });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    const results: SyncResult[] = [];

    for (const plan of activePlans) {
      if (plan.priceMonthly <= 0 && plan.priceAnnual <= 0) {
        results.push({ planId: plan.id, skipped: true });
        continue;
      }

      const productName = `PadelMGT — ${plan.name}`;
      const search = await stripe.products.search({ query: `metadata['padelmgt_plan_id']:'${plan.id}'`, limit: 1 });
      let product = search.data[0];

      if (!product) {
        product = await stripe.products.create({
          name: productName,
          description: plan.description,
          metadata: { padelmgt_plan_id: plan.id },
        });
      } else if (product.name !== productName || product.description !== plan.description) {
        product = await stripe.products.update(product.id, { name: productName, description: plan.description });
      }

      const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
      const currency = (plan.currency ?? 'usd').toLowerCase();

      async function syncInterval(interval: 'month' | 'year', amount: number): Promise<string | undefined> {
        if (!amount || amount <= 0) return undefined;
        const targetCents = Math.round(amount * 100);
        const existing = existingPrices.data.find(p => p.recurring?.interval === interval);
        if (existing && existing.unit_amount === targetCents) return existing.id;

        const created = await stripe.prices.create({
          product: product.id,
          unit_amount: targetCents,
          currency,
          recurring: { interval },
          metadata: { padelmgt_plan_id: plan.id, billing: interval === 'month' ? 'monthly' : 'annual' },
        });
        if (existing) await stripe.prices.update(existing.id, { active: false });
        return created.id;
      }

      const monthlyPriceId = await syncInterval('month', plan.priceMonthly);
      const annualPriceId = await syncInterval('year', plan.priceAnnual);

      results.push({ planId: plan.id, productId: product.id, monthlyPriceId, annualPriceId });
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[SA stripe/sync-plans]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
