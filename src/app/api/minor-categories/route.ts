import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public read of the SA-configurable minor (age) categories. Written only
// through /api/sa/minor-categories (SA-guarded).

interface MinorCategory { id: string; name: string; maxAge: number; }

const DEFAULT_MINOR_CATEGORIES: MinorCategory[] = [
  { id: 'benjamin', name: 'Benjamín', maxAge: 10 },
  { id: 'alevin',   name: 'Alevín',   maxAge: 12 },
  { id: 'infantil', name: 'Infantil', maxAge: 14 },
  { id: 'cadete',   name: 'Cadete',   maxAge: 16 },
  { id: 'junior',   name: 'Junior',   maxAge: 18 },
];

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return NextResponse.json({ categories: DEFAULT_MINOR_CATEGORIES });

  try {
    const sb = createClient(url, key);
    const { data } = await sb.from('platform_config').select('value').eq('key', 'minor_categories').maybeSingle();
    const stored = data?.value as MinorCategory[] | undefined;
    return NextResponse.json({ categories: Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_MINOR_CATEGORIES });
  } catch {
    return NextResponse.json({ categories: DEFAULT_MINOR_CATEGORIES });
  }
}
