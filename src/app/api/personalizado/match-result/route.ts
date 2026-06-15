import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import type { MatchResult } from '@/lib/personalizado-store';

/**
 * Atomically upsert the result of one group-stage match.
 * Uses a dedicated table (personalizado_matches) so concurrent result entries
 * for different matches in the same tournament don't overwrite each other.
 */
export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { tournamentId?: string; matchId?: string; result?: MatchResult };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { tournamentId, matchId, result } = body;
  if (!tournamentId || !matchId || !result) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  // Verify the tournament exists so the FK constraint doesn't surprise us.
  const { data: trow } = await svc
    .from('personalizado_tournaments')
    .select('id')
    .eq('id', tournamentId)
    .maybeSingle();
  if (!trow) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });

  const { error } = await svc.from('personalizado_matches').upsert(
    {
      id: matchId,
      tournament_id: tournamentId,
      result_sets: result.sets,
      winner_id: result.winnerId,
      walkover: result.walkover,
      entered_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('[match-result] upsert error:', error.message);
    return NextResponse.json({ error: 'No se pudo guardar el resultado' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
