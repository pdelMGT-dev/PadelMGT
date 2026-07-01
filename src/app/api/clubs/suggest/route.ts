import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';

/**
 * Submit a club suggestion (service-role insert of a status='pending' row).
 *
 * Open (the public "¿No encuentras tu club?" flow), but the row is always
 * forced to status='pending' and only ever becomes visible after a SuperAdmin
 * approves it — so accepting anonymous suggestions here is safe, while dropping
 * the anon INSERT policy on the clubs table closes arbitrary anon writes.
 */
interface SuggestBody {
  id?: string;
  name?: string;
  city?: string;
  country?: string;
  courts?: number;
  contactEmail?: string | null;
  website?: string | null;
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let b: SuggestBody;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  if (!b.id || !b.name?.trim() || !b.city?.trim() || !b.country?.trim()) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const { error } = await svc.from('clubs').upsert({
    id: b.id,
    name: b.name.trim(),
    city: b.city.trim(),
    country: b.country.trim(),
    courts: b.courts || 0,
    members: 0,
    status: 'pending',          // always pending — SA must approve
    plan: 'free',
    admin_email: b.contactEmail ?? null,
    maps_url: b.website || null,
    club_type: 'Sugerido por jugador',
    source: 'player_suggestion',
    joined_at: new Date().toISOString(),
  });

  if (error) {
    console.warn('[clubs/suggest] upsert error:', error.message);
    return NextResponse.json({ error: 'No se pudo enviar la sugerencia' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
