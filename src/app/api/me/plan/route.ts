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
    // 1. Player record linked to this auth user
    const { data: player } = await db
      .from('players')
      .select('email, custom_fields')
      .eq('user_id', user.id)
      .maybeSingle();

    const cfPlan = (player?.custom_fields as Record<string, unknown>)?.plan;
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
      if (sub?.plan) plan = sub.plan as string;
    }
  } catch {
    // fall through with whatever we resolved
  }

  return NextResponse.json({ plan, verified: true });
}
