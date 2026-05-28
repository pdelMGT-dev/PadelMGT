import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/superadmin',
];

const ROLE_PATHS: Record<string, string[]> = {
  super_admin: ['/dashboard/super-admin', '/superadmin'],
  club_manager: ['/dashboard/club'],
  league_organizer: ['/dashboard/league'],
  federation: ['/dashboard/federation'],
  player: ['/dashboard/player'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow superadmin login page through without auth check
  if (pathname === '/superadmin/login') return NextResponse.next();

  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const sessionCookie = request.cookies.get('padelmgt_session');

  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = sessionCookie.value;

  // Prevent cross-role access (e.g. a player accessing /dashboard/super-admin)
  for (const [cookieRole, paths] of Object.entries(ROLE_PATHS)) {
    if (cookieRole === role) continue;
    if (paths.some(p => pathname.startsWith(p))) {
      // Redirect to their own dashboard
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
