import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getServerUser } from '@/lib/supabase-server';

/**
 * Upsert a score-correction request with the service-role key.
 *
 * Both creating a request (a participant) and reviewing it (the organizer) are
 * done by logged-in users, so a valid auth session is required — this closes
 * the anon-write hole on score_corrections. Fire-and-forget on the client.
 *
 * Body: the ScoreCorrectionRequest object (camelCase); mapped to columns here.
 */
interface CorrectionBody {
  id?: string;
  type?: 'tournament' | 'game';
  entityId?: string;
  entityName?: string;
  roundNum?: number;
  courtNum?: number;
  requestedBy?: string;
  requestedById?: string;
  currentScore?: string;
  requestedScore?: string;
  reason?: string;
  status?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  affectedPlayerIds?: string[] | null;
  rankingAdjusted?: boolean;
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const user = await getServerUser(request);
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  let c: CorrectionBody;
  try {
    c = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  if (!c.id || !c.type || !c.entityId) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const { error } = await svc.from('score_corrections').upsert({
    id: c.id,
    entity_type: c.type,
    entity_id: c.entityId,
    entity_name: c.entityName ?? '',
    round_num: c.roundNum ?? 0,
    court_num: c.courtNum ?? 0,
    requested_by: c.requestedBy ?? '',
    requested_by_id: c.requestedById ?? '',
    current_score: c.currentScore ?? '',
    requested_score: c.requestedScore ?? '',
    reason: c.reason ?? '',
    status: c.status ?? 'pending',
    reviewed_by: c.reviewedBy ?? null,
    reviewed_at: c.reviewedAt ?? null,
    review_notes: c.reviewNotes ?? null,
    affected_player_ids: c.affectedPlayerIds ?? null,
    ranking_adjusted: c.rankingAdjusted ?? false,
  }, { onConflict: 'id' });

  if (error) {
    console.warn('[score-corrections/save] upsert error:', error.message);
    return NextResponse.json({ error: 'No se pudo guardar la corrección' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
