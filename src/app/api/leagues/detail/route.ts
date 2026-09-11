import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import type { ActiveGame } from '@/lib/game-engine';

/**
 * Public read of everything the league detail page (and the public /l/[code]
 * page) needs to render correctly for ANY viewer — not just the device that
 * created/administered the league. Before this route existed, that page read
 * league/members/seasons/games purely from localStorage, which is empty for
 * any player who never personally created/administered something in this
 * league, and — for games — never complete anyway, since a device only ever
 * caches the games IT touched, not every game other members played. quick_games
 * is already world-readable (the public share pages rely on this), so there's
 * no new exposure here.
 */
export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const [{ data: leagueRow }, { data: memberRows }, { data: seasonRows }, { data: gameRows }] = await Promise.all([
    svc.from('player_leagues').select('*').eq('id', id).maybeSingle(),
    svc.from('league_members').select('*').eq('league_id', id),
    svc.from('league_seasons').select('*').eq('league_id', id),
    svc.from('quick_games').select('data').eq('status', 'completed').contains('data', { leagueId: id }),
  ]);

  if (!leagueRow) return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 });
  const l = leagueRow as Record<string, unknown>;

  const league = {
    id: l.id as string,
    code: (l.code as string) ?? '',
    name: l.name as string,
    description: (l.description as string) ?? undefined,
    createdBy: (l.created_by as string) ?? '',
    createdByName: (l.created_by_name as string) ?? '',
    createdAt: (l.created_at as string) ?? '',
    isOpen: !!l.is_open,
    isPublic: l.is_public ?? true,
    defaultPointsWin: (l.default_points_win as number) ?? 3,
    defaultPointsDraw: (l.default_points_draw as number) ?? 1,
    defaultPointsLoss: (l.default_points_loss as number) ?? 0,
    logoUrl: (l.logo_url as string) || undefined,
    bannerUrl: (l.banner_url as string) || undefined,
  };

  const members = ((memberRows ?? []) as Record<string, unknown>[]).map(m => ({
    id: m.id as string,
    leagueId: m.league_id as string,
    playerId: m.player_id as string,
    playerName: (m.player_name as string) ?? '',
    role: ((m.role as string) === 'admin' ? 'admin' : 'member') as 'admin' | 'member',
    joinedAt: (m.joined_at as string) ?? '',
  }));

  const seasons = ((seasonRows ?? []) as Record<string, unknown>[]).map(s => ({
    id: s.id as string,
    leagueId: s.league_id as string,
    name: s.name as string,
    startDate: (s.start_date as string) ?? '',
    endDate: (s.end_date as string) ?? '',
    pointsWin: (s.points_win as number) ?? 3,
    pointsDraw: (s.points_draw as number) ?? 1,
    pointsLoss: (s.points_loss as number) ?? 0,
    status: ((s.status as string) ?? 'upcoming') as 'upcoming' | 'active' | 'completed',
  }));

  const games = ((gameRows ?? []) as Array<{ data: ActiveGame }>).map(r => r.data).filter(Boolean);

  return NextResponse.json({ league, members, seasons, games });
}
