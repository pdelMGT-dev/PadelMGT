'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';

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

  // Don't render on dashboard routes — they use DashboardSidebar instead
  if (pathname.startsWith('/dashboard')) return null;

  return (
    <>
      {/* Promo banner */}
      <div className="promo-banner">
        Crea torneos en menos de 60 segundos. Federaciones — contacta ventas →
      </div>

      <header className={`app-header${isHome ? ' transparent' : ''}`} style={isHome ? { position: 'absolute', width: '100%' } : {}}>
        {/* Desktop */}
        <div className="header-row" style={{ display: 'grid' }}>
          {/* Left nav */}
          <nav className="header-nav">
            {leftLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`nav-link${pathname === l.href ? ' active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Center logo */}
          <Link href="/" className="logo" style={{ justifySelf: 'center' }}>
            <span className="logo-mark">P</span>
            PadelMGT
          </Link>

          {/* Right nav + actions */}
          <div className="header-actions">
            {rightLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`nav-link${pathname === l.href ? ' active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/login" className="nav-link">Iniciar Sesión</Link>
            <Link href="/signup" className={`btn btn-sm ${isHome ? 'btn-on-dark' : 'btn-primary'}`}>
              Crear Cuenta
            </Link>
          </div>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: 'none',
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: isHome ? '#fff' : '#111',
          }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: '#111', zIndex: 200,
          display: 'flex', flexDirection: 'column', padding: '24px 32px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <Link href="/" className="logo" style={{ color: '#fff' }} onClick={() => setMobileOpen(false)}>
              <span className="logo-mark" style={{ background: '#fff', color: '#111' }}>P</span>
              PadelMGT
            </Link>
            <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...leftLinks, ...rightLinks].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '-0.01em',
                  color: pathname === l.href ? 'var(--neon)' : '#fff', textDecoration: 'none',
                  padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div style={{ marginTop: 'auto', display: 'flex', gap: 12 }}>
            <Link href="/login" className="btn btn-outline-dark" onClick={() => setMobileOpen(false)}>Iniciar Sesión</Link>
            <Link href="/signup" className="btn btn-on-dark" onClick={() => setMobileOpen(false)}>Crear Cuenta</Link>
          </div>
        </div>
      )}
    </>
  );
}
