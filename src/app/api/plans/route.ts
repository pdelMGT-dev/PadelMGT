import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export const revalidate = 60; // cache 60s

export async function GET() {
  try {
    const sb = supabaseAnon();
    if (!sb) return NextResponse.json({ plans: [] });

    const { data } = await sb
      .from('platform_config')
      .select('value')
      .eq('key', 'published_plans')
      .maybeSingle();

    const plans = data?.value ?? [];
    return NextResponse.json({ plans });
  } catch {
    return NextResponse.json({ plans: [] });
  }
}
