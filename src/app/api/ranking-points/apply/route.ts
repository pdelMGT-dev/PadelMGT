import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getServerUser } from '@/lib/supabase-server';

/**
 * Apply a ranking-point delta to ANY player's row. Deliberately NOT
 * ownership-scoped like /api/player/update: finishing a shared game/
 * tournament credits every participant, not just the caller, so the
 * ownership check there (caller.id === row.user_id) rejected every
 * teammate/opponent's point update unless they personally opened the
 * game from their own session. Any authenticated player may call this,
 * mirroring the same trust model already used for ranking_history writes
 * and for tournaments/quick_games results in general.
 */
export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  if (!(await getServerUser(request))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { playerId?: string; delta?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 }); }

  const { playerId, delta } = body;
  if (!playerId || !Number.isFinite(delta)) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });

  // Atomic increment via RPC — a plain read-then-write here would lose an
  // update if two applies for the same player race (e.g. finishing two
  // games close together).
  const { data, error } = await svc.rpc('increment_ranking_points', { p_player_id: playerId, p_delta: delta });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data === null) return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });

  return NextResponse.json({ ok: true, rankingPoints: data });
}
