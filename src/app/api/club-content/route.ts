import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getServerUser } from '@/lib/supabase-server';

/**
 * Service-role handler for the club-manager dashboard's gallery/courts/
 * announcements/roster/invitations. The caller's club is resolved
 * server-side from their verified session email against clubs.admin_email —
 * never trust a client-supplied clubId, so one club manager can't
 * read/write another club's content.
 *
 *   GET  ?contentType=   → the caller's club's content for that type.
 *   POST                 → upsert { contentType, data } for the caller's club.
 */

const VALID_TYPES = new Set(['gallery', 'courts', 'announcements', 'roster']);

async function resolveClubId(email: string | undefined, svc: NonNullable<ReturnType<typeof serviceClient>>): Promise<string | null> {
  if (!email) return null;
  const { data } = await svc.from('clubs').select('id').ilike('admin_email', email).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ data: null });

  const { searchParams } = new URL(request.url);
  const contentType = searchParams.get('contentType');
  if (!contentType || !VALID_TYPES.has(contentType)) return NextResponse.json({ error: 'contentType inválido' }, { status: 400 });

  const caller = await getServerUser(request);
  const clubId = await resolveClubId(caller?.email, svc);
  if (!clubId) return NextResponse.json({ data: null });

  const { data, error } = await svc.from('club_content').select('data').eq('club_id', clubId).eq('content_type', contentType).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data?.data ?? null });
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const caller = await getServerUser(request);
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const clubId = await resolveClubId(caller.email, svc);
  if (!clubId) return NextResponse.json({ error: 'No se encontró un club asociado a esta cuenta' }, { status: 403 });

  let body: { contentType?: string; data?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 }); }

  if (!body.contentType || !VALID_TYPES.has(body.contentType)) return NextResponse.json({ error: 'contentType inválido' }, { status: 400 });

  const { error } = await svc.from('club_content').upsert({
    club_id: clubId, content_type: body.contentType, data: body.data ?? [], updated_at: new Date().toISOString(),
  }, { onConflict: 'club_id,content_type' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
