'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  getSAPlayersFromSupabase, getSAClubsFromSupabase, getSATournamentsFromSupabase,
  saveSAClubs, upsertSAClubToSupabase,
  type SAClub, type SAPlayer, type SATournament,
} from '@/lib/superadmin-data';
import { fetchCorrectionsFromSupabase } from '@/lib/score-correction-store';

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

interface ActivityItem { text: string; time: string; sortKey: string }

function KPICard({
  label, value, sub, highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--grey-200)',
      borderRadius: 6,
      padding: '24px 28px',
      flex: 1,
      minWidth: 180,
      borderTop: highlight ? '3px solid #dc2626' : '3px solid var(--turf-green)',
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.14em',
        color: 'var(--grey-400)',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 34,
        fontWeight: 700,
        color: highlight ? '#dc2626' : 'var(--black)',
        fontFamily: 'var(--font-display)',
        lineHeight: 1,
        marginBottom: 6,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>{sub}</div>
      )}
    </div>
  );
}

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

export default function SuperAdminDashboard() {
  const [players, setPlayers] = useState<SAPlayer[]>([]);
  const [clubs, setClubs] = useState<SAClub[]>([]);
  const [tournaments, setTournaments] = useState<SATournament[]>([]);
  const [pendingScoreCount, setPendingScoreCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string }>>([]);
  const [stripeData, setStripeData] = useState<StripeSummary | null>(null);
  const [showStripeDetail, setShowStripeDetail] = useState(false);
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    let alive = true;
    Promise.all([
      getSAPlayersFromSupabase(),
      getSAClubsFromSupabase(),
      getSATournamentsFromSupabase(),
      fetchCorrectionsFromSupabase().catch(() => []),
    ]).then(([sbPlayers, sbClubs, sbTournaments, corrections]) => {
      if (!alive) return;
      setPlayers(sbPlayers ?? []);
      setClubs(sbClubs ?? []);
      setTournaments(sbTournaments ?? []);
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

  const activeClubs = clubs.filter(c => c.status === 'active');
  const pendingClubs = clubs.filter(c => c.status === 'pending');

  const newPlayersThisMonth = players.filter(p => {
    const ym = ymOf(p.joinedAt);
    return ym && ym.year === thisY && ym.month === thisM;
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

  // Real activity feed: recent registrations, club requests and tournaments.
  const activityFeed = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const p of players) {
      if (!p.joinedAt) continue;
      items.push({ text: `${p.name} se registró como nuevo jugador`, time: relativeDay(p.joinedAt), sortKey: p.joinedAt });
    }
    for (const c of clubs) {
      if (!c.joinedAt) continue;
      const verb = c.status === 'pending' ? 'solicitó aprobación'
        : c.status === 'active' ? 'se unió a la plataforma'
        : 'actualizó su estado';
      items.push({ text: `${c.name} ${verb}`, time: relativeDay(c.joinedAt), sortKey: c.joinedAt });
    }
    for (const t of tournaments) {
      if (!t.date) continue;
      items.push({ text: `Torneo "${t.name}" programado`, time: relativeDay(t.date), sortKey: t.date });
    }
    return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 10);
  }, [players, clubs, tournaments]);

  if (!loaded) {
    return (
      <div style={{ padding: 40, color: 'var(--grey-400)', fontSize: 14 }}>Cargando...</div>
    );
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, fontFamily: 'var(--font-body)' }}>
      {/* Toasts */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: '#0a0a0a',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 6,
            fontSize: 13,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            borderLeft: '3px solid var(--turf-green)',
          }}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 6 }}>
            Panel de control
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
            Dashboard
          </h1>
        </div>
        <div style={{ fontSize: 12, color: 'var(--grey-400)', textAlign: 'right', textTransform: 'capitalize' }}>
          {today}
        </div>
      </div>

      {/* KPI Row 1 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <KPICard
          label="Jugadores Registrados"
          value={players.length}
          sub={newPlayersThisMonth > 0 ? `+${newPlayersThisMonth} este mes` : 'Sin altas este mes'}
        />
        <KPICard
          label="Clubes Activos"
          value={activeClubs.length}
          sub={`${pendingClubs.length} pendiente${pendingClubs.length !== 1 ? 's' : ''}`}
        />
        <KPICard
          label="Torneos este Mes"
          value={tournamentsThisMonth}
          sub={`${tourDiff >= 0 ? '▲' : '▼'} ${Math.abs(tourDiff)} vs mes anterior`}
        />
        <KPICard
          label="Solicitudes Pendientes"
          value={pendingTotal}
          sub="Clubes + score"
          highlight={pendingTotal > 0}
        />
      </div>

      {/* KPI Row 2 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        {/* Active subscriptions (live from Stripe) */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--grey-200)',
          borderRadius: 6,
          padding: '24px 28px',
          flex: 1,
          minWidth: 180,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 10 }}>
            Suscripciones Activas
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>
            {stripeData?.connected ? (stripeData.activeSubscriptions ?? 0) : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 6 }}>
            {stripeData?.connected
              ? (stripeData.livemode === false ? 'Stripe · modo TEST' : 'Vía Stripe')
              : 'Consultando Stripe…'}
          </div>
        </div>

        {/* Total tournaments (real) */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--grey-200)',
          borderRadius: 6,
          padding: '24px 28px',
          flex: 1,
          minWidth: 180,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 10 }}>
            Torneos Totales
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>
            {tournaments.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 6 }}>
            {tournamentsThisMonth} este mes
          </div>
        </div>

        {/* Revenue (live from Stripe) */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--grey-200)',
          borderRadius: 6,
          padding: '24px 28px',
          flex: 1,
          minWidth: 180,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 10 }}>
            Ingresos Mensuales
          </div>
          {stripeData?.connected ? (
            <>
              <div style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>
                {fmtMoney(stripeData.monthRevenueCents ?? 0)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 6 }}>
                MRR {fmtMoney(stripeData.mrrCents ?? 0)} · {stripeData.activeSubscriptions ?? 0} suscripciones
                {stripeData.livemode === false && <span style={{ color: '#b45309' }}> · modo TEST</span>}
              </div>
              <button
                onClick={() => setShowStripeDetail(v => !v)}
                style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--court-blue)', fontWeight: 600, padding: 0 }}
              >
                {showStripeDetail ? 'Ocultar detalle ▲' : 'Ver detalle de operaciones ▼'}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--grey-400)' }}>
                —
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 6, fontStyle: 'italic' }}>
                {stripeData === null ? 'Consultando Stripe…' : 'Stripe no conectado (configurá STRIPE_SECRET_KEY)'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stripe operations detail */}
      {showStripeDetail && stripeData?.connected && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', borderRadius: 6, padding: '24px 28px', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase' }}>
              Últimas operaciones (Stripe)
            </div>
            <a
              href="https://dashboard.stripe.com/payments"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--court-blue)', fontWeight: 600, textDecoration: 'none' }}
            >
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
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: c.refunded ? '#fef3c7' : c.status === 'succeeded' ? 'rgba(30,170,82,0.12)' : '#fee2e2',
                        color: c.refunded ? '#92400e' : c.status === 'succeeded' ? 'var(--turf-green)' : '#dc2626',
                      }}>
                        {c.refunded ? 'Reembolsado' : c.status === 'succeeded' ? 'Pagado' : c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <div style={{
          background: '#fff',
          border: '1px solid var(--grey-200)',
          borderRadius: 6,
          padding: '24px 28px',
          flex: '0 0 60%',
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 20 }}>
            Crecimiento de Jugadores — Ultimos 6 meses
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={playerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="jugadores"
                stroke="#2d6a4f"
                strokeWidth={2.5}
                dot={{ fill: '#2d6a4f', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid var(--grey-200)',
          borderRadius: 6,
          padding: '24px 28px',
          flex: '0 0 calc(40% - 16px)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 20 }}>
            Torneos por Mes
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tournamentsPerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ border: '1px solid var(--grey-200)', borderRadius: 4, fontSize: 12 }}
              />
              <Bar dataKey="torneos" fill="#2d6a4f" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom section */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Activity feed */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--grey-200)',
          borderRadius: 6,
          padding: '24px 28px',
          flex: '0 0 55%',
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 20 }}>
            Actividad Reciente
          </div>
          {activityFeed.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--grey-400)', padding: '16px 0', textAlign: 'center' }}>
              Sin actividad reciente
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {activityFeed.map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '10px 0',
                  borderBottom: i < activityFeed.length - 1 ? '1px solid var(--grey-100)' : 'none',
                }}>
                  <div style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--turf-green)',
                    flexShrink: 0,
                    marginTop: 5,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--black)', lineHeight: 1.4 }}>{item.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 2 }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending clubs */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--grey-200)',
          borderRadius: 6,
          padding: '24px 28px',
          flex: 1,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 20 }}>
            Solicitudes de Clubes Pendientes
          </div>
          {pendingClubs.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--grey-400)', padding: '16px 0', textAlign: 'center' }}>
              No hay solicitudes pendientes
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingClubs.map(club => (
                <div key={club.id} style={{
                  padding: '14px 16px',
                  border: '1px solid var(--grey-200)',
                  borderRadius: 4,
                  background: '#fafafa',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{club.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 10 }}>
                    {club.city}, {club.country} — {club.adminEmail}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleClubAction(club.id, 'active')}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        background: 'var(--turf-green)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 3,
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                      }}
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleClubAction(club.id, 'rejected')}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        background: 'transparent',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: 3,
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                      }}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
