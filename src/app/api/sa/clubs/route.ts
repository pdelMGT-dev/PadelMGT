import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import { requireSARequest } from '@/lib/sa-session';

/**
 * SuperAdmin club management (service-role). Replaces the direct browser writes
 * to the clubs table so the anon INSERT/UPDATE policies can be dropped.
 *
 *   POST   → upsert a club (create / edit / approve / change plan)
 *   DELETE → remove a club by ?id=
 *
 * Both require a valid SuperAdmin session cookie.
 */
interface ClubBody {
  id?: string;
  name?: string;
  city?: string;
  country?: string;
  courts?: number;
  members?: number;
  status?: string;
  adminEmail?: string | null;
  plan?: string;
  joinedAt?: string;
  address?: string | null;
  clubType?: string | null;
  mapsUrl?: string | null;
}

export async function POST(request: NextRequest) {
  if (!(await requireSARequest(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let c: ClubBody;
  try {
    c = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }
  if (!c.id || !c.name) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });

  const { error } = await svc.from('clubs').upsert({
    id: c.id,
    name: c.name,
    city: c.city ?? '',
    country: c.country ?? '',
    courts: c.courts ?? 0,
    members: c.members ?? 0,
    status: c.status ?? 'pending',
    admin_email: c.adminEmail ?? null,
    plan: c.plan ?? 'free',
    joined_at: c.joinedAt || new Date().toISOString(),
    address: c.address ?? null,
    club_type: c.clubType ?? null,
    maps_url: c.mapsUrl ?? null,
  });

  if (error) {
    console.warn('[sa/clubs POST] upsert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireSARequest(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const { error } = await svc.from('clubs').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
