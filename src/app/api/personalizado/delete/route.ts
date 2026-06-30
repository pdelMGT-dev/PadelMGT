import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';
import { requireSARequest } from '@/lib/sa-session';

const DELETABLE = ['draft', 'registration_open', 'configured', 'cancelled'];

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { id?: string; requesterId?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });

  // A valid SuperAdmin session can delete any tournament in any state, bypassing the
  // creator/status checks that apply to organizers deleting their own tournaments.
  const isAdmin = !!(await requireSARequest(request));

  if (!isAdmin) {
    const { data: row, error: rErr } = await svc
      .from('personalizado_tournaments')
      .select('status, creator_player_id')
      .eq('id', id)
      .maybeSingle();
    if (rErr) return NextResponse.json({ error: 'Error al leer el torneo' }, { status: 500 });
    if (!row) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });

    // Authorize against the verified session, not a client-supplied requesterId.
    const callerIds = await getCallerPlayerIds(request);
    const creatorId = (row as Record<string, unknown>).creator_player_id as string | null;
    if (!creatorId || !callerIds.includes(creatorId)) {
      return NextResponse.json({ error: 'Solo el creador puede eliminar el torneo' }, { status: 403 });
    }

    const currentStatus = (row as Record<string, unknown>).status as string;
    if (!DELETABLE.includes(currentStatus)) {
      return NextResponse.json({ error: `No se puede eliminar un torneo en estado "${currentStatus}"` }, { status: 409 });
    }
  }

  // personalizado_teams and personalizado_matches have ON DELETE CASCADE so they
  // are removed automatically when the tournament row is deleted.
  const { error: dErr } = await svc
    .from('personalizado_tournaments')
    .delete()
    .eq('id', id);
  if (dErr) return NextResponse.json({ error: 'No se pudo eliminar el torneo' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
