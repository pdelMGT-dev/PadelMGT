'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { STRIPE_PLAN_MAP, type PlanId } from '@/lib/plan-config';

const PLAN_LABELS: Record<PlanId, string> = {
  free:           'Gratuito',
  player_pro:     'Jugador Pro',
  liga_free:      'Liga Free',
  liga_basic:     'Liga Básico',
  liga_pro:       'Liga Pro',
  liga_unlimited: 'Liga Ilimitado',
  club_starter:   'Club Starter',
  club_pro:       'Club Pro',
  club_liga:      'Club + Liga',
  fed_basic:      'Federación Básica',
  fed_pro:        'Federación Pro',
};

export default function SubscriptionSuccessBanner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const { patchUser } = useCurrentUser();
  const [visible, setVisible] = useState(false);
  const [planLabel, setPlanLabel] = useState('');

  useEffect(() => {
    const isSuccess = searchParams.get('subscription') === 'success';
    if (!isSuccess) return;

    const planParam   = searchParams.get('plan') ?? '';
    const sessionId   = searchParams.get('session_id') ?? '';
    const planId: PlanId = (STRIPE_PLAN_MAP[planParam] ?? planParam) as PlanId;
    const label = PLAN_LABELS[planId] ?? planParam;

    // Optimistically update plan in localStorage right away
    if (planId && planId !== 'free') {
      patchUser({ plan: planId });
    }

    setPlanLabel(label);
    setVisible(true);

    // Remove query params from URL without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete('subscription');
    url.searchParams.delete('plan');
    url.searchParams.delete('session_id');
    window.history.replaceState({}, '', url.toString());

    // Best-effort server verification in background
    if (sessionId) {
      fetch(`/api/stripe/verify-session?session_id=${sessionId}`)
        .then(r => r.json() as Promise<{ status: string; plan?: string }>)
        .then(data => {
          if (data.status === 'paid' && data.plan) {
            const verifiedPlan = (STRIPE_PLAN_MAP[data.plan] ?? data.plan) as PlanId;
            if (verifiedPlan && verifiedPlan !== 'free') {
              patchUser({ plan: verifiedPlan });
            }
          }
        })
        .catch(() => { /* non-blocking */ });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: '#111', color: '#fff',
      padding: '16px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      maxWidth: 360,
      borderLeft: '4px solid var(--neon)',
    }}>
      <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>✓</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--neon)', letterSpacing: '-0.01em', marginBottom: 4 }}>
          ¡Suscripción activada!
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
          Tu plan <strong style={{ color: '#fff' }}>{planLabel}</strong> ya está activo. Todos los límites se actualizaron.
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0, marginTop: 2 }}
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}
