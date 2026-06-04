'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getUserPlan, getPlayerLimits, getMonthlyUsage, type PlanId } from '@/lib/plan-config';

// ── Display metadata ────────────────────────────────────────────────────────

const PLAN_META: Record<PlanId, { label: string; tier: 'free' | 'starter' | 'pro' | 'max' }> = {
  free:             { label: 'Plan Gratuito',    tier: 'free' },
  player_pro:       { label: 'Jugador Pro',      tier: 'pro' },
  club_starter:     { label: 'Club Starter',     tier: 'starter' },
  club_pro:         { label: 'Club Pro',         tier: 'pro' },
  club_liga:        { label: 'Club Liga',        tier: 'max' },
  liga_free:        { label: 'Liga Gratuita',    tier: 'free' },
  liga_basic:       { label: 'Liga Básica',      tier: 'starter' },
  liga_pro:         { label: 'Liga Pro',         tier: 'pro' },
  liga_unlimited:   { label: 'Liga Unlimited',   tier: 'max' },
  fed_basic:        { label: 'Federación Básica',tier: 'starter' },
  fed_pro:          { label: 'Federación Pro',   tier: 'max' },
};

const TIER_COLOR: Record<string, string> = {
  free:    'var(--grey-400)',
  starter: '#6366f1',
  pro:     'var(--neon)',
  max:     '#f5a623',
};

// ── Usage progress bar ──────────────────────────────────────────────────────

