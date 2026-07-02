'use client';

/**
 * Blue Spectrum mobile shell for the player role.
 *
 * Renders a native-app frame — a navy top app bar, a fixed bottom tab bar, and
 * a raised (+) action button — and toggles `body.bs-mobile-active` so the CSS
 * can hide the desktop sidebar and reflow the page. Only active for the player
 * role and only on phones / tablets in portrait; wider screens and tablets in
 * landscape keep the desktop layout untouched.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, Trophy, Zap, User, Plus, X, Sparkles } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import BrandLogo from '@/components/BrandLogo';
import NotificationBell from '@/components/NotificationBell';

// Phones (any orientation) + tablets in portrait use the mobile shell.
// Tablets in landscape and desktops keep the sidebar layout.
const MOBILE_QUERY =
  '(max-width: 767px), (min-width: 768px) and (max-width: 1024px) and (orientation: portrait), (max-height: 480px) and (orientation: landscape)';

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function PlayerMobileNav() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const isPlayer = pathname?.startsWith('/dashboard/player') ?? false;
  const [isMobile, setIsMobile] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Track the mobile-shell breakpoint.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Toggle the body class that drives the CSS reflow. Active only for players.
  useEffect(() => {
    const active = isPlayer && isMobile;
    document.body.classList.toggle('bs-mobile-active', active);
    return () => { document.body.classList.remove('bs-mobile-active'); };
  }, [isPlayer, isMobile]);

  // Close the (+) sheet on navigation.
  useEffect(() => { setFabOpen(false); }, [pathname]);

  // Hide the fixed header + tab bar while a form field is focused. Mobile
  // browsers detach position:fixed elements oddly once the on-screen keyboard
  // opens (they can float mid-screen instead of staying pinned); hiding them
  // for the duration of typing avoids that and gives the form full height.
  useEffect(() => {
    if (!isPlayer || !isMobile) return;
    const isFormField = (el: EventTarget | null): boolean =>
      el instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    const onFocusIn = (e: FocusEvent) => {
      if (isFormField(e.target)) document.body.classList.add('bs-keyboard-open');
    };
    const onFocusOut = (e: FocusEvent) => {
      if (isFormField(e.target)) document.body.classList.remove('bs-keyboard-open');
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.body.classList.remove('bs-keyboard-open');
    };
  }, [isPlayer, isMobile]);

  if (!isPlayer || !isMobile) return null;

  const photoUrl = (user as { photoUrl?: string } | null)?.photoUrl;
  const name = user?.name ?? 'Jugador';

  const isHome    = pathname === '/dashboard/player';
  const isTorneos = pathname.startsWith('/dashboard/player/tournaments');
  const isJuegos  = pathname.startsWith('/dashboard/player/quick-game') || pathname.startsWith('/dashboard/player/matches');
  const isPerfil  = pathname.startsWith('/dashboard/player/profile');

  const tabs = [
    { href: '/dashboard/player',             label: 'Inicio',  icon: Home,   active: isHome },
    { href: '/dashboard/player/tournaments', label: 'Torneos', icon: Trophy, active: isTorneos },
    { href: '/dashboard/player/quick-game',  label: 'Juegos',  icon: Zap,    active: isJuegos },
    { href: '/dashboard/player/profile',     label: 'Perfil',  icon: User,   active: isPerfil },
  ];

  return (
    <>
      {/* ── Top app bar ── */}
      <header className="bs-mobilehead">
        <Link href="/dashboard/player" className="bs-mobilehead-logo" aria-label="Inicio">
          <BrandLogo variant="white" height={22} />
        </Link>
        <div className="bs-mobilehead-actions">
          <NotificationBell inline />
          <Link href="/dashboard/player/profile" className="bs-avatar" aria-label="Mi perfil">
            {photoUrl
              ? <img src={photoUrl} alt="" />
              : <span>{initials(name)}</span>}
          </Link>
        </div>
      </header>

      {/* ── (+) quick-action sheet ── */}
      {fabOpen && (
        <>
          <div className="bs-sheet-backdrop" onClick={() => setFabOpen(false)} />
          <div className="bs-actionsheet" role="dialog" aria-label="Crear">
            <div className="bs-actionsheet-head">
              <span>Crear</span>
              <button onClick={() => setFabOpen(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <Link href="/dashboard/player/tournaments" className="bs-actionsheet-item">
              <Trophy size={18} /> <span>Crear torneo</span>
            </Link>
            <Link href="/dashboard/player/quick-game" className="bs-actionsheet-item">
              <Zap size={18} /> <span>Juego rápido</span>
            </Link>
            <Link href="/dashboard/player/tournaments?format=personalizado" className="bs-actionsheet-item">
              <Sparkles size={18} /> <span>Torneo personalizado</span>
            </Link>
          </div>
        </>
      )}

      {/* ── Bottom tab bar with a raised (+) ── */}
      <nav className="bs-tabbar" aria-label="Navegación principal">
        {tabs.slice(0, 2).map(t => <TabLink key={t.href} {...t} />)}

        <button
          className={`bs-fab${fabOpen ? ' open' : ''}`}
          onClick={() => setFabOpen(o => !o)}
          aria-label="Crear"
        >
          <Plus size={26} />
        </button>

        {tabs.slice(2).map(t => <TabLink key={t.href} {...t} />)}
      </nav>
    </>
  );
}

function TabLink({ href, label, icon: Icon, active }: {
  href: string; label: string; icon: typeof Home; active: boolean;
}) {
  return (
    <Link href={href} className={`bs-tab${active ? ' active' : ''}`}>
      <Icon size={20} />
      <span>{label}</span>
    </Link>
  );
}
