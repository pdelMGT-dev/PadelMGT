import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';

/**
 * Server-verified monthly usage count (games/tournaments created this
 * calendar month), derived by counting the caller's real rows in Supabase
 * instead of trusting a client-side counter — a local counter can be reset
 * by clearing storage or switching device/browser, silently bypassing the
 * plan's monthly limits.
 */
export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ games: 0, tournaments: 0 });

  const callerIds = await getCallerPlayerIds(request);
  if (callerIds.length === 0) return NextResponse.json({ games: 0, tournaments: 0 });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [{ count: games }, { count: tournaments }] = await Promise.all([
    svc.from('quick_games').select('id', { count: 'exact', head: true })
      .in('creator_player_id', callerIds).gte('created_at', monthStart),
    svc.from('tournaments').select('id', { count: 'exact', head: true })
      .in('creator_player_id', callerIds).gte('created_at', monthStart),
  ]);

  return NextResponse.json({ games: games ?? 0, tournaments: tournaments ?? 0 });
}
