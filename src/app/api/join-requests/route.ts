import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';
import { requireSARequest } from '@/lib/sa-session';

/**
 * Service-role handler for join_requests writes, replacing the direct
 * browser writes so the anon INSERT/UPDATE/DELETE policies can be dropped.
 *
 *   op:'submit'  → create a pending request. OPEN (guests can request to join).
 *   op:'update'  → approve / reject. Only the entity's organizer (or SA).
 *   op:'delete'  → cancel. The request's own player, the organizer, or SA.
 */
type Op = 'submit' | 'update' | 'delete';

interface Body {
  op?: Op;
  // submit
  request?: {
    id?: string; entityId?: string; entityType?: 'game' | 'tournament';
    playerId?: string; playerName?: string; playerEmail?: string | null;
  };
  // update / delete
  requestId?: string;
  status?: 'approved' | 'rejected';
}

async function entityCreatorId(
  svc: NonNullable<ReturnType<typeof serviceClient>>,
  entityType: string,
  entityId: string,
): Promise<string | null> {
  const table = entityType === 'game' ? 'quick_games' : 'tournaments';
  const { data } = await svc.from(table).select('creator_player_id').eq('id', entityId).maybeSingle();
  return (data as { creator_player_id?: string } | null)?.creator_player_id ?? null;
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  // ── submit — open (guests may request to join) ─────────────────────────────
  if (body.op === 'submit') {
    const r = body.request;
    if (!r?.id || !r.entityId || !r.entityType || !r.playerId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }
    const { error } = await svc.from('join_requests').upsert({
      id:           r.id,
      entity_id:    r.entityId,
      entity_type:  r.entityType,
      player_id:    r.playerId,
      player_name:  r.playerName ?? '',
      player_email: r.playerEmail ?? null,
      status:       'pending',
    }, { onConflict: 'id' });
    if (error) {
      console.warn('[join-requests submit]', error.message);
      return NextResponse.json({ error: 'No se pudo enviar la solicitud' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // ── update / delete — need the target row + authorization ──────────────────
  const requestId = body.requestId;
  if (!requestId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });

  const { data: jr } = await svc
    .from('join_requests')
    .select('player_id, entity_id, entity_type')
    .eq('id', requestId)
    .maybeSingle();
  if (!jr) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });

  const row = jr as { player_id: string; entity_id: string; entity_type: string };
  const isSA = await requireSARequest(request);
  const callerIds = isSA ? [] : await getCallerPlayerIds(request);
  const creatorId = await entityCreatorId(svc, row.entity_type, row.entity_id);
  const callerIsOrganizer = isSA || (!!creatorId && callerIds.includes(creatorId));

  if (body.op === 'update') {
    if (body.status !== 'approved' && body.status !== 'rejected') {
      return NextResponse.json({ error: 'Estado no válido' }, { status: 400 });
    }
    if (!callerIsOrganizer) {
      return NextResponse.json({ error: 'Solo el organizador puede aprobar o rechazar' }, { status: 403 });
    }
    const { error } = await svc
      .from('join_requests')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.op === 'delete') {
    const callerOwnsRequest = callerIds.includes(row.player_id);
    if (!callerIsOrganizer && !callerOwnsRequest) {
      return NextResponse.json({ error: 'No autorizado para cancelar esta solicitud' }, { status: 403 });
    }
    const { error } = await svc.from('join_requests').delete().eq('id', requestId);
    if (error) return NextResponse.json({ error: 'No se pudo cancelar' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Operación no válida' }, { status: 400 });
}
