import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';
import { requireSARequest } from '@/lib/sa-session';

// personalizado_teams has RLS enabled with no DELETE policy for anon/authenticated,
// so an anon-client delete is silently filtered (0 rows, no error) and the row survives.
// This route performs the delete with the service-role client, after authorizing the
// requester as the tournament creator or a co-creator (or a SuperAdmin session).
export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { tournamentId?: string; teamId?: string; requesterId?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { tournamentId, teamId } = body;
  if (!tournamentId || !teamId) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const isAdmin = !!(await requireSARequest(request));

  if (!isAdmin) {
    const { data: row, error: rErr } = await svc
      .from('personalizado_tournaments')
      .select('creator_player_id, config')
      .eq('id', tournamentId)
      .maybeSingle();
    if (rErr) return NextResponse.json({ error: 'Error al leer el torneo' }, { status: 500 });
    if (!row) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });

    // Authorize against the verified session, not a client-supplied requesterId.
    const r = row as Record<string, unknown>;
    const creatorId = r.creator_player_id as string | null;
    const coCreatorIds = ((r.config as Record<string, unknown> | null)?.coCreatorIds as string[] | undefined) ?? [];
    const callerIds = await getCallerPlayerIds(request);
    const canManage = (!!creatorId && callerIds.includes(creatorId)) || coCreatorIds.some(cid => callerIds.includes(cid));
    if (!canManage) {
      return NextResponse.json({ error: 'No tenés permiso para eliminar este registro' }, { status: 403 });
    }
  }

  const { error: dErr } = await svc
    .from('personalizado_teams')
    .delete()
    .eq('id', teamId)
    .eq('tournament_id', tournamentId);
  if (dErr) return NextResponse.json({ error: 'No se pudo eliminar el registro' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
