export const metadata = { title: 'Sin conexión — PadelMGT' };

export default function OfflinePage() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📡</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
        Sin conexión
      </h1>
      <p style={{ fontSize: 15, color: 'var(--grey-500)', maxWidth: 400, lineHeight: 1.6, margin: '0 0 28px' }}>
        No hay conexión a internet. Tus datos locales siguen disponibles — reconectate para sincronizar.
      </p>
      <a href="/dashboard/player"
        style={{ padding: '12px 28px', background: 'var(--black)', color: 'var(--neon)', textDecoration: 'none', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Reintentar
      </a>
    </div>
  );
}
