import Link from 'next/link';

const cols = [
  {
    title: 'Torneos',
    links: [
      { href: '/tournaments', label: 'Todos los formatos' },
      { href: '/tournaments/americano', label: 'Americano' },
      { href: '/tournaments/mexicano', label: 'Mexicano' },
      { href: '/leagues', label: 'Ligas' },
      { href: '/quick-games', label: 'Juegos Rápidos' },
    ],
  },
  {
    title: 'Plataforma',
    links: [
      { href: '/ranking', label: 'Ranking' },
      { href: '/clubs', label: 'Clubes' },
      { href: '/calendar', label: 'Calendario' },
      { href: '/live-scores', label: 'En Vivo' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { href: '/about', label: 'Nosotros' },
      { href: '/pricing', label: 'Planes' },
      { href: '/signup', label: 'Crear Cuenta' },
    ],
  },
  {
    title: 'Soporte',
    links: [
      { href: '#', label: 'Centro de Ayuda' },
      { href: '#', label: 'API' },
      { href: '#', label: 'Estado del Servicio' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-grid">
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 38, height: 38, background: '#fff', color: '#111',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
            }}>P</div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 26,
              textTransform: 'uppercase', letterSpacing: '-0.01em',
            }}>
              PadelMGT
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', maxWidth: 300, lineHeight: 1.65, margin: 0 }}>
            Por <strong style={{ color: '#fff' }}>Automatable</strong>. La plataforma para crear y gestionar
            torneos, ligas y clubes de pádel en Latinoamérica.
          </p>
        </div>

        {/* Link columns */}
        {cols.map((col) => (
          <div key={col.title}>
            <h4>{col.title}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="footer-bottom">
        <div>© 2026 Automatable · PadelMGT</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Privacidad</Link>
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Términos</Link>
          <Link href="/cookies" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
