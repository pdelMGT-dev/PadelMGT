import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifySAToken, SA_COOKIE_NAME } from '@/lib/sa-session';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/superadmin',
];

// Paths that require a cryptographically signed superadmin token —
// the plain role cookie is NOT trusted for these.
const SA_PREFIXES = ['/superadmin', '/dashboard/super-admin'];

const ROLE_PATHS: Record<string, string[]> = {
  super_admin: ['/dashboard/super-admin', '/superadmin'],
  club_manager: ['/dashboard/club'],
  player: ['/dashboard/player'],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow superadmin login page through without auth check
  if (pathname === '/superadmin/login') return NextResponse.next();

  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  // ── Superadmin areas: require a valid signed token (httpOnly cookie) ──────
  if (SA_PREFIXES.some(p => pathname.startsWith(p))) {
    const saToken = request.cookies.get(SA_COOKIE_NAME)?.value;
    const payload = await verifySAToken(saToken);
    if (!payload) {
      const loginUrl = new URL('/superadmin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Regular dashboards: verify the real Supabase session ──────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const demoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === 'true';

  let response = NextResponse.next({ request });
  let hasVerifiedSession = false;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }));
          },
          setAll(cookiesToSet) {
            // Keep refreshed tokens flowing back to the browser
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      });
      const { data, error } = await supabase.auth.getUser();
      hasVerifiedSession = !error && !!data.user;
    } catch {
      hasVerifiedSession = false;
    }
  }

  const roleCookie = request.cookies.get('padelmgt_session')?.value;

  // Demo mode (explicit opt-in, for development): accept the plain role
  // cookie since demo accounts have no Supabase Auth backing.
  // Without Supabase configured at all, fall back to legacy cookie gating.
  const allowLegacyCookie = demoMode || !supabaseUrl || !supabaseKey;

  if (!hasVerifiedSession && !(allowLegacyCookie && roleCookie)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cross-role routing: the role cookie is a ROUTING HINT only (auth is the
  // verified session above). Prevents a player landing on /dashboard/club.
  if (roleCookie) {
    for (const [cookieRole, paths] of Object.entries(ROLE_PATHS)) {
      if (cookieRole === roleCookie) continue;
      if (paths.some(p => pathname.startsWith(p))) {
        const myPaths = ROLE_PATHS[roleCookie];
        const home = myPaths?.[0] ?? '/login';
        return NextResponse.redirect(new URL(home, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/superadmin/:path*',
  ],
};
