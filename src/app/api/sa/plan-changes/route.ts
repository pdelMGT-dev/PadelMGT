import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

// SA audit trail of player plan-tier changes. service_role only — guarded
// by the signed SA session cookie.

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ changes: [] });

  const { data, error } = await sb.from('plan_changes').select('*').order('changed_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    changes: (data ?? []).map(c => ({
      id: c.id, userId: c.user_id, userName: c.user_name, userEmail: c.user_email,
      fromPlan: c.from_plan, toPlan: c.to_plan, changedBy: c.changed_by, changedAt: c.changed_at,
      reason: c.reason ?? undefined, stripeSubscriptionId: c.stripe_subscription_id ?? undefined,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireSARequest(request))) return saUnauthorized();
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let body: {
    id?: string; userId?: string; userName?: string; userEmail?: string;
    fromPlan?: string; toPlan?: string; changedBy?: string; changedAt?: string;
    reason?: string; stripeSubscriptionId?: string;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.id || !body.userId || !body.fromPlan || !body.toPlan) {
    return NextResponse.json({ error: 'id, userId, fromPlan y toPlan son requeridos' }, { status: 400 });
  }

  const { error } = await sb.from('plan_changes').insert({
    id: body.id,
    user_id: body.userId,
    user_name: body.userName ?? '',
    user_email: body.userEmail ?? '',
    from_plan: body.fromPlan,
    to_plan: body.toPlan,
    changed_by: body.changedBy ?? 'Super Admin',
    changed_at: body.changedAt ?? new Date().toISOString(),
    reason: body.reason ?? null,
    stripe_subscription_id: body.stripeSubscriptionId ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
