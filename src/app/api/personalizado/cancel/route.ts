import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';

const CANCELLABLE = ['draft', 'registration_open', 'configured'];

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { id?: string; requesterId?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });

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
    return NextResponse.json({ error: 'Solo el creador puede cancelar el torneo' }, { status: 403 });
  }

  const currentStatus = (row as Record<string, unknown>).status as string;
  if (!CANCELLABLE.includes(currentStatus)) {
    return NextResponse.json({ error: `No se puede cancelar un torneo en estado "${currentStatus}"` }, { status: 409 });
  }

  const { error: uErr } = await svc
    .from('personalizado_tournaments')
    .update({ status: 'cancelled', previous_status: currentStatus, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (uErr) return NextResponse.json({ error: 'No se pudo cancelar el torneo' }, { status: 500 });

  return NextResponse.json({ ok: true, previousStatus: currentStatus });
}
