import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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
  league_organizer: ['/dashboard/league'],
  federation: ['/dashboard/federation'],
  player: ['/dashboard/player'],
};

export async function middleware(request: NextRequest) {
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

  // ── Regular dashboards: role cookie routing (UI-level gating only) ────────
  const sessionCookie = request.cookies.get('padelmgt_session');

  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = sessionCookie.value;

  // Prevent cross-role access (e.g. a player accessing /dashboard/club)
  for (const [cookieRole, paths] of Object.entries(ROLE_PATHS)) {
    if (cookieRole === role) continue;
    if (paths.some(p => pathname.startsWith(p))) {
      const myPaths = ROLE_PATHS[role];
      const home = myPaths?.[0] ?? '/login';
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/superadmin/:path*',
  ],
};
