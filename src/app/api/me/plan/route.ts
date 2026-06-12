import { NextRequest, NextResponse } from 'next/server';
import { getServerUser, serviceClient } from '@/lib/supabase-server';

// Returns the caller's REAL plan, derived server-side from their verified
// Supabase session: players.custom_fields.plan (set by the Stripe webhook /
// SA back-office) plus any active subscription row. The client must not be
// trusted for plan/entitlement decisions.

export async function GET(request: NextRequest) {
  const user = await getServerUser(request);
  if (!user) return NextResponse.json({ plan: 'free', verified: false }, { status: 200 });

  const db = serviceClient();
  if (!db) return NextResponse.json({ plan: 'free', verified: false }, { status: 200 });

  let plan = 'free';

  try {
    // 1. Player record linked to this auth user. SA-created player rows may
    //    not have user_id set, so fall back to matching by auth email —
    //    otherwise SA plan changes (custom_fields.plan) are never picked up.
    let { data: player } = await db
      .from('players')
      .select('email, custom_fields')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!player && user.email) {
      const { data: byEmail } = await db
        .from('players')
        .select('email, custom_fields')
        .ilike('email', user.email)
        .maybeSingle();
      player = byEmail;
    }

    // If the user_id row has no plan but an email-matched row does, prefer it
    // (SA may have edited a different row for the same person).
    const cfPlanOf = (p: typeof player) =>
      (p?.custom_fields as Record<string, unknown> | null)?.plan;
    let cfPlan = cfPlanOf(player);
    if ((typeof cfPlan !== 'string' || !cfPlan || cfPlan === 'free') && user.email) {
      const { data: byEmail } = await db
        .from('players')
        .select('email, custom_fields')
        .ilike('email', user.email)
        .maybeSingle();
      const emailPlan = cfPlanOf(byEmail);
      if (typeof emailPlan === 'string' && emailPlan && emailPlan !== 'free') {
        cfPlan = emailPlan;
        if (!player) player = byEmail;
      }
    }
    if (typeof cfPlan === 'string' && cfPlan) plan = cfPlan;

    // 2. Active subscription by email (Stripe webhook source of truth)
    const email = (player?.email as string) ?? user.email;
    if (email) {
      const { data: sub } = await db
        .from('subscriptions')
        .select('plan, status')
        .eq('email', email.toLowerCase())
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      // Subscription wins over custom_fields EXCEPT for infinity, which is an
      // explicit SA-granted override that no Stripe plan should downgrade.
      if (sub?.plan && plan !== 'infinity') plan = sub.plan as string;
    }
  } catch {
    // fall through with whatever we resolved
  }

  return NextResponse.json({ plan, verified: true });
}
