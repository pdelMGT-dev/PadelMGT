import { NextRequest, NextResponse } from 'next/server';
import { serviceClient, getServerUser } from '@/lib/supabase-server';

/**
 * Resolves the caller's own club (for the club-manager dashboard) from
 * their verified session email against clubs.admin_email. Returns
 * { club: null } when there's no session or no matching club — callers
 * should treat that as "not a club manager for any real club yet".
 */
export async function GET(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ club: null });

  const caller = await getServerUser(request);
  if (!caller?.email) return NextResponse.json({ club: null });

  const { data } = await svc.from('clubs').select('id, name').ilike('admin_email', caller.email).maybeSingle();
  if (!data) return NextResponse.json({ club: null });

  return NextResponse.json({ club: { id: data.id as string, name: data.name as string } });
}
