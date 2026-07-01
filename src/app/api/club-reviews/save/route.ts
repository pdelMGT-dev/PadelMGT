import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getServerUser, getCallerPlayerIds } from '@/lib/supabase-server';

/**
 * Upsert a club review (one per player per club) with the service-role key.
 *
 * Requires a verified session, and the caller must control the playerId being
 * voted as — this closes the anon-write hole on club_reviews (previously anyone
 * with the public key could ballot-stuff a club's rating). service_role bypasses
 * RLS so the write works after the anon INSERT/UPDATE policies are dropped.
 */
interface ReviewBody {
  clubId?: string;
  playerId?: string;
  playerName?: string;
  rating?: number;
  comment?: string | null;
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const user = await getServerUser(request);
  if (!user) return NextResponse.json({ error: 'Debés iniciar sesión para valorar este club.' }, { status: 401 });

  let body: ReviewBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { clubId, playerId, playerName, rating, comment } = body;
  if (!clubId || !playerId || typeof rating !== 'number') {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  // Authorize: the verified caller must control the playerId being voted as.
  const callerIds = await getCallerPlayerIds(request);
  if (!callerIds.includes(playerId)) {
    return NextResponse.json({ error: 'Usuario no autorizado.' }, { status: 403 });
  }

  const safeRating = Math.min(5, Math.max(1, Math.round(rating)));
  const { error } = await svc.from('club_reviews').upsert({
    club_id: clubId,
    player_id: playerId,
    player_name: playerName ?? '',
    rating: safeRating,
    comment: comment?.toString().trim() || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'club_id,player_id' });

  if (error) {
    console.warn('[club-reviews/save] upsert error:', error.message);
    return NextResponse.json({ error: 'No se pudo guardar la valoración' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
