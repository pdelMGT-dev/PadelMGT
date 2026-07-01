import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

let _serviceClient: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient | null {
  if (_serviceClient) return _serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _serviceClient;
}

/**
 * Verify the caller's Supabase Auth session from the request cookies and return
 * the authenticated user (or null). Uses the cookie-based SSR client, matching
 * the verification done in proxy.ts. Read-only: it does not mutate cookies.
 */
export async function getServerUser(
  request: NextRequest,
): Promise<{ id: string; email?: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }));
        },
        // No-op: route handlers verifying a session don't refresh cookies here.
        setAll() {},
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? undefined };
  } catch {
    return null;
  }
}

/**
 * Resolve the set of player ids the verified caller controls. A player row is
 * theirs if it is bound to their auth user (`user_id`) or — for SA-created /
 * unclaimed rows — matches their confirmed auth email. Returns [] for anonymous
 * callers. Use this for server-side authorization instead of trusting any
 * player/requester id supplied in the request body.
 */
export async function getCallerPlayerIds(request: NextRequest): Promise<string[]> {
  const user = await getServerUser(request);
  if (!user) return [];
  const db = serviceClient();
  if (!db) return [];
  const ids = new Set<string>();
  try {
    const { data: byUid } = await db.from('players').select('id').eq('user_id', user.id);
    for (const r of byUid ?? []) ids.add((r as { id: string }).id);
    if (user.email) {
      const { data: byEmail } = await db.from('players').select('id').ilike('email', user.email);
      for (const r of byEmail ?? []) ids.add((r as { id: string }).id);
    }
  } catch {
    /* fall through with whatever resolved */
  }
  return [...ids];
}
