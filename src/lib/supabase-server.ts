// supabase-server.ts — Server-side Supabase helpers.
// Route handlers use getServerUser() to verify the caller's Supabase session
// (read from the sb-* cookies set by the @supabase/ssr browser client).

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Verified Supabase user from the request cookies, or null. */
export async function getServerUser(request: NextRequest) {
  if (!url || !anonKey) return null;
  try {
    const client = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }));
        },
        setAll() {
          // Read-only in route handlers: token refresh happens in middleware
        },
      },
    });
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/** Service-role client for privileged server-side DB access. Never expose to the client. */
export function serviceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}
