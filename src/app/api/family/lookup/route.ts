import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getServerUser } from '@/lib/supabase-server';

/**
 * POST — direct lookup of a family member by their ID#.
 * Body: { familyMemberId: string }
 *
 * Returns minimal public info so another player can invite a family member of a
 * different guardian to a game (guardian must later approve).
 * This is intentionally a direct-ID lookup, not a search.
 */
export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ ok: false, error: 'Servicio no disponible' }, { status: 503 });

  // Authorize: only logged-in players may resolve a family member by ID#.
  if (!(await getServerUser(request))) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  let body: { familyMemberId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud no válida' }, { status: 400 });
  }

  const familyMemberId = body.familyMemberId?.trim();
  if (!familyMemberId) {
    return NextResponse.json({ ok: false, error: 'Falta el ID# del familiar' }, { status: 400 });
  }

  const { data, error } = await svc
    .from('family_members')
    .select('id, full_name, owner_id, birth_date, sex')
    .eq('id', familyMemberId)
    .maybeSingle();

  if (error) {
    console.warn('[Family] lookup:', error.message);
    return NextResponse.json({ ok: false, error: 'No se encontró ningún familiar con ese ID#' }, { status: 404 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: 'No se encontró ningún familiar con ese ID#' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    member: {
      id: data.id as string,
      fullName: data.full_name as string,
      guardianId: data.owner_id as string,
      birthDate: data.birth_date as string,
      sex: data.sex as string,
    },
  });
}
