import Link from 'next/link';

/** Shared layout for static legal pages (privacy, terms, cookies). */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: 'var(--grey-50)', minHeight: '100vh' }}>
      <div className="page-header">
        <div className="page-header-bg" />
        <div className="page-header-scrim" />
        <div className="page-header-content">
          <div className="hero-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Legal</div>
          <h1 className="page-title">{title.toUpperCase()}</h1>
          <p className="page-sub">Última actualización: {updated}</p>
        </div>
      </div>

      <section style={{ padding: '56px 24px 96px' }}>
        <div className="legal-prose" style={{ maxWidth: 760, margin: '0 auto', fontFamily: 'var(--font-body)', color: 'var(--grey-700)', lineHeight: 1.7, fontSize: 15 }}>
          {children}

          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--grey-200)' }}>
            <Link href="/" style={{ color: 'var(--black)', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
