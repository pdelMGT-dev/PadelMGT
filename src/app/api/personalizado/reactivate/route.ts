import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { id?: string; requesterId?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { id, requesterId } = body;
  if (!id || !requesterId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });

  const { data: row, error: rErr } = await svc
    .from('personalizado_tournaments')
    .select('status, previous_status, creator_player_id')
    .eq('id', id)
    .maybeSingle();
  if (rErr) return NextResponse.json({ error: 'Error al leer el torneo' }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });

  if ((row as Record<string, unknown>).creator_player_id !== requesterId) {
    return NextResponse.json({ error: 'Solo el creador puede reactivar el torneo' }, { status: 403 });
  }
  if ((row as Record<string, unknown>).status !== 'cancelled') {
    return NextResponse.json({ error: 'El torneo no está cancelado' }, { status: 409 });
  }

  const restoreStatus = ((row as Record<string, unknown>).previous_status as string) || 'registration_open';

  const { error: uErr } = await svc
    .from('personalizado_tournaments')
    .update({ status: restoreStatus, previous_status: null, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (uErr) return NextResponse.json({ error: 'No se pudo reactivar el torneo' }, { status: 500 });

  return NextResponse.json({ ok: true, restoredStatus: restoreStatus });
}
