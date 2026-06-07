'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { saIsLoggedIn, saLogout } from '@/lib/superadmin-auth';

const NAV_ITEMS = [
  { label: 'DASHBOARD', href: '/superadmin/dashboard' },
  { label: 'JUGADORES', href: '/superadmin/players' },
  { label: 'CLUBES', href: '/superadmin/clubs' },
  { label: 'TORNEOS', href: '/superadmin/tournaments' },
  { label: 'JUEGOS RAPIDOS', href: '/superadmin/games' },
  { label: 'RELACIONES', href: '/superadmin/relations' },
  { label: 'PROMOCIONES', href: '/superadmin/promotions' },
  { label: 'STRIPE', href: '/superadmin/stripe' },
  { label: 'CONFIGURACION', href: '/superadmin/config' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setLoggedIn(saIsLoggedIn());
  }, [pathname]);

  const isLoginPage = pathname === '/superadmin/login' || pathname === '/superadmin';

  if (isLoginPage || !loggedIn) {
    return <>{children}</>;
  }

  function handleLogout() {
    saLogout();
    router.push('/superadmin/login');
  }

  const sessionRaw = typeof window !== 'undefined' ? sessionStorage.getItem('padelmgt_sa_session') : null;
  const sessionEmail = sessionRaw ? (JSON.parse(sessionRaw) as { email: string }).email : '';

  const sidebarContent = (
    <div style={{
      width: 240,
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.05em',
        }}>
          PADEL MGT
        </div>
        <div style={{
          fontSize: 10,
          color: 'var(--grey-500)',
          letterSpacing: '0.15em',
          marginTop: 4,
          textTransform: 'uppercase',
        }}>
          Super Admin
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 16 }}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              style={{
                display: 'block',
                padding: '11px 24px',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--turf-green)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10, wordBreak: 'break-all' }}>
          {sessionEmail}
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 4,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 11,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Cerrar sesion
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f0f0' }}>
      {/* Desktop sidebar */}
      <div style={{ display: 'block' }} className="sa-sidebar-desktop">
        {sidebarContent}
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="sa-hamburger"
        style={{
          display: 'none',
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 200,
          background: '#0a0a0a',
          border: 'none',
          color: '#fff',
          width: 40,
          height: 40,
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 18,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {sidebarOpen ? 'x' : '='}
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            display: 'none',
          }}
          className="sa-mobile-overlay"
        />
      )}

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="sa-sidebar-mobile" style={{ display: 'none' }}>
          {sidebarContent}
        </div>
      )}

      {/* Main content */}
      <main style={{
        marginLeft: 240,
        flex: 1,
        minHeight: '100vh',
        background: '#fff',
        overflowY: 'auto',
      }} className="sa-main">
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .sa-sidebar-desktop { display: none !important; }
          .sa-hamburger { display: flex !important; }
          .sa-mobile-overlay { display: block !important; }
          .sa-sidebar-mobile { display: block !important; }
          .sa-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
