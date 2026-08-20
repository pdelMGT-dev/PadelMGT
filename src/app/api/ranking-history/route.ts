import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getServerUser } from '@/lib/supabase-server';

/**
 * Service-role handler for ranking_history (per-game point deltas).
 * Any authenticated player may write entries — a finished game/tournament's
 * ranking application credits ALL participants, not just the caller,
 * mirroring how quick_games/tournaments already allow any logged-in player
 * to write results that affect other participants.
 *
 *   GET  ?playerId=   → that player's entries.
 *   GET  ?gameId=     → all entries for one game/tournament (dedup check).
 *   POST              → insert entries[]; optional replaceGameId deletes any
 *                       existing rows for that gameId first (tournament
 *                       recompute case).
 */

interface Row {
  id: string; game_id: string; game_name: string; game_date: string | null;
  player_id: string; player_name: string; result: string; delta: number;
  new_total: number; league_id: string | null; created_at: string;
}

function toDto(r: Row) {
  return {
    id: r.id, gameId: r.game_id, gameName: r.game_name, gameDate: r.game_date ?? '',
    playerId: r.player_id, playerName: r.player_name, result: r.result,
    delta: r.delta, newTotal: r.new_total, leagueId: r.league_id ?? undefined, createdAt: r.created_at,
  };
}

export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ entries: [] });

  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const gameId = searchParams.get('gameId');
  if (!playerId && !gameId) return NextResponse.json({ error: 'Falta playerId o gameId' }, { status: 400 });

  let query = svc.from('ranking_history').select('*');
  query = playerId ? query.eq('player_id', playerId) : query.eq('game_id', gameId as string);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entries: ((data ?? []) as Row[]).map(toDto) });
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  if (!(await getServerUser(request))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: {
    entries?: Array<{
      id: string; gameId: string; gameName: string; gameDate?: string;
      playerId: string; playerName: string; result: string; delta: number;
      newTotal: number; leagueId?: string; createdAt: string;
    }>;
    replaceGameId?: string;
  };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 }); }

  const entries = body.entries ?? [];
  if (entries.length === 0 && !body.replaceGameId) return NextResponse.json({ ok: true });

  if (body.replaceGameId) {
    const { error: delError } = await svc.from('ranking_history').delete().eq('game_id', body.replaceGameId);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  if (entries.length > 0) {
    const rows = entries.map(e => ({
      id: e.id, game_id: e.gameId, game_name: e.gameName, game_date: e.gameDate ?? null,
      player_id: e.playerId, player_name: e.playerName, result: e.result,
      delta: e.delta, new_total: e.newTotal, league_id: e.leagueId ?? null, created_at: e.createdAt,
    }));
    const { error } = await svc.from('ranking_history').upsert(rows, { onConflict: 'id' });
    if (error) { console.warn('[ranking-history]', error.message); return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 }); }
  }

  return NextResponse.json({ ok: true });
}
