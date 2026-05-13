import Link from 'next/link';

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', display: 'flex' }}>
      {/* Left image panel */}
      <div style={{ flex: '0 0 45%', position: 'relative', overflow: 'hidden' }}>
        <img src="/assets/court-dark.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(10,22,56,0.9) 0%, rgba(26,78,216,0.8) 100%)' }} />
        <div style={{ position: 'relative', padding: '64px 48px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 64 }}>
            <div style={{ width: 32, height: 32, background: '#fff', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>P</div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, textTransform: 'uppercase', color: '#fff', letterSpacing: '-0.01em' }}>PadelMGT</span>
          </Link>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(40px, 5vw, 80px)', textTransform: 'uppercase', letterSpacing: '-0.025em', lineHeight: 0.9, color: '#fff' }}>
            BIENVENIDO<br /><span style={{ color: 'var(--neon)' }}>DE VUELTA.</span>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 48px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>Iniciar Sesión</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 52, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.92, margin: 0 }}>ACCEDE A TU<br />CUENTA</h1>
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label>Email</label>
            <input type="email" placeholder="tu@email.com" style={{ borderRadius: 0 }} />
          </div>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Contraseña</label>
            <input type="password" placeholder="Tu contraseña" style={{ borderRadius: 0 }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--grey-500)', cursor: 'pointer' }}>
              <input type="checkbox" /> Recordarme
            </label>
            <Link href="/forgot-password" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 500, textDecoration: 'none' }}>¿Olvidaste tu contraseña?</Link>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%', borderRadius: 0, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Iniciar Sesión
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--grey-400)', marginTop: 24 }}>
            ¿Nuevo en PadelMGT? <Link href="/signup" style={{ color: 'var(--black)', fontWeight: 600 }}>Crear cuenta gratis</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
