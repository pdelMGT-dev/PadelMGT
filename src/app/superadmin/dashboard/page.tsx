'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  getSAPlayersFromSupabase, getSAClubsFromSupabase, getSATournamentsFromSupabase, getSAGamesFromSupabase,
  saveSAClubs, upsertSAClubToSupabase,
  type SAClub, type SAPlayer, type SATournament, type SAGame,
} from '@/lib/superadmin-data';
import { fetchCorrectionsFromSupabase } from '@/lib/score-correction-store';
import { Badge, Avatar, Chip, type BadgeTone } from '@/design-system';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Parse a 'YYYY-MM-DD' (or ISO) string into {year, month} without timezone drift.
function ymOf(dateStr: string): { year: number; month: number } | null {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})/.exec(dateStr);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) - 1 };
}

// Build the last N month buckets ending on the current month.
function lastNMonths(n: number): { year: number; month: number; label: string }[] {
  const now = new Date();
  const out: { year: number; month: number; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] });
  }
  return out;
}

// Day-granularity relative time in Spanish for date-only strings.
function relativeDay(dateStr: string): string {
  const ym = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!ym) return '';
  const then = new Date(Number(ym[1]), Number(ym[2]) - 1, Number(ym[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today.getTime() - then.getTime()) / 86400000);
  if (diffDays <= 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 30) return `Hace ${diffDays} días`;
  const months = Math.floor(diffDays / 30);
  if (months === 1) return 'Hace 1 mes';
  if (months < 12) return `Hace ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'Hace 1 año' : `Hace ${years} años`;
}

// Days elapsed since a 'YYYY-MM-DD' string (for "last 7 days" filters).
function daysSince(dateStr: string): number | null {
  const ym = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr ?? '');
  if (!ym) return null;
  const then = new Date(Number(ym[1]), Number(ym[2]) - 1, Number(ym[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - then.getTime()) / 86400000);
}

interface ActivityItem { type: string; text: string; who: string; status: string; tone: BadgeTone; dot: string; time: string; sortKey: string }

interface StripeSummary {
  connected: boolean;
  livemode?: boolean;
  monthRevenueCents?: number;
  mrrCents?: number;
  activeSubscriptions?: number;
  recentCharges?: Array<{
    id: string; amount: number; currency: string; status: string;
    description: string; email: string; created: number; refunded: boolean;
  }>;
}

function fmtMoney(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('es', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

// ── KPI hero tile (dark card) ─────────────────────────────────────────────────

function HeroTile({ label, value, trend, tone }: { label: string; value: string | number; trend?: string; tone?: 'up' | 'down' | 'flat' }) {
  const trendColor = tone === 'up' ? 'var(--neon)' : tone === 'down' ? '#ff7a7a' : 'rgba(255,255,255,0.6)';
  const arrow = tone === 'up' ? '▲' : tone === 'down' ? '▼' : '';
  return (
    <div style={{ background: 'rgba(111,163,255,0.1)', border: '1px solid rgba(111,163,255,0.2)', borderRadius: 14, padding: '16px 15px' }}>
      <div style={{ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 700, lineHeight: 1.3, minHeight: 24 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1, marginTop: 10 }}>
        {value}
      </div>
      {trend && (
        <div style={{ marginTop: 9, fontSize: 11, fontWeight: 600, color: trendColor, display: 'flex', alignItems: 'center', gap: 4 }}>
          {arrow} {trend}
        </div>
      )}
    </div>
  );
}

// ── Attention card ────────────────────────────────────────────────────────────

function AttentionCard({ count, tag, tone, label, desc, cta, href }: {
  count: number; tag: string; tone: BadgeTone; label: string; desc: string; cta: string; href: string;
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 16, padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, lineHeight: 0.9 }}>{count}</div>
        <Badge tone={tone}>{tag}</Badge>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 3 }}>{desc}</div>
      </div>
      <a href={href} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--court-blue)', textDecoration: 'none' }}>{cta} →</a>
    </div>
  );
}

const CLUB_PLAN_TONE: Record<string, BadgeTone> = { infinity: 'neon' };
function planTone(plan: string): BadgeTone {
  if (CLUB_PLAN_TONE[plan]) return CLUB_PLAN_TONE[plan];
  if (plan.startsWith('free')) return 'outline';
  return 'primary';
}

const CLUB_STATUS_TONE: Record<SAClub['status'], BadgeTone> = { active: 'success', pending: 'warning', inactive: 'neutral', rejected: 'danger' };
const PLAYER_STATUS_TONE: Record<SAPlayer['status'], BadgeTone> = { active: 'success', suspended: 'danger', blocked: 'danger' };

export default function SuperAdminDashboard() {
  const [players, setPlayers] = useState<SAPlayer[]>([]);
  const [clubs, setClubs] = useState<SAClub[]>([]);
  const [tournaments, setTournaments] = useState<SATournament[]>([]);
  const [games, setGames] = useState<SAGame[]>([]);
  const [pendingScoreCount, setPendingScoreCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string }>>([]);
  const [stripeData, setStripeData] = useState<StripeSummary | null>(null);
  const [showStripeDetail, setShowStripeDetail] = useState(false);
  const [activityFilter, setActivityFilter] = useState('Todo');
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    let alive = true;
    Promise.all([
      getSAPlayersFromSupabase(),
      getSAClubsFromSupabase(),
      getSATournamentsFromSupabase(),
      getSAGamesFromSupabase(),
      fetchCorrectionsFromSupabase().catch(() => []),
    ]).then(([sbPlayers, sbClubs, sbTournaments, sbGames, corrections]) => {
      if (!alive) return;
      setPlayers(sbPlayers ?? []);
      setClubs(sbClubs ?? []);
      setTournaments(sbTournaments ?? []);
      setGames(sbGames ?? []);
      setPendingScoreCount((corrections ?? []).filter(c => c.status === 'pending').length);
      setLoaded(true);
    });
    fetch('/api/superadmin/stripe/summary')
      .then(r => r.json())
      .then((d: StripeSummary) => { if (alive) setStripeData(d); })
      .catch(() => { if (alive) setStripeData({ connected: false }); });
    return () => { alive = false; };
  }, []);

  function toast(msg: string) {
    const id = Date.now();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  function handleClubAction(clubId: string, action: 'active' | 'rejected') {
    const updated = clubs.map(c => c.id === clubId ? { ...c, status: action } : c);
    setClubs(updated);
    saveSAClubs(updated);
    const changed = updated.find(c => c.id === clubId);
    if (changed) upsertSAClubToSupabase(changed);
    toast(action === 'active' ? 'Club aprobado correctamente' : 'Club rechazado');
  }

  // ── Real metrics derived from Supabase data ──────────────────────────────────
  const now = new Date();
  const thisY = now.getFullYear(), thisM = now.getMonth();
  const lastM = thisM === 0 ? 11 : thisM - 1;
  const lastMY = thisM === 0 ? thisY - 1 : thisY;

  const activePlayers = players.filter(p => p.status === 'active');
  const activeClubs = clubs.filter(c => c.status === 'active');
  const pendingClubs = clubs.filter(c => c.status === 'pending');
  const ongoingTournaments = tournaments.filter(t => t.status === 'ongoing').length;
  const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming').length;

  const newPlayersThisMonth = players.filter(p => {
    const ym = ymOf(p.joinedAt);
    return ym && ym.year === thisY && ym.month === thisM;
  }).length;
  const newPlayers7d = players.filter(p => {
    const d = daysSince(p.joinedAt);
    return d !== null && d >= 0 && d < 7;
  }).length;
  const newPlayers7dPrev = players.filter(p => {
    const d = daysSince(p.joinedAt);
    return d !== null && d >= 7 && d < 14;
  }).length;

  const tournamentsThisMonth = tournaments.filter(t => {
    const ym = ymOf(t.date);
    return ym && ym.year === thisY && ym.month === thisM;
  }).length;
  const tournamentsLastMonth = tournaments.filter(t => {
    const ym = ymOf(t.date);
    return ym && ym.year === lastMY && ym.month === lastM;
  }).length;
  const tourDiff = tournamentsThisMonth - tournamentsLastMonth;

  const pendingTotal = pendingClubs.length + pendingScoreCount;

  // Club plans, grouped for the subscriptions panel.
  const planGroups = useMemo(() => {
    const colors: Record<string, string> = {
      free: 'var(--grey-400)', pending: 'var(--grey-400)',
    };
    const palette = ['var(--court-blue)', 'var(--turf-green)', '#a9c400', 'var(--grey-400)', 'var(--neon)'];
    const counts = new Map<string, number>();
    for (const c of clubs) counts.set(c.plan, (counts.get(c.plan) ?? 0) + 1);
    const total = clubs.length || 1;
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([plan, count], i) => ({
        plan, count, pct: `${Math.round((count / total) * 100)}%`,
        width: `${Math.round((count / total) * 100)}%`,
        color: colors[plan] ?? palette[i % palette.length],
      }));
  }, [clubs]);

  // Player-growth chart: cumulative registrations at the end of each of the last 6 months.
  const playerGrowth = useMemo(() => {
    const buckets = lastNMonths(6);
    return buckets.map(b => {
      const cumulative = players.filter(p => {
        const ym = ymOf(p.joinedAt);
        return ym && (ym.year < b.year || (ym.year === b.year && ym.month <= b.month));
      }).length;
      return { mes: b.label, jugadores: cumulative };
    });
  }, [players]);

  // Tournaments-per-month chart over the last 6 months.
  const tournamentsPerMonth = useMemo(() => {
    const buckets = lastNMonths(6);
    return buckets.map(b => {
      const count = tournaments.filter(t => {
        const ym = ymOf(t.date);
        return ym && ym.year === b.year && ym.month === b.month;
      }).length;
      return { mes: b.label, torneos: count };
    });
  }, [tournaments]);

  // Real activity feed: recent registrations, club requests, tournaments and payments.
  const fullActivityFeed = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const p of players) {
      if (!p.joinedAt) continue;
      items.push({ type: 'Jugadores', text: `${p.name} se registró como nuevo jugador`, who: p.city || '—', status: 'Nuevo registro', tone: 'info', dot: 'var(--bs-light)', time: relativeDay(p.joinedAt), sortKey: p.joinedAt });
    }
    for (const c of clubs) {
      if (!c.joinedAt) continue;
      const verb = c.status === 'pending' ? 'solicitó aprobación'
        : c.status === 'active' ? 'se unió a la plataforma'
        : 'actualizó su estado';
      const tone: BadgeTone = c.status === 'pending' ? 'warning' : c.status === 'active' ? 'success' : 'neutral';
      const status = c.status === 'pending' ? 'Solicitud' : c.status === 'active' ? 'Activado' : 'Actualizado';
      items.push({ type: 'Clubes', text: `${c.name} ${verb}`, who: c.city || '—', status, tone, dot: 'var(--black)', time: relativeDay(c.joinedAt), sortKey: c.joinedAt });
    }
    for (const t of tournaments) {
      if (!t.date) continue;
      const tone: BadgeTone = t.status === 'ongoing' ? 'info' : t.status === 'completed' ? 'success' : t.status === 'cancelled' ? 'danger' : 'neutral';
      const status = t.status === 'ongoing' ? 'En curso' : t.status === 'completed' ? 'Finalizado' : t.status === 'cancelled' ? 'Cancelado' : 'Programado';
      items.push({ type: 'Torneos', text: `Torneo "${t.name}" · ${t.club || t.city}`, who: t.club || t.city || '—', status, tone, dot: 'var(--court-blue)', time: relativeDay(t.date), sortKey: t.date });
    }
    for (const ch of stripeData?.recentCharges ?? []) {
      const dateStr = new Date(ch.created).toISOString().slice(0, 10);
      const tone: BadgeTone = ch.refunded ? 'warning' : ch.status === 'succeeded' ? 'success' : 'danger';
      const status = ch.refunded ? 'Reembolsado' : ch.status === 'succeeded' ? 'Pagado' : 'Fallido';
      items.push({ type: 'Pagos', text: `Pago recibido — ${fmtMoney(ch.amount, ch.currency)}`, who: ch.email || ch.description || '—', status, tone, dot: 'var(--turf-green)', time: relativeDay(dateStr), sortKey: dateStr });
    }
    return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 40);
  }, [players, clubs, tournaments, stripeData]);

  const activityFilters = ['Todo', 'Jugadores', 'Clubes', 'Torneos', 'Pagos'];
  const activityFeed = activityFilter === 'Todo'
    ? fullActivityFeed.slice(0, 10)
    : fullActivityFeed.filter(a => a.type === activityFilter).slice(0, 10);

  // Recent players/clubs for the bottom tables.
  const recentPlayers = useMemo(() => [...players].sort((a, b) => (b.joinedAt || '').localeCompare(a.joinedAt || '')).slice(0, 6), [players]);
  const recentClubs = useMemo(() => [...clubs].sort((a, b) => (b.joinedAt || '').localeCompare(a.joinedAt || '')).slice(0, 6), [clubs]);

  if (!loaded) {
    return (
      <div style={{ padding: 40, color: 'var(--grey-400)', fontSize: 14 }}>Cargando...</div>
    );
  }

  return (
    <div style={{ padding: '26px 28px 60px', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Toasts */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: '#0a0a0a', color: '#fff', padding: '12px 20px', borderRadius: 6, fontSize: 13,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)', borderLeft: '3px solid var(--turf-green)',
          }}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>
            Panel de control
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 40, lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
            Resumen global
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grey-500)', margin: '10px 0 0', textTransform: 'capitalize' }}>
            Estado de la plataforma al {today} · todo lo que ocurre en PadelMGT en un vistazo.
          </p>
        </div>
      </div>

      {/* KPI hero */}
      <div style={{ background: 'linear-gradient(160deg, var(--court-blue-deep) 0%, #142a63 130%)', borderRadius: 20, padding: '22px 24px 24px', color: '#fff' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 18 }}>
          Métricas clave · Este mes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <HeroTile label="Usuarios activos" value={activePlayers.length} trend={newPlayersThisMonth > 0 ? `+${newPlayersThisMonth} este mes` : 'sin altas este mes'} tone={newPlayersThisMonth > 0 ? 'up' : 'flat'} />
          <HeroTile
            label="Ingresos del mes (MRR)"
            value={stripeData?.connected ? fmtMoney(stripeData.mrrCents ?? 0) : '—'}
            trend={stripeData?.connected ? (stripeData.livemode === false ? 'Stripe · modo TEST' : 'vía Stripe') : 'Stripe no conectado'}
            tone="flat"
          />
          <HeroTile label="Clubes / sedes" value={activeClubs.length} trend={`${pendingClubs.length} pendiente${pendingClubs.length !== 1 ? 's' : ''}`} tone={pendingClubs.length > 0 ? 'down' : 'flat'} />
          <HeroTile label="Ligas y torneos" value={tournaments.length} trend={ongoingTournaments > 0 ? `${ongoingTournaments} en vivo ahora` : `${tournamentsThisMonth} este mes`} tone="flat" />
          <HeroTile label="Partidos jugados" value={games.length} trend={`${tourDiff >= 0 ? '+' : ''}${tourDiff} torneos vs mes ant.`} tone={tourDiff >= 0 ? 'up' : 'down'} />
          <HeroTile label="Registros (7 días)" value={newPlayers7d} trend={newPlayers7dPrev > 0 ? `${newPlayers7d >= newPlayers7dPrev ? '+' : ''}${newPlayers7d - newPlayers7dPrev} vs semana ant.` : undefined} tone={newPlayers7d >= newPlayers7dPrev ? 'up' : 'down'} />
        </div>
      </div>

      {/* Requiere atención */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>
            Requiere atención
          </h2>
          <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>{pendingTotal + upcomingTournaments} elementos pendientes de resolución</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <AttentionCard count={pendingScoreCount} tag="Correcciones" tone="warning" label="Solicitudes de corrección" desc="Resultados y perfiles por revisar" cta="Revisar" href="/superadmin/requests" />
          <AttentionCard count={pendingClubs.length} tag="Clubes" tone="info" label="Solicitudes de clubes" desc="Nuevos clubes esperando aprobación" cta="Gestionar" href="/superadmin/clubs" />
          <AttentionCard count={upcomingTournaments} tag="Torneos" tone="neutral" label="Torneos por iniciar" desc="Programados, aún sin comenzar" cta="Ver" href="/superadmin/leagues" />
        </div>
      </div>

      {/* Actividad + panel derecho */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Actividad reciente */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', margin: 0 }}>Actividad reciente</h3>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {activityFilters.map(f => (
                <Chip key={f} active={activityFilter === f} onClick={() => setActivityFilter(f)}>{f}</Chip>
              ))}
            </div>
          </div>
          {activityFeed.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--grey-400)', padding: '32px 0', textAlign: 'center' }}>Sin actividad reciente</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Tipo', 'Detalle', 'Club / Usuario', 'Estado', 'Hora'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 4 ? 'right' : 'left', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: 'var(--grey-400)', fontWeight: 700, padding: i === 0 || i === 4 ? '10px 20px' : '10px 12px',
                      borderTop: '1px solid var(--grey-200)', borderBottom: '1px solid var(--grey-200)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activityFeed.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: r.dot }} />{r.type}
                      </span>
                    </td>
                    <td style={{ padding: '13px 12px', fontSize: 13, maxWidth: 280 }}>{r.text}</td>
                    <td style={{ padding: '13px 12px', fontSize: 13, color: 'var(--grey-500)' }}>{r.who}</td>
                    <td style={{ padding: '13px 12px' }}><Badge tone={r.tone}>{r.status}</Badge></td>
                    <td style={{ padding: '13px 20px', fontSize: 12, color: 'var(--grey-400)', textAlign: 'right', whiteSpace: 'nowrap' }}>{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Panel derecho */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Solicitudes de clubes pendientes */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 16, padding: '18px 18px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, textTransform: 'uppercase', margin: 0 }}>Clubes pendientes</h3>
              {pendingClubs.length > 0 && (
                <span style={{ background: 'var(--red-500)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{pendingClubs.length}</span>
              )}
            </div>
            {pendingClubs.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--grey-400)', padding: '16px 0', textAlign: 'center' }}>No hay solicitudes pendientes</div>
            ) : (
              pendingClubs.slice(0, 5).map(club => (
                <div key={club.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--grey-100)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
                    <Avatar name={club.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{club.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--grey-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{club.city}, {club.country}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleClubAction(club.id, 'active')} style={{ flex: 1, padding: '7px 12px', background: 'var(--turf-green)', color: '#fff', border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}>Aprobar</button>
                    <button onClick={() => handleClubAction(club.id, 'rejected')} style={{ flex: 1, padding: '7px 12px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 3, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}>Rechazar</button>
                  </div>
                </div>
              ))
            )}
            <div style={{ padding: '12px 0', textAlign: 'center' }}><a href="/superadmin/clubs" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--black)', textDecoration: 'none' }}>Administrar clubes →</a></div>
          </div>

          {/* Suscripciones de clubes */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, textTransform: 'uppercase', margin: 0 }}>Planes de clubes</h3>
              <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>{clubs.length} total</span>
            </div>
            {planGroups.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--grey-400)', textAlign: 'center', padding: '8px 0' }}>Sin clubes todavía</div>
            ) : planGroups.map(g => (
              <div key={g.plan} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color }} />{g.plan}
                  </span>
                  <span style={{ color: 'var(--grey-500)' }}>{g.count} · {g.pct}</span>
                </div>
                <div style={{ height: 7, background: 'var(--grey-100)', borderRadius: 20, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: g.width, background: g.color, borderRadius: 20 }} />
                </div>
              </div>
            ))}
            {stripeData?.connected && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>Ingreso recurrente mensual</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{fmtMoney(stripeData.mrrCents ?? 0)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stripe operations detail toggle */}
      {stripeData?.connected && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 16, padding: '20px 24px' }}>
          <button
            onClick={() => setShowStripeDetail(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--court-blue)', fontWeight: 600, padding: 0 }}
          >
            {showStripeDetail ? 'Ocultar operaciones de Stripe ▲' : 'Ver últimas operaciones de Stripe ▼'}
          </button>
          {showStripeDetail && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--court-blue)', fontWeight: 600, textDecoration: 'none' }}>
                  Abrir Stripe Dashboard ↗
                </a>
              </div>
              {(stripeData.recentCharges ?? []).length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>Sin operaciones registradas todavía.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--grey-200)' }}>
                      {['Fecha', 'Cliente', 'Monto', 'Estado'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(stripeData.recentCharges ?? []).map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap', color: 'var(--grey-500)' }}>{new Date(c.created).toLocaleString('es')}</td>
                        <td style={{ padding: '10px' }}>{c.email || c.description || '—'}</td>
                        <td style={{ padding: '10px', fontWeight: 700 }}>{fmtMoney(c.amount, c.currency)}</td>
                        <td style={{ padding: '10px' }}><Badge tone={c.refunded ? 'warning' : c.status === 'succeeded' ? 'success' : 'danger'}>{c.refunded ? 'Reembolsado' : c.status === 'succeeded' ? 'Pagado' : c.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 16, padding: '24px 28px', flex: '1 1 480px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 20 }}>
            Crecimiento de Jugadores — Últimos 6 meses
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={playerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 12 }} labelStyle={{ fontWeight: 600 }} />
              <Line type="monotone" dataKey="jugadores" stroke="#2d6a4f" strokeWidth={2.5} dot={{ fill: '#2d6a4f', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 16, padding: '24px 28px', flex: '1 1 320px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 20 }}>
            Torneos por Mes
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tournamentsPerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 12 }} />
              <Bar dataKey="torneos" fill="#2d6a4f" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clubes */}
      <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', margin: 0 }}>Clubes recientes</h3>
          <a href="/superadmin/clubs" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--black)', textDecoration: 'none' }}>Administrar clubes →</a>
        </div>
        {recentClubs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--grey-400)', padding: '24px 20px', textAlign: 'center' }}>Sin clubes todavía</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  {['Club', 'Ciudad', 'Plan', 'Miembros', 'Estado'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 3 ? 'right' : 'left', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: 'var(--grey-400)', fontWeight: 700, padding: i === 0 ? '10px 20px' : '10px 12px',
                      borderTop: '1px solid var(--grey-200)', borderBottom: '1px solid var(--grey-200)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentClubs.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <Avatar name={c.name} />
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 12px', fontSize: 13, color: 'var(--grey-500)' }}>{c.city}</td>
                    <td style={{ padding: '13px 12px' }}><Badge tone={planTone(c.plan)}>{c.plan}</Badge></td>
                    <td style={{ padding: '13px 12px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{c.members}</td>
                    <td style={{ padding: '13px 20px' }}><Badge tone={CLUB_STATUS_TONE[c.status]}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usuarios */}
      <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', margin: 0 }}>Últimos usuarios</h3>
          <a href="/superadmin/players" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--black)', textDecoration: 'none' }}>Administrar usuarios →</a>
        </div>
        {recentPlayers.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--grey-400)', padding: '24px 20px', textAlign: 'center' }}>Sin usuarios todavía</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  {['Usuario', 'Rol', 'Registro', 'Última actividad', 'Estado'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: 'left', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: 'var(--grey-400)', fontWeight: 700, padding: i === 0 ? '10px 20px' : '10px 12px',
                      borderTop: '1px solid var(--grey-200)', borderBottom: '1px solid var(--grey-200)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentPlayers.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <Avatar name={p.name} photoUrl={p.photoUrl} />
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 12px', fontSize: 13, color: 'var(--grey-600)' }}>{p.role === 'club_admin' ? 'Admin de club' : p.role === 'federation_admin' ? 'Federación' : 'Jugador'}</td>
                    <td style={{ padding: '13px 12px', fontSize: 13, color: 'var(--grey-500)' }}>{p.joinedAt || '—'}</td>
                    <td style={{ padding: '13px 12px', fontSize: 13, color: 'var(--grey-500)' }}>{p.lastActive ? relativeDay(p.lastActive) : '—'}</td>
                    <td style={{ padding: '13px 20px' }}><Badge tone={PLAYER_STATUS_TONE[p.status]}>{p.status === 'active' ? 'Activo' : p.status === 'suspended' ? 'Suspendido' : 'Bloqueado'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
