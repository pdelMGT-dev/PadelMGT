import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getCallerPlayerIds } from '@/lib/supabase-server';

// Upload/remove a league's logo or banner. Writes go straight to
// player_leagues.logo_url/banner_url (not through /api/leagues op:'sync' —
// that path only accepts writes from the league's creator, which would
// silently drop a co-admin's upload since sync ownership is creator-only).

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadFormData {
  get(name: string): { type: string; size: number; name: string; arrayBuffer(): Promise<ArrayBuffer> } | string | null;
}

/** True if the caller is the league's creator or an admin member. */
async function callerAdminsLeague(svc: NonNullable<ReturnType<typeof serviceClient>>, request: NextRequest, leagueId: string): Promise<boolean> {
  const callerIds = await getCallerPlayerIds(request);
  if (callerIds.length === 0) return false;
  const { data: league } = await svc.from('player_leagues').select('created_by').eq('id', leagueId).maybeSingle();
  const creatorId = (league as { created_by?: string } | null)?.created_by ?? null;
  if (creatorId && callerIds.includes(creatorId)) return true;
  const { data: adminRows } = await svc
    .from('league_members')
    .select('player_id')
    .eq('league_id', leagueId)
    .eq('role', 'admin')
    .in('player_id', callerIds);
  return (adminRows ?? []).length > 0;
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const rawForm = await request.formData().catch(() => null) as UploadFormData | null;
  if (!rawForm) return NextResponse.json({ error: 'Datos de formulario inválidos' }, { status: 400 });

  const leagueId = rawForm.get('leagueId');
  const kind = rawForm.get('kind');
  const entry = rawForm.get('file');
  if (typeof leagueId !== 'string' || !leagueId) return NextResponse.json({ error: 'leagueId requerido' }, { status: 400 });
  if (kind !== 'logo' && kind !== 'banner') return NextResponse.json({ error: 'kind debe ser logo o banner' }, { status: 400 });
  if (!entry || typeof entry === 'string') return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });

  if (!(await callerAdminsLeague(svc, request, leagueId))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const file = entry;
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Tipo no permitido. Solo PNG, JPEG o WebP.' }, { status: 415 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo supera los 5MB.' }, { status: 413 });
  }

  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase();
  const filename = `league-branding/${leagueId}-${kind}-${Date.now()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await svc.storage
    .from('email-assets')
    .upload(filename, bytes, { contentType: file.type, upsert: false });
  if (uploadErr) {
    console.error('[leagues/branding] upload error:', uploadErr.message);
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: { publicUrl } } = svc.storage.from('email-assets').getPublicUrl(filename);
  const column = kind === 'logo' ? 'logo_url' : 'banner_url';
  const { error: updateErr } = await svc.from('player_leagues').update({ [column]: publicUrl }).eq('id', leagueId);
  if (updateErr) {
    console.error('[leagues/branding] update error:', updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl });
}

export async function DELETE(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');
  const kind = searchParams.get('kind');
  if (!leagueId) return NextResponse.json({ error: 'leagueId requerido' }, { status: 400 });
  if (kind !== 'logo' && kind !== 'banner') return NextResponse.json({ error: 'kind debe ser logo o banner' }, { status: 400 });

  if (!(await callerAdminsLeague(svc, request, leagueId))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const column = kind === 'logo' ? 'logo_url' : 'banner_url';
  const { error } = await svc.from('player_leagues').update({ [column]: null }).eq('id', leagueId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
