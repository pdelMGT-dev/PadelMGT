'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { getPendingCount } from '@/lib/friend-request-store';
import LogoIcon from './LogoIcon';

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
    { href: '/dashboard/player/clubs',        label: 'Mis Clubes (3)',icon: '◑' },
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
  const [user,        setUser]        = useState<StoredUser | null>(null);
  const [friendBadge, setFriendBadge] = useState(0);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (raw) {
        const u = JSON.parse(raw) as StoredUser;
        setUser(u);
        if (u.role === 'player') setFriendBadge(getPendingCount(u.id));
      }
    } catch {}
  }, []);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const activeRole: Role =
    pathname.startsWith('/dashboard/super-admin') ? 'super_admin'
    : pathname.startsWith('/dashboard/club')        ? 'club'
    : pathname.startsWith('/dashboard/league')      ? 'league'
    : pathname.startsWith('/dashboard/federation')  ? 'federation'
    : 'player';

  const isSuperAdmin = user?.role === 'super_admin';
  const nav = navItems[activeRole];
  const displayName = user?.name ?? 'Invitado';
  const displaySub  = user?.sub ?? (user?.email ?? '');
  const initials    = user ? getInitials(user.name) : '?';

  function handleLogout() {
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
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '24px 20px 20px' }}>
        <LogoIcon white size={28} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, textTransform: 'uppercase', color: '#fff', letterSpacing: '-0.01em' }}>PadelMGT</span>
      </Link>

      {/* Super-admin role switcher */}
      {isSuperAdmin && (
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
        <div style={{ padding: '8px 20px 6px', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
          {roleLabels[activeRole]}
        </div>
        {nav.map((item) => {
          const rootHref = `/dashboard/${activeRole === 'super_admin' ? 'super-admin' : activeRole}`;
          const isActive = item.href === rootHref ? pathname === rootHref : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
              textDecoration: 'none',
              color: isActive ? 'var(--neon)' : 'rgba(255,255,255,0.6)',
              fontWeight: isActive ? 600 : 400, fontSize: 13,
              borderLeft: `3px solid ${isActive ? 'var(--neon)' : 'transparent'}`,
              background: isActive ? 'rgba(214,255,0,0.05)' : 'transparent',
              transition: 'all 0.12s', position: 'relative',
            }}>
              <span style={{ fontSize: 12, opacity: isActive ? 1 : 0.5 }}>{item.icon}</span>
              {item.label}
              {item.href === '/dashboard/player/friends' && friendBadge > 0 && (
                <span style={{ marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9, background: '#ee0005', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {friendBadge}
                </span>
              )}
            </Link>
          );
        })}

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
      </nav>

      {/* User */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href={activeRole === 'player' ? '/dashboard/player/profile' : '#'} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: '50%', background: isSuperAdmin ? '#d97706' : 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: '#fff' }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displaySub}</div>
          </div>
        </Link>
        <button onClick={handleLogout} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '7px', fontSize: 11, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}>
          Cerrar Sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="dash-mobile-bar">
        <Link href="/" className="logo" style={{ color: '#fff', gap: 8 }}>
          <LogoIcon white size={26} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>PadelMGT</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
          aria-label="Menú"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="dash-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
        {/* Mobile close button */}
        <button
          className="dash-sidebar-close"
          onClick={() => setMobileOpen(false)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '16px 20px 0', display: 'none', alignSelf: 'flex-end' }}
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
