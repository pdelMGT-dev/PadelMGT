import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public read of the global ranking point config (win/draw/loss). Written
// only through /api/sa/ranking-config (SA-guarded).

interface RankingTableConfig {
  id: string;
  name: string;
  scope: 'global' | 'league' | 'club' | 'federation';
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  active: boolean;
  createdAt: string;
}

const DEFAULT_GLOBAL: RankingTableConfig = {
  id: 'global', name: 'Global', scope: 'global',
  pointsWin: 3, pointsDraw: 1, pointsLoss: -1,
  active: true, createdAt: new Date(0).toISOString(),
};

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return NextResponse.json({ config: DEFAULT_GLOBAL });

  try {
    const sb = createClient(url, key);
    const { data } = await sb.from('platform_config').select('value').eq('key', 'ranking_global').maybeSingle();
    const stored = (data?.value ?? {}) as Partial<RankingTableConfig>;
    return NextResponse.json({ config: { ...DEFAULT_GLOBAL, ...stored } });
  } catch {
    return NextResponse.json({ config: DEFAULT_GLOBAL });
  }
}
