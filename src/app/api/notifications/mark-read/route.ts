import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';

/**
 * Mark tournament notifications as read with the service-role key.
 *
 * RLS on tournament_notifications only grants SELECT to anon/authenticated
 * (writes are service-role only), so a direct client UPDATE silently affects
 * zero rows — the notification looks read until the next reload, then comes
 * back. This endpoint performs the write server-side, scoped to the caller's
 * OWN player ids, so you can only mark your own notifications read.
 *
 * Body: { ids: string[] }
 */
export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const playerIds = await getCallerPlayerIds(request);
  if (playerIds.length === 0) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  let body: { ids?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 }); }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string') : [];
  if (ids.length === 0) return NextResponse.json({ ok: true, updated: 0 });

  const { error, count } = await svc
    .from('tournament_notifications')
    .update({ read: true }, { count: 'exact' })
    .in('id', ids)
    .in('player_id', playerIds);

  if (error) {
    console.warn('[notifications/mark-read] update error:', error.message);
    return NextResponse.json({ error: 'No se pudieron marcar como leídas' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: count ?? 0 });
}
