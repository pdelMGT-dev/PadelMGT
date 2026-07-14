import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getServerUser } from '@/lib/supabase-server';
import { requireSARequest } from '@/lib/sa-session';

/**
 * Upsert a score-correction request with the service-role key.
 *
 * Creating a request (a participant) needs a Supabase Auth session; reviewing
 * one (the SA, approving/rejecting) authenticates via the separate signed SA
 * cookie instead — accept either. A valid session is required either way,
 * closing the anon-write hole on score_corrections. Fire-and-forget on the
 * client.
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
  requestedPair1Score?: number;
  requestedPair2Score?: number;
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

  const [user, saSession] = await Promise.all([getServerUser(request), requireSARequest(request)]);
  if (!user && !saSession) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

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
    requested_pair1_score: c.requestedPair1Score ?? null,
    requested_pair2_score: c.requestedPair2Score ?? null,
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
