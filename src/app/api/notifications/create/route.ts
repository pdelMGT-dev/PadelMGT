import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getServerUser } from '@/lib/supabase-server';

/**
 * Insert tournament notifications with the service-role key.
 *
 * Notifications are generated when a tournament manager saves scores / updates
 * the schedule, so a valid auth session is required (this closes the anon-write
 * hole on tournament_notifications). Fire-and-forget on the client: errors here
 * are non-fatal to the caller's flow.
 *
 * Body: { notifications: Array<{
 *   playerId, tournamentId, type, message, link?, product?
 * }> }
 */
interface IncomingNotification {
  playerId?: string;
  tournamentId?: string;
  type?: string;
  message?: string;
  link?: string | null;
  product?: 'tp' | 'torneo';
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  // Require a verified session: only logged-in managers create notifications.
  const user = await getServerUser(request);
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  let body: { notifications?: IncomingNotification[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const incoming = Array.isArray(body.notifications) ? body.notifications : [];
  const rows = incoming
    .filter(n => n.playerId && n.tournamentId && n.type && n.message)
    .map(n => {
      const row: Record<string, unknown> = {
        player_id: n.playerId,
        tournament_id: n.tournamentId,
        type: n.type,
        message: n.message,
        read: false,
      };
      if (n.link !== undefined) row.link = n.link ?? null;
      if (n.product) row.product = n.product;
      return row;
    });

  if (rows.length === 0) return NextResponse.json({ ok: true, inserted: 0 });

  const { error } = await svc.from('tournament_notifications').insert(rows);
  if (error) {
    console.warn('[notifications/create] insert error:', error.message);
    return NextResponse.json({ error: 'No se pudieron crear las notificaciones' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}
