'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  supabase, exchangeCodeForSession, verifyEmailOtp, getAuthUser,
  fetchPlayerByUserId, fetchPlayerByEmail, ensurePlayerRowForAuthUser,
} from '@/lib/supabase';
import { syncAllFromSupabase } from '@/lib/supabase-sync';
import { migrateLocalPlayerId } from '@/lib/player-league-store';
import BrandLogo from '@/components/BrandLogo';

type Role = 'player' | 'club_manager';

const ROLE_DASHBOARD: Record<Role, string> = {
  player:           '/dashboard/player',
  club_manager:     '/dashboard/club',
};

function resolveRole(meta: Record<string, unknown> | undefined): Role {
  const r = (meta?.padelmgt_role as string) ?? 'player';
  return (['player', 'club_manager'].includes(r) ? r : 'player') as Role;
}

function CallbackInner() {
  const router = useRouter();
  const [status, setStatus] = useState<'working' | 'error'>('working');

  useEffect(() => {
    let alive = true;

    async function establishSession(): Promise<boolean> {
      if (typeof window === 'undefined' || !supabase) return false;

      const params = new URLSearchParams(window.location.search);

      // Newer email-template flow: ?token_hash=...&type=signup|email (cross-device safe)
      const tokenHash = params.get('token_hash');
      const otpType = params.get('type');
      if (tokenHash && otpType) {
        const t = (['signup', 'email', 'recovery', 'invite', 'magiclink', 'email_change'].includes(otpType)
          ? otpType : 'email') as 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink' | 'email_change';
        const { error } = await verifyEmailOtp(tokenHash, t);
        return !error;
      }

      // PKCE flow: ?code=... (works when confirming on the same browser that signed up)
      const code = params.get('code');
      if (code) {
        const { error } = await exchangeCodeForSession(code);
        return !error;
      }

      // Implicit flow: #access_token=...  — the browser client auto-detects it.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      if (hash.get('access_token')) {
        // Give the client a beat to persist the detected session.
        const { data } = await supabase.auth.getSession();
        return !!data.session;
      }

      return false;
    }

    async function run() {
      const ok = await establishSession();
      if (!alive) return;
      if (!ok) { setStatus('error'); return; }

      const authUser = await getAuthUser();
      if (!alive) return;
      if (!authUser) { setStatus('error'); return; }

      const role = resolveRole(authUser.user_metadata as Record<string, unknown> | undefined);

      // Fetch the player record created at signup (by auth id, then email).
      let sbPlayer = await fetchPlayerByUserId(authUser.id);
      if (!sbPlayer) sbPlayer = await fetchPlayerByEmail(authUser.email ?? '');
      // Self-heal: no row at all, OR a row exists but was only found by
      // email — never bound to this auth user's id, which silently 403s
      // every future server-side write. /api/player/register is idempotent
      // by email, so this either creates the row or binds the existing one.
      if (!sbPlayer || !sbPlayer.user_id) {
        const healed = await ensurePlayerRowForAuthUser(authUser);
        if (healed) sbPlayer = await fetchPlayerByEmail(authUser.email ?? '');
      }
      if (!alive) return;

      const cf = (sbPlayer?.custom_fields as Record<string, string>) ?? {};
      const session = sbPlayer
        ? {
            id:            sbPlayer.id as string,
            name:          sbPlayer.name as string,
            email:         sbPlayer.email as string,
            shortId:       cf.shortId || (sbPlayer.short_id as string) || '',
            role,
            sub:           `${cf.shortId ?? ''} · ${(sbPlayer.city as string) ?? (sbPlayer.country as string) ?? ''}`,
            rankingPoints: (sbPlayer.ranking_points as number) ?? 0,
            firstLogin:    true,
            ...(cf.plan ? { plan: cf.plan } : {}),
          }
        : {
            id:    authUser.id,
            name:  (authUser.user_metadata?.full_name as string) ?? authUser.email?.split('@')[0] ?? 'Jugador',
            email: authUser.email ?? '',
            role,
            sub:   '',
            firstLogin: true,
          };

      try {
        const prevRaw = localStorage.getItem('padelmgt_user');
        const prevId = prevRaw ? (JSON.parse(prevRaw) as { id?: string }).id : undefined;
        if (prevId && session.id && prevId !== session.id) migrateLocalPlayerId(prevId, session.id);
      } catch { /* ignore */ }
      try { localStorage.setItem('padelmgt_user', JSON.stringify(session)); } catch { /* private mode */ }
      try { localStorage.removeItem('padelmgt_last_sync'); } catch { /* ignore */ }
      try { document.cookie = `padelmgt_session=${role}; path=/; SameSite=Lax; max-age=86400`; } catch { /* ignore */ }

      // Clean the token/code out of the URL before leaving.
      try { window.history.replaceState({}, '', '/auth/callback'); } catch { /* ignore */ }

      syncAllFromSupabase().finally(() => {
        if (alive) router.replace(ROLE_DASHBOARD[role]);
      });
    }

    run();
    return () => { alive = false; };
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--black)', padding: '20px 32px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <BrandLogo variant="white" height={32} />
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 460, padding: '48px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          {status === 'working' ? (
            <>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(214,255,0,0.12)', border: '2px solid var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>✓</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px', color: 'var(--black)' }}>
                Confirmando tu cuenta…
              </h1>
              <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: 0, lineHeight: 1.6 }}>
                Te estamos llevando a la plataforma.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px', color: 'var(--black)' }}>
                Enlace inválido o expirado
              </h1>
              <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '0 0 32px', lineHeight: 1.6 }}>
                No pudimos confirmar tu cuenta automáticamente. Iniciá sesión con tu email y contraseña.
              </p>
              <Link href="/login" className="btn btn-primary" style={{ display: 'inline-block', padding: '12px 24px', fontSize: 14, textDecoration: 'none', borderRadius: 0 }}>
                Ir a iniciar sesión →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: 'var(--grey-400)', fontSize: 14 }}>Cargando…</div>}>
      <CallbackInner />
    </Suspense>
  );
}
