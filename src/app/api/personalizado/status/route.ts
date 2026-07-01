import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';
import { requireSARequest } from '@/lib/sa-session';

const VALID_STATUSES = ['draft', 'registration_open', 'configured', 'live', 'finished', 'cancelled'];

/**
 * Change a PERSONALIZADO tournament's status (service-role).
 *
 * Authorized for a SuperAdmin (SA session cookie) or the tournament's creator /
 * co-creator. Handles the cancel bookkeeping: entering 'cancelled' records the
 * prior status in previous_status; leaving 'cancelled' clears it. Routing this
 * through the server lets us drop the anon UPDATE policy on the table.
 */
export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || !status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const { data: row, error: rErr } = await svc
    .from('personalizado_tournaments')
    .select('status, creator_player_id, config')
    .eq('id', id)
    .maybeSingle();
  if (rErr) return NextResponse.json({ error: 'Error al leer el torneo' }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });

  // Authorize: SuperAdmin, or the verified creator / co-creator.
  if (!(await requireSARequest(request))) {
    const r = row as Record<string, unknown>;
    const creatorId = r.creator_player_id as string | null;
    const coCreatorIds = ((r.config as Record<string, unknown> | null)?.coCreatorIds as string[] | undefined) ?? [];
    const callerIds = await getCallerPlayerIds(request);
    const canManage = (!!creatorId && callerIds.includes(creatorId)) || coCreatorIds.some(cid => callerIds.includes(cid));
    if (!canManage) {
      return NextResponse.json({ error: 'No tenés permiso para cambiar el estado del torneo' }, { status: 403 });
    }
  }

  const currentStatus = (row as Record<string, unknown>).status as string;
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'cancelled' && currentStatus !== 'cancelled') patch.previous_status = currentStatus;
  else if (status !== 'cancelled') patch.previous_status = null;

  const { error: uErr } = await svc
    .from('personalizado_tournaments')
    .update(patch)
    .eq('id', id);
  if (uErr) return NextResponse.json({ error: 'No se pudo cambiar el estado' }, { status: 500 });

  return NextResponse.json({ ok: true, previousStatus: status === 'cancelled' ? currentStatus : null });
}