function UsageBar({ label, used, limit, unit = '' }: { label: string; used: number; limit: number; unit?: string }) {
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const atLimit = !unlimited && used >= limit;
  const nearLimit = !unlimited && pct >= 75;

  const barColor = atLimit ? '#ef4444' : nearLimit ? '#f5a623' : 'var(--neon)';

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--grey-500)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: atLimit ? '#ef4444' : 'var(--black)' }}>
          {unlimited ? (
            <span style={{ color: 'var(--turf-green)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>SIN LÍMITE</span>
          ) : (
            <>{used}<span style={{ color: 'var(--grey-400)', fontWeight: 400 }}> / {limit}{unit}</span></>
          )}
        </span>
      </div>
      {!unlimited && (
        <div style={{ height: 5, background: 'var(--grey-100)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
        </div>
      )}
      {atLimit && (
        <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Límite alcanzado este mes
        </div>
      )}
    </div>
  );
}

// ── Club plan feature summary ───────────────────────────────────────────────

const CLUB_FEATURES: Record<string, { done: string[]; locked?: string[]; upgrade?: string }> = {
  club_starter: {
    done:   ['Gestión de miembros', 'Reservas de canchas', 'Estadísticas básicas'],
    locked: ['Torneos de Liga', 'App personalizada', 'Multi-sede'],
    upgrade: 'club_pro',
  },
  club_pro: {
    done:   ['Miembros ilimitados', 'Torneos y ligas', 'Estadísticas avanzadas', 'Notificaciones'],
    locked: ['App personalizada', 'Multi-sede', 'Integración federación'],
    upgrade: 'club_liga',
  },
  club_liga: {
    done:   ['App personalizada', 'Multi-sede', 'Integración federación', 'Soporte prioritario'],
  },
};

const LEAGUE_FEATURES: Record<string, { done: string[]; locked?: string[]; upgrade?: string }> = {
  liga_free: {
    done:   ['1 liga activa', 'Hasta 8 equipos'],
    locked: ['Múltiples ligas', 'Estadísticas avanzadas', 'Exportar datos'],
    upgrade: 'liga_basic',
  },
  liga_basic: {
    done:   ['3 ligas activas', 'Hasta 16 equipos', 'Estadísticas básicas'],
    locked: ['Ligas ilimitadas', 'API de datos', 'Sponsorship tools'],
    upgrade: 'liga_pro',
  },
  liga_pro: {
    done:   ['Ligas ilimitadas', 'Hasta 64 equipos', 'API de datos'],
    locked: ['Equipos ilimitados', 'Sponsorship tools'],
    upgrade: 'liga_unlimited',
  },
  liga_unlimited: {
    done:   ['Ligas y equipos ilimitados', 'API completa', 'Sponsorship tools', 'Soporte dedicado'],
  },
};

function FeatureList({ done, locked }: { done: string[]; locked?: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
      {done.map(f => (
        <span key={f} style={{ fontSize: 12, color: 'var(--grey-700)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: 'var(--turf-green)', fontWeight: 700 }}>✓</span> {f}
        </span>
      ))}
      {locked?.map(f => (
        <span key={f} style={{ fontSize: 12, color: 'var(--grey-300)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontWeight: 700 }}>—</span> {f}
        </span>
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface Props {
  role: 'player' | 'club_manager' | 'league_organizer' | 'federation' | 'super_admin';
}

export default function PlanUsageBanner({ role }: Props) {
  const [plan, setPlan] = useState<PlanId>('free');
  const [usage, setUsage] = useState({ games: 0, tournaments: 0 });

  useEffect(() => {
    setPlan(getUserPlan());
    setUsage(getMonthlyUsage());
  }, []);

  const meta = PLAN_META[plan] ?? PLAN_META.free;
  const tierColor = TIER_COLOR[meta.tier];
  const isUnlimited = meta.tier === 'max' || role === 'super_admin';

  // ── Super admin / federation: no banner needed ────────────────────────────
  if (role === 'super_admin' || role === 'federation') return null;

  // ── Player banner ─────────────────────────────────────────────────────────
  if (role === 'player') {
    const limits = getPlayerLimits();
    const isPro = plan === 'player_pro';

    return (
      <div style={{ border: `1px solid ${isPro ? 'rgba(214,255,0,0.3)' : 'var(--grey-200)'}`, background: isPro ? 'rgba(214,255,0,0.04)' : '#fff', padding: '20px 24px', marginBottom: 32 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isPro ? 16 : 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Tu plan</span>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', background: tierColor, color: isPro ? 'var(--black)' : '#fff' }}>
              {meta.label}
            </span>
          </div>
          {!isPro && (
            <Link href="/pricing" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--black)', textDecoration: 'none', padding: '6px 16px', border: '2px solid var(--black)', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              ⚡ Ver planes
            </Link>
          )}
          {isPro && (
            <span style={{ fontSize: 11, color: 'var(--turf-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              ✓ Sin límites activos
            </span>
          )}
        </div>

        {/* Usage bars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 32px' }}>
          <UsageBar
            label="Juegos Rápidos este mes"
            used={usage.games}
            limit={limits.maxGamesPerMonth}
          />
          <UsageBar
            label="Torneos este mes"
            used={usage.tournaments}
            limit={limits.maxTournamentsPerMonth}
          />
        </div>

        {/* Upgrade nudge */}
        {!isPro && (
          <div style={{ marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>
              Jugador Pro: juegos ilimitados · hasta 32 jugadores · torneos ilimitados
            </span>
            <Link href="/pricing" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--black)', textDecoration: 'none', padding: '8px 20px', background: 'var(--neon)', whiteSpace: 'nowrap' }}>
              Activar Pro — $3/mes →
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ── Club banner ───────────────────────────────────────────────────────────
  if (role === 'club_manager') {
    const features = CLUB_FEATURES[plan] ?? CLUB_FEATURES.club_starter;
    const hasUpgrade = !!features.upgrade;

    return (
      <div style={{ border: `1px solid ${isUnlimited ? 'rgba(245,166,35,0.35)' : 'var(--grey-200)'}`, background: isUnlimited ? 'rgba(245,166,35,0.04)' : '#fff', padding: '20px 24px', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Plan del club</span>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', background: tierColor, color: meta.tier === 'pro' || meta.tier === 'max' ? 'var(--black)' : '#fff' }}>
              {meta.label}
            </span>
          </div>
          {hasUpgrade && (
            <Link href="/pricing" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--black)', textDecoration: 'none', padding: '6px 16px', border: '2px solid var(--black)', whiteSpace: 'nowrap' }}>
              ↑ Actualizar plan
            </Link>
          )}
        </div>
        <FeatureList done={features.done} locked={features.locked} />
        {hasUpgrade && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--grey-100)', display: 'flex', justifyContent: 'flex-end' }}>
            <Link href="/pricing" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--black)', textDecoration: 'none', padding: '8px 20px', background: 'var(--neon)' }}>
              Ver todos los planes →
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ── League banner ─────────────────────────────────────────────────────────
  if (role === 'league_organizer') {
    const features = LEAGUE_FEATURES[plan] ?? LEAGUE_FEATURES.liga_free;
    const hasUpgrade = !!features.upgrade;

    return (
      <div style={{ border: `1px solid ${isUnlimited ? 'rgba(245,166,35,0.35)' : 'var(--grey-200)'}`, background: isUnlimited ? 'rgba(245,166,35,0.04)' : '#fff', padding: '20px 24px', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Plan de liga</span>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', background: tierColor, color: meta.tier === 'pro' || meta.tier === 'max' ? 'var(--black)' : '#fff' }}>
              {meta.label}
            </span>
          </div>
          {hasUpgrade && (
            <Link href="/pricing" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--black)', textDecoration: 'none', padding: '6px 16px', border: '2px solid var(--black)', whiteSpace: 'nowrap' }}>
              ↑ Actualizar plan
            </Link>
          )}
        </div>
        <FeatureList done={features.done} locked={features.locked} />
        {hasUpgrade && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--grey-100)', display: 'flex', justifyContent: 'flex-end' }}>
            <Link href="/pricing" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--black)', textDecoration: 'none', padding: '8px 20px', background: 'var(--neon)' }}>
              Ver todos los planes →
            </Link>
          </div>
        )}
      </div>
    );
  }

  return null;
}
