'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchFriendData } from '@/lib/friend-request-store';
import { getAdminPendingRequestsCount } from '@/lib/player-league-store';
import { getPendingApprovalsForGuardian } from '@/lib/family-approval-store';
import { getFamilyLinks } from '@/lib/family-store';
import { syncAllFromSupabase } from '@/lib/supabase-sync';
import { authSignOut } from '@/lib/supabase';
import BrandLogo from './BrandLogo';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getUserPlan, refreshVerifiedPlan, type PlanId } from '@/lib/plan-config';
import { useTournamentNotificationCount } from '@/hooks/useTournamentNotifications';

type Role = 'player' | 'club' | 'league' | 'federation' | 'super_admin';

const roleLabels: Record<Role, string> = {
  player: 'Jugador', club: 'Club', league: 'Liga',
  federation: 'Federación', super_admin: 'Super Admin',
};

const navItems: Record<Role, { href: string; label: string; icon: string }[]> = {
  player: [
    { href: '/dashboard/player',              label: 'Inicio',        icon: '◈' },
    { href: '/dashboard/player/quick-game',   label: 'Juego Rápido',  icon: '⚡' },
    { href: '/dashboard/player/tournaments',  label: 'Mis Torneos',   icon: '◉' },
    { href: '/dashboard/player/matches',      label: 'Mis Juegos',    icon: '◎' },
    { href: '/dashboard/player/clubs',        label: 'Mis Clubes',    icon: '◑' },
    { href: '/dashboard/player/leagues',      label: 'Mis Ligas',     icon: '◐' },
    { href: '/dashboard/player/ranking',      label: 'Mi Ranking',    icon: '△' },
    { href: '/dashboard/player/calendar',     label: 'Calendario',    icon: '▦' },
    { href: '/dashboard/player/friends',      label: 'Amistades',     icon: '◌' },
    { href: '/dashboard/player/profile',      label: 'Mi Perfil',     icon: '◎' },
  ],
  club: [
    { href: '/dashboard/club',             label: 'Panel del Club', icon: '◈' },
    { href: '/dashboard/club/tournaments', label: 'Torneos',        icon: '◉' },
    { href: '/dashboard/club/members',     label: 'Miembros',       icon: '◑' },
    { href: '/dashboard/club/courts',      label: 'Canchas',        icon: '▦' },
  ],
  league: [
    { href: '/dashboard/league',           label: 'Panel de Liga',         icon: '◈' },
    { href: '/dashboard/league/standings', label: 'Tabla de Posiciones',   icon: '△' },
    { href: '/dashboard/league/seasons',   label: 'Temporadas',            icon: '▦' },
    { href: '/dashboard/league/teams',     label: 'Equipos',               icon: '◑' },
  ],
  federation: [
    { href: '/dashboard/federation',              label: 'Panel General',       icon: '◈' },
    { href: '/dashboard/federation/rankings',     label: 'Rankings Oficiales',  icon: '△' },
    { href: '/dashboard/federation/tournaments',  label: 'Torneos Sancionados', icon: '◉' },
    { href: '/dashboard/federation/clubs',        label: 'Clubes Afiliados',    icon: '◑' },
  ],
  super_admin: [
    { href: '/dashboard/super-admin', label: 'Panel General',    icon: '◈' },
    { href: '/dashboard/player',      label: 'Vista Jugador',    icon: '◎' },
    { href: '/dashboard/club',        label: 'Vista Club',       icon: '◑' },
    { href: '/dashboard/league',      label: 'Vista Liga',       icon: '▦' },
    { href: '/dashboard/federation',  label: 'Vista Federación', icon: '△' },
  ],
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

interface StoredUser {
  id: string; name: string; email: string;
  shortId?: string; role: string; sub?: string;
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user } = useCurrentUser();
  const [friendBadge,  setFriendBadge]  = useState(0);
  const [leagueBadge,  setLeagueBadge]  = useState(0);
  const [profileBadge, setProfileBadge] = useState(0);
  const { count: tournamentBadge } = useTournamentNotificationCount(
    user?.role === 'player' ? user.id : undefined
  );
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('padelmgt_sidebar_collapsed') === 'true' : false
  );

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem('padelmgt_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (user?.role === 'player') {
      // Friend badge comes from Supabase (cross-device pending requests).
      fetchFriendData().then(d => { if (d) setFriendBadge(d.incoming.length); });
      setLeagueBadge(getAdminPendingRequestsCount(user.id));
      // Family: pending guardian approvals + incoming family-link requests
      const pendingApprovals = getPendingApprovalsForGuardian(user.id).length;
      const pendingLinks = getFamilyLinks(user.id).filter(l => l.toPlayerId === user.id && l.status === 'pending').length;
      setProfileBadge(pendingApprovals + pendingLinks);
    }
    // Sync all Supabase tables to localStorage (debounced to 30s)
    syncAllFromSupabase();
  }, [user]);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const activeRole: Role =
    pathname.startsWith('/dashboard/super-admin') ? 'super_admin'
    : pathname.startsWith('/dashboard/club')        ? 'club'
    : pathname.startsWith('/dashboard/league')      ? 'league'
    : pathname.startsWith('/dashboard/federation')  ? 'federation'
    : 'player';

  const isBS = activeRole === 'player';
  const isSuperAdmin = user?.role === 'super_admin';
  const [currentPlan, setCurrentPlan] = useState<PlanId>(() =>
    typeof window !== 'undefined' ? getUserPlan() : 'free'
  );
  const photoUrl = (user as { photoUrl?: string } | null)?.photoUrl;

  // Fetch fresh plan on every mount so SA changes are reflected immediately
  useEffect(() => {
    if (user?.role === 'player' || !user?.role) {
      refreshVerifiedPlan().then(p => setCurrentPlan(p));
    }
  }, [user?.id]); // re-run if user changes (e.g. after login)

  const planBadgeLabel: Partial<Record<string, string>> = {
    player_pro:     'Pro', liga_basic: 'Básico', liga_pro: 'Pro',
    liga_unlimited: 'Ilimitado', club_starter: 'Starter', club_pro: 'Pro',
    club_liga:      'Club+Liga', fed_basic: 'Básica', fed_pro: 'Pro',
    infinity:       '∞ Infinity',
  };
  const planBadge = currentPlan !== 'free' ? planBadgeLabel[currentPlan] : null;
  const nav = navItems[activeRole];
  const displayName = user?.name ?? 'Invitado';
  const displaySub  = user?.sub ?? (user?.email ?? '');
  const initials    = user ? getInitials(user.name) : '?';

  function handleLogout() {
    authSignOut(); // invalidate Supabase Auth session (fire-and-forget)
    localStorage.removeItem('padelmgt_user');
    document.cookie = 'padelmgt_session=; path=/; max-age=0';
    router.push('/login');
  }

  const switchableRoles: { role: Role; label: string }[] = [
    { role: 'player', label: 'Jugador' },
    { role: 'club',   label: 'Club' },
    { role: 'league', label: 'Liga' },
    { role: 'federation', label: 'Fed.' },
  ];

  const sidebarContent = (
    <>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', padding: '20px 20px 18px', textDecoration: 'none', overflow: 'hidden' }}>
        {collapsed ? (
          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-display)' }}>◈</span>
        ) : (
          <BrandLogo variant="white" height={28} />
        )}
      </Link>

      {/* Super-admin role switcher — hidden when collapsed */}
      {isSuperAdmin && !collapsed && (
        <div style={{ padding: '0 12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#d97706', fontWeight: 700, marginBottom: 6, paddingLeft: 4 }}>★ Super Admin</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {switchableRoles.map(({ role, label }) => (
              <Link key={role} href={`/dashboard/${role}`} style={{
                padding: '6px 4px', textAlign: 'center', textDecoration: 'none',
                background: activeRole === role ? 'var(--neon)' : 'rgba(255,255,255,0.05)',
                color: activeRole === role ? '#000' : 'rgba(255,255,255,0.45)',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}>{label}</Link>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {/* Role label — hidden when collapsed */}
        {!collapsed && (
          <div style={{ padding: '8px 20px 6px', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
            {roleLabels[activeRole]}
          </div>
        )}
        {nav.map((item) => {
          const rootHref = `/dashboard/${activeRole === 'super_admin' ? 'super-admin' : activeRole}`;
          const isActive = item.href === rootHref ? pathname === rootHref : pathname.startsWith(item.href);
          const hasFriendBadge = item.href === '/dashboard/player/friends' && friendBadge > 0;
          const hasLeagueBadge = item.href === '/dashboard/player/leagues' && leagueBadge > 0;
          const hasProfileBadge = item.href === '/dashboard/player/profile' && profileBadge > 0;
          const hasTournamentBadge = item.href === '/dashboard/player/tournaments' && tournamentBadge > 0;
          const hasBadge = hasFriendBadge || hasLeagueBadge || hasProfileBadge || hasTournamentBadge;
          const badgeCount = hasFriendBadge ? friendBadge : hasLeagueBadge ? leagueBadge : hasProfileBadge ? profileBadge : hasTournamentBadge ? tournamentBadge : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 12,
                padding: collapsed ? '13px 0' : '11px 20px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                textDecoration: 'none',
                color: isActive ? (isBS ? 'var(--bs-light)' : 'var(--neon)') : 'rgba(255,255,255,0.6)',
                fontWeight: isActive ? 600 : 400, fontSize: 13,
                borderLeft: `3px solid ${isActive ? (isBS ? 'var(--court-blue)' : 'var(--neon)') : 'transparent'}`,
                background: isActive ? (isBS ? 'rgba(26,78,216,0.1)' : 'rgba(214,255,0,0.05)') : 'transparent',
                transition: 'all 0.12s', position: 'relative',
              }}
            >
              <span style={{ fontSize: 12, opacity: isActive ? 1 : 0.5, position: 'relative', flexShrink: 0 }}>
                {item.icon}
                {/* Small badge dot on icon when collapsed */}
                {collapsed && hasBadge && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    minWidth: 14, height: 14, borderRadius: 7,
                    background: '#ee0005', color: '#fff',
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 2px',
                  }}>
                    {badgeCount}
                  </span>
                )}
              </span>
              {!collapsed && item.label}
              {!collapsed && hasFriendBadge && (
                <span style={{ marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9, background: '#ee0005', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {friendBadge}
                </span>
              )}
              {!collapsed && hasLeagueBadge && (
                <span style={{ marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9, background: '#ee0005', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {leagueBadge}
                </span>
              )}
              {!collapsed && hasProfileBadge && (
                <span style={{ marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9, background: '#ee0005', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {profileBadge}
                </span>
              )}
              {!collapsed && hasTournamentBadge && (
                <span style={{ marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9, background: '#ee0005', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {tournamentBadge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Upgrade CTA for free players — hidden when collapsed */}
        {activeRole === 'player' && currentPlan === 'free' && !collapsed && (
          <div style={{ margin: '12px 12px 0' }}>
            <Link href="/pricing" style={{
              display: 'block', textDecoration: 'none', padding: '10px 14px',
              background: isBS ? 'rgba(26,78,216,0.12)' : 'rgba(214,255,0,0.08)',
              border: `1px solid ${isBS ? 'rgba(111,163,255,0.25)' : 'rgba(214,255,0,0.2)'}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: isBS ? 'var(--bs-light)' : 'var(--neon)', marginBottom: 2 }}>
                ⚡ Jugador Pro
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Sin límites desde $3/mes</div>
            </Link>
          </div>
        )}

        {/* Plataforma section — hidden when collapsed */}
        {!collapsed && (
          <div style={{ margin: '16px 20px 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 700, marginBottom: 6 }}>Plataforma</div>
            {[
              { href: '/tournaments', label: 'Torneos' },
              { href: '/live-scores', label: 'En Vivo' },
              { href: '/ranking',     label: 'Ranking' },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ display: 'block', padding: '8px 0', fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
                {l.label}
              </Link>
            ))}
          </div>
        )}

      </nav>

      {/* User */}
      <div style={{ padding: collapsed ? '14px 8px' : '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {collapsed ? (
          /* Collapsed: show only avatar centered */
          <Link
            href={activeRole === 'player' ? '/dashboard/player/profile' : '#'}
            style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}
            title={displayName}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: isSuperAdmin ? '#d97706' : 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: '#fff' }}>
                {initials}
              </div>
            )}
          </Link>
        ) : (
          /* Expanded: full user info */
          <>
            <Link href={activeRole === 'player' ? '/dashboard/player/profile' : '#'} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, textDecoration: 'none' }}>
              {photoUrl ? (
                <img src={photoUrl} alt="avatar" style={{ width: 36, height: 36, flexShrink: 0, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: '50%', background: isSuperAdmin ? '#d97706' : 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: '#fff' }}>
                  {initials}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{displaySub}</div>
                  {planBadge && (
                    <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: currentPlan === 'infinity' ? '#a855f7' : (isBS ? 'var(--bs-light)' : 'var(--neon)'), background: currentPlan === 'infinity' ? 'rgba(168,85,247,0.15)' : (isBS ? 'rgba(26,78,216,0.15)' : 'rgba(214,255,0,0.12)'), padding: '2px 6px', border: `1px solid ${currentPlan === 'infinity' ? 'rgba(168,85,247,0.35)' : (isBS ? 'rgba(111,163,255,0.3)' : 'rgba(214,255,0,0.25)')}` }}>
                      {planBadge}
                    </span>
                  )}
                </div>
              </div>
            </Link>
            <button onClick={handleLogout} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '7px', fontSize: 11, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}>
              Cerrar Sesión
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className={`dash-mobile-bar${isBS ? ' bs-player' : ''}`}>
        <Link href="/" className="logo" style={{ color: '#fff', textDecoration: 'none' }}>
          <BrandLogo variant="white" height={24} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>PadelMGT</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Menú"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="dash-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar${mobileOpen ? ' sidebar-open' : ''}${isBS ? ' bs-player' : ''}`}>
        {/* Mobile close button */}
        <button
          className="dash-sidebar-close"
          onClick={() => setMobileOpen(false)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '16px 20px 0', alignSelf: 'flex-end' }}
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* Floating edge toggle — desktop only, straddles the sidebar border */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="sidebar-edge-toggle"
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </>
  );
}
