'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Invitation = {
  id: string;
  token: string;
  email: string;
  playerName: string;
  clubName: string;
  level: string;
  points: number;
  status: 'pending' | 'accepted';
  createdAt: string;
};

const LEVEL_LABELS: Record<string, string> = {
  '1': 'Nivel 1 — Iniciación', '2': 'Nivel 2 — Básico', '3': 'Nivel 3 — Intermedio bajo',
  '4': 'Nivel 4 — Intermedio', '5': 'Nivel 5 — Intermedio alto',
  '6': 'Nivel 6 — Avanzado', '7': 'Nivel 7 — Competición', 'Pro': 'Pro',
};

const inp: React.CSSProperties = {
  display: 'block', width: '100%', border: '1px solid var(--grey-200)',
  padding: '12px 16px', fontSize: 15, background: '#fff', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'var(--font-body)',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8,
};

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const [invitation, setInvitation] = useState<Invitation | 'not_found' | 'loading'>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]        = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]          = useState(false);

  useEffect(() => {
    fetch(`/api/club-invite?token=${encodeURIComponent(token)}`)
      .then(res => res.ok ? res.json() as Promise<{ invitation: Invitation | null }> : { invitation: null })
      .then(({ invitation: found }) => setInvitation(found ?? 'not_found'))
      .catch(() => setInvitation('not_found'));
  }, [token]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (!invitation || invitation === 'not_found' || invitation === 'loading') return;

    setSubmitting(true);

    // Create user account
    const user = {
      id: crypto.randomUUID(),
      name: invitation.playerName,
      email: invitation.email,
      role: 'player',
      level: invitation.level,
      points: invitation.points,
      clubName: invitation.clubName,
    };
    try { localStorage.setItem('padelmgt_user', JSON.stringify(user)); } catch {}

    // Mark the invitation accepted server-side (also flips the club's roster
    // entry to 'joined' — the invitee has no club-manager session to do that
    // through directly).
    fetch('/api/club-invite', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(err => console.warn('[club-invite] accept failed:', err));

    setDone(true);
    setTimeout(() => router.push('/dashboard/player/quick-game'), 2500);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (invitation === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--grey-50)', fontFamily: 'var(--font-body)' }}>
        <div style={{ fontSize: 14, color: 'var(--grey-400)' }}>Verificando invitación...</div>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (invitation === 'not_found') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--grey-50)', fontFamily: 'var(--font-body)', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, marginBottom: 8, color: 'var(--grey-300)' }}>!</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 12 }}>Enlace inválido</div>
          <div style={{ fontSize: 14, color: 'var(--grey-500)', lineHeight: 1.6, marginBottom: 28 }}>
            Esta invitación no existe o ya fue utilizada. Si creés que es un error, pedile al club que te envíe un nuevo enlace.
          </div>
          <a href="/" style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ir al inicio</a>
        </div>
      </div>
    );
  }

  // ── Already accepted ─────────────────────────────────────────────────────────
  if (invitation.status === 'accepted') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--grey-50)', fontFamily: 'var(--font-body)', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>Ya estás registrado</div>
          <div style={{ fontSize: 14, color: 'var(--grey-500)', marginBottom: 28 }}>Esta invitación ya fue utilizada. Iniciá sesión con tu email y contraseña.</div>
          <a href="/login" style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Iniciar sesión →</a>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--black)', fontFamily: 'var(--font-body)', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center', color: '#fff' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32, color: 'var(--black)' }}>✓</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 12 }}>¡Bienvenido!</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            Tu cuenta fue creada exitosamente. Redirigiendo a tu dashboard...
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', fontFamily: 'var(--font-body)' }}>

      {/* Top bar */}
      <div style={{ background: 'var(--black)', padding: '20px 40px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--neon)' }}>PadelMGT</div>
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.04em' }}>Activar cuenta</div>
      </div>

      <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 24px' }}>

        {/* Club banner */}
        <div style={{ background: 'var(--black)', color: '#fff', padding: '24px 28px', marginBottom: 32 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 600, marginBottom: 6 }}>Invitación de</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{invitation.clubName}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            Te invita a unirte a la plataforma PadelMGT
          </div>
        </div>

        {/* Pre-filled player info */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 16 }}>Tus datos registrados por el club</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-400)', marginBottom: 4 }}>Nombre</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{invitation.playerName}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-400)', marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 14, color: 'var(--grey-600)' }}>{invitation.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-400)', marginBottom: 4 }}>Nivel</div>
              <div style={{ fontSize: 13, color: 'var(--grey-600)' }}>{LEVEL_LABELS[invitation.level] ?? `Nivel ${invitation.level}`}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-400)', marginBottom: 4 }}>Puntos de ranking</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{invitation.points.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px 28px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 20 }}>Elegí tu contraseña</div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Contraseña *</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres" style={inp} required autoFocus
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>Confirmá la contraseña *</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repetí tu contraseña" style={inp} required
            />
          </div>

          {error && (
            <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030', padding: '10px 14px', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting || !password || !confirm} style={{
            width: '100%', padding: '14px', background: password && confirm ? 'var(--black)' : 'var(--grey-200)',
            color: password && confirm ? '#fff' : 'var(--grey-400)', border: 'none',
            cursor: password && confirm ? 'pointer' : 'default', fontSize: 13, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            {submitting ? 'Creando cuenta...' : 'Activar mi cuenta →'}
          </button>

          <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>
            Al registrarte aceptás los términos de uso de PadelMGT.<br />
            Tu email será <strong>{invitation.email}</strong>.
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/login" style={{ fontSize: 12, color: 'var(--grey-400)', textDecoration: 'none' }}>Ya tenés cuenta? Iniciá sesión →</a>
        </div>
      </div>
    </div>
  );
}
