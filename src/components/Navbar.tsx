'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import BrandLogo from './BrandLogo';

const leftLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/quick-games', label: 'Juegos Rápidos' },
  { href: '/tournaments', label: 'Torneos' },
  { href: '/leagues', label: 'Ligas' },
  { href: '/clubs', label: 'Clubes' },
];
const rightLinks = [
  { href: '/ranking', label: 'Ranking' },
  { href: '/calendar', label: 'Calendario' },
  { href: '/pricing', label: 'Planes' },
  { href: '/about', label: 'Nosotros' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = pathname === '/';

  if (pathname.startsWith('/dashboard')) return null;
  if (pathname.startsWith('/superadmin')) return null;

  return (
    <>
      <header className={`app-header${isHome ? ' transparent' : ''}`} style={isHome ? { position: 'absolute', width: '100%' } : {}}>
        <div className="header-row">
          {/* Left nav */}
          <nav className="header-nav">
            {leftLinks.map((l) => (
              <Link key={l.href} href={l.href} className={`nav-link${pathname === l.href ? ' active' : ''}`}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Center logo */}
          <Link href="/" className="logo" style={{ justifySelf: 'center' }}>
            <BrandLogo variant={isHome ? 'white' : 'full'} height={30} />
          </Link>

          {/* Right nav + actions */}
          <div className="header-actions">
            {rightLinks.map((l) => (
              <Link key={l.href} href={l.href} className={`nav-link${pathname === l.href ? ' active' : ''}`}>
                {l.label}
              </Link>
            ))}
            <Link href="/login" className="nav-link">Iniciar Sesión</Link>
            <Link href="/signup" className={`btn btn-sm ${isHome ? 'btn-on-dark' : 'btn-primary'}`}>
              Crear Cuenta
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            style={{ color: isHome ? '#fff' : '#111' }}
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div className="mobile-menu-overlay">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <Link href="/" className="logo" onClick={() => setMobileOpen(false)}>
              <BrandLogo variant="white" height={28} />
            </Link>
            <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
              <X size={24} />
            </button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...leftLinks, ...rightLinks].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '-0.01em',
                  color: pathname === l.href ? 'var(--neon)' : '#fff', textDecoration: 'none',
                  padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div style={{ marginTop: 'auto', display: 'flex', gap: 12, paddingTop: 32 }}>
            <Link href="/login" className="btn btn-outline-dark" onClick={() => setMobileOpen(false)}>Iniciar Sesión</Link>
            <Link href="/signup" className="btn btn-on-dark" onClick={() => setMobileOpen(false)}>Crear Cuenta</Link>
          </div>
        </div>
      )}
    </>
  );
}
