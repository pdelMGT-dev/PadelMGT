import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import { requireSARequest, saUnauthorized } from '@/lib/sa-session';

// SA back-office writes to the players table. RLS only allows each auth user
// to update their OWN row, so SA mutations (plan changes, blocks, edits) must
// go through this route with the service role — the anon-key upsert from the
// SA browser fails silently against other users' rows.

interface SAPlayerPayload {
  id: string;
  shortId?: string;
  name: string;
  email: string;
  phone?: string;
  sex?: string;
  city?: string;
  country?: string;
  level?: string;
  ranking?: number;
  rankingPoints?: number;
  status?: string;
  role?: string;
  plan?: string;
  profileCompleted?: boolean;
  joinedAt?: string;
  lastActive?: string;
  customFields?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  const sa = await requireSARequest(request);
  if (!sa) return saUnauthorized();

  const db = serviceClient();
  if (!db) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });

  let body: { player?: SAPlayerPayload };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const p = body.player;
  if (!p?.id || !p.email) return NextResponse.json({ error: 'Missing player id or email' }, { status: 400 });

  // Same mapping as playerToRow() in superadmin-data.ts — extended fields
  // round-trip through custom_fields JSONB
  const row = {
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone || null,
    city: p.city || null,
    country: p.country || 'ES',
    ranking_points: p.rankingPoints ?? p.ranking ?? 0,
    status: p.status ?? 'active',
    role: p.role ?? 'player',
    custom_fields: {
      ...(p.customFields ?? {}),
      ...(p.shortId ? { shortId: p.shortId } : {}),
      ...(p.sex ? { sex: p.sex } : {}),
      ...(p.level ? { level: p.level } : {}),
      ...(p.profileCompleted !== undefined ? { profileCompleted: String(p.profileCompleted) } : {}),
      ...(p.plan ? { plan: p.plan } : {}),
    },
    joined_at: p.joinedAt || new Date().toISOString(),
    last_active: p.lastActive || new Date().toISOString(),
  };

  const { error } = await db.from('players').upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('[SA Players] upsert error:', error.message);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const sa = await requireSARequest(request);
  if (!sa) return saUnauthorized();

  const db = serviceClient();
  if (!db) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });

  let body: { id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await db.from('players').delete().eq('id', body.id);
  if (error) {
    console.error('[SA Players] delete error:', error.message);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
