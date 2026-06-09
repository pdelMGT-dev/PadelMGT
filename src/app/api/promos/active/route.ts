import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 60; // revalidate every minute for accurate slot counts

export async function GET() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!url || !anonKey) return NextResponse.json({ promos: [] });

  try {
    const sb = createClient(url, svcKey || anonKey);
    const now = new Date().toISOString();

    const { data } = await sb
      .from('promo_codes')
      .select('id, code, type, value, description, max_uses, used_count, expires_at, unlock_plan, unlock_months, display_on_pricing, display_text, display_badge')
      .eq('is_active', true)
      .eq('display_on_pricing', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    const active = (data ?? []).filter(p => {
      if (p.max_uses !== null && p.used_count >= p.max_uses) return false;
      return true;
    });

    return NextResponse.json({
      promos: active.map(p => ({
        id:            p.id,
        code:          p.code,
        type:          p.type,
        value:         p.value ?? 0,
        description:   p.description ?? '',
        maxUses:       p.max_uses ?? null,
        usedCount:     p.used_count ?? 0,
        expiresAt:     p.expires_at ?? null,
        unlockPlan:    p.unlock_plan ?? null,
        unlockMonths:  p.unlock_months ?? null,
        displayText:   p.display_text ?? '',
        displayBadge:  p.display_badge ?? '',
      })),
    });
  } catch {
    return NextResponse.json({ promos: [] });
  }
}
