import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_LIMITS } from '@/lib/plan-config';

export const revalidate = 300;

export async function GET() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!url || !anonKey) return NextResponse.json({ limits: DEFAULT_LIMITS });

  try {
    const sb = createClient(url, svcKey || anonKey);
    const { data } = await sb
      .from('platform_config')
      .select('value')
      .eq('key', 'plan_limits')
      .maybeSingle();

    const stored = data?.value as Record<string, unknown> | null;
    if (!stored || Object.keys(stored).length === 0) {
      return NextResponse.json({ limits: DEFAULT_LIMITS });
    }
    // Merge with defaults so any new plan added in future has fallback limits
    const merged = { ...DEFAULT_LIMITS, ...stored };
    return NextResponse.json({ limits: merged });
  } catch {
    return NextResponse.json({ limits: DEFAULT_LIMITS });
  }
}
