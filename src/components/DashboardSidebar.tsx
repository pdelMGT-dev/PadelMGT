'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Role = 'player' | 'club' | 'league' | 'federation';

const roleLabels: Record<Role, string> = {
  player: 'Jugador',
  club: 'Club',
  league: 'Liga',
  federation: 'Federación',
};

const navItems: Record<Role, { href: string; label: string; icon: string }[]> = {
  player: [
    { href: '/dashboard/player', label: 'Inicio', icon: '◈' },
    { href: '/dashboard/player/tournaments', label: 'Mis Torneos', icon: '◉' },
    { href: '/dashboard/player/matches', label: 'Mis Partidos', icon: '◎' },
    { href: '/dashboard/player/ranking', label: 'Mi Ranking', icon: '△' },
    { href: '/dashboard/player/calendar', label: 'Calendario', icon: '▦' },
    { href: '/dashboard/player/friends', label: 'Amistades', icon: '◑' },
  ],
  club: [
    { href: '/dashboard/club', label: 'Panel del Club', icon: '◈' },
    { href: '/dashboard/club/tournaments', label: 'Torneos', icon: '◉' },
    { href: '/dashboard/club/members', label: 'Miembros', icon: '◑' },
    { href: '/dashboard/club/courts', label: 'Canchas', icon: '▦' },
  ],
  league: [
    { href: '/dashboard/league', label: 'Panel de Liga', icon: '◈' },
    { href: '/dashboard/league/standings', label: 'Tabla de Posiciones', icon: '△' },
    { href: '/dashboard/league/seasons', label: 'Temporadas', icon: '▦' },
    { href: '/dashboard/league/teams', label: 'Equipos', icon: '◑' },
  ],
  federation: [
    { href: '/dashboard/federation', label: 'Panel General', icon: '◈' },
    { href: '/dashboard/federation/rankings', label: 'Rankings Oficiales', icon: '△' },
    { href: '/dashboard/federation/tournaments', label: 'Torneos Sancionados', icon: '◉' },
    { href: '/dashboard/federation/clubs', label: 'Clubes Afiliados', icon: '◑' },
  ],
};

const mockUser: Record<Role, { name: string; sub: string; initials: string }> = {
  player: { name: 'Diego García', sub: '#47 · Buenos Aires', initials: 'DG' },
  club: { name: 'Club La Cantera', sub: '127 miembros · 8 canchas', initials: 'LC' },
  league: { name: 'Liga Premier LATAM', sub: '12 equipos · Temp. 2026', initials: 'LP' },
  federation: { name: 'Federación Argentina', sub: '380 clubes · 9 países', initials: 'FA' },
};

export default function DashboardSidebar() {
  const pathname = usePathname();

  const activeRole: Role =
    pathname.startsWith('/dashboard/club') ? 'club'
    : pathname.startsWith('/dashboard/league') ? 'league'
    : pathname.startsWith('/dashboard/federation') ? 'federation'
    : 'player';

  const user = mockUser[activeRole];
  const nav = navItems[activeRole];

  return (
    <aside style={{
      width: 256, minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '24px 20px 20px' }}>
        <div style={{ width: 30, height: 30, background: 'var(--neon)', color: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>P</div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, textTransform: 'uppercase', color: '#fff', letterSpacing: '-0.01em' }}>PadelMGT</span>
      </Link>

      {/* Role switcher */}
      <div style={{ padding: '0 12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          {(Object.keys(roleLabels) as Role[]).map((role) => (
            <Link key={role} href={`/dashboard/${role}`}
              style={{
                padding: '6px 4px', textAlign: 'center', textDecoration: 'none',
                background: activeRole === role ? 'var(--neon)' : 'rgba(255,255,255,0.05)',
                color: activeRole === role ? '#000' : 'rgba(255,255,255,0.45)',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}>
              {roleLabels[role]}
            </Link>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        <div style={{ padding: '8px 20px 6px', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
          {roleLabels[activeRole]}
        </div>
        {nav.map((item) => {
          const rootHref = `/dashboard/${activeRole}`;
          const isActive = item.href === rootHref
            ? pathname === rootHref
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
              textDecoration: 'none',
              color: isActive ? 'var(--neon)' : 'rgba(255,255,255,0.6)',
              fontWeight: isActive ? 600 : 400,
              fontSize: 13,
              borderLeft: `3px solid ${isActive ? 'var(--neon)' : 'transparent'}`,
              background: isActive ? 'rgba(214,255,0,0.05)' : 'transparent',
              transition: 'all 0.12s',
            }}>
              <span style={{ fontSize: 12, opacity: isActive ? 1 : 0.5 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Divider + public links */}
        <div style={{ margin: '16px 20px 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 700, marginBottom: 6 }}>Plataforma</div>
          {[
            { href: '/tournaments', label: 'Torneos' },
            { href: '/live-scores', label: 'En Vivo' },
            { href: '/ranking', label: 'Ranking' },
          ].map((l) => (
            <Link key={l.href} href={l.href} style={{ display: 'block', padding: '8px 0', fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
              {l.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* User */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, background: 'var(--court-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
            {user.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.sub}</div>
          </div>
        </div>
        <Link href="/login" style={{ display: 'block', textAlign: 'center', padding: '7px', fontSize: 11, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
          Cerrar Sesión
        </Link>
      </div>
    </aside>
  );
}
