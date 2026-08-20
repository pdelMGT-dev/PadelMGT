import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getServerUser } from '@/lib/supabase-server';

/**
 * Club-manager roster invitations (padelmgt.com/join/[token]).
 *
 *   GET  ?token=   → PUBLIC lookup by token (the invitee has no session yet).
 *   POST           → create an invitation for the caller's own club
 *                    (resolved from their session, same as /api/club-content).
 *   PATCH          → mark an invitation accepted by token (also public — the
 *                    invitee flips this right after "signing up").
 */

interface Row {
  id: string; club_id: string; club_name: string; token: string;
  email: string; player_name: string; level: string | null; points: number;
  status: string; created_at: string;
}

function toDto(r: Row) {
  return {
    id: r.id, token: r.token, email: r.email, playerName: r.player_name,
    clubName: r.club_name, level: r.level ?? '', points: r.points,
    status: r.status, createdAt: r.created_at,
  };
}

export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ invitation: null });

  const token = new URL(request.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Falta token' }, { status: 400 });

  const { data, error } = await svc.from('club_invitations').select('*').eq('token', token).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invitation: data ? toDto(data as Row) : null });
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const caller = await getServerUser(request);
  if (!caller?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: club } = await svc.from('clubs').select('id, name').ilike('admin_email', caller.email).maybeSingle();
  if (!club) return NextResponse.json({ error: 'No se encontró un club asociado a esta cuenta' }, { status: 403 });

  let body: { id?: string; token?: string; email?: string; playerName?: string; level?: string; points?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 }); }

  if (!body.id || !body.token || !body.email || !body.playerName) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const { error } = await svc.from('club_invitations').upsert({
    id: body.id,
    club_id: (club as { id: string }).id,
    club_name: (club as { name: string }).name,
    token: body.token,
    email: body.email,
    player_name: body.playerName,
    level: body.level ?? null,
    points: body.points ?? 0,
    status: 'pending',
  }, { onConflict: 'id' });

  if (error) { console.warn('[club-invite]', error.message); return NextResponse.json({ error: 'No se pudo crear la invitación' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { token?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 }); }
  if (!body.token) return NextResponse.json({ error: 'Falta token' }, { status: 400 });

  const { data: inv, error } = await svc.from('club_invitations')
    .update({ status: 'accepted' }).eq('token', body.token).select('club_id, email').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also flip the matching roster entry to 'joined' — the invitee accepting
  // has no club-manager session, so this has to happen server-side using the
  // invitation's own club_id rather than going through /api/club-content.
  if (inv) {
    const { data: rosterRow } = await svc.from('club_content').select('data')
      .eq('club_id', (inv as { club_id: string }).club_id).eq('content_type', 'roster').maybeSingle();
    const roster = (rosterRow?.data as Array<Record<string, unknown>> | undefined) ?? [];
    const email = (inv as { email: string }).email;
    if (roster.some(p => p.email === email)) {
      const updated = roster.map(p => p.email === email ? { ...p, status: 'joined' } : p);
      await svc.from('club_content').upsert({
        club_id: (inv as { club_id: string }).club_id, content_type: 'roster', data: updated, updated_at: new Date().toISOString(),
      }, { onConflict: 'club_id,content_type' });
    }
  }

  return NextResponse.json({ ok: true });
}
