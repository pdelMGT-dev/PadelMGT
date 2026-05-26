'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getSAStats, getSAClubs, saveSAClubs, type SAStats, type SAClub } from '@/lib/superadmin-data';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
const PLAYER_GROWTH = [42, 58, 71, 89, 104, 127].map((v, i) => ({ mes: MONTHS[i], jugadores: v }));
const TORNEOS_MES = [1, 2, 3, 2, 4, 3].map((v, i) => ({ mes: MONTHS[i], torneos: v }));

const ACTIVITY_FEED = [
  { text: 'Carlos Rodríguez se registró como nuevo jugador', time: 'Hace 5 min' },
  { text: 'Club Padel Madrid solicitó aprobación', time: 'Hace 18 min' },
  { text: 'Open Barcelona Padel ha comenzado', time: 'Hace 1 h' },
  { text: 'Lucía Fernández completó su perfil', time: 'Hace 2 h' },
  { text: 'Nueva solicitud de corrección de score en Torneo Primavera', time: 'Hace 3 h' },
  { text: 'Pablo López fue bloqueado por comportamiento inapropiado', time: 'Hace 4 h' },
  { text: 'Costa Padel Alicante actualizó información del club', time: 'Hace 6 h' },
  { text: 'Juego rápido en Madrid finalizado — 8 jugadores', time: 'Hace 8 h' },
  { text: 'Ana Sánchez cambió su ranking a 820 pts', time: 'Hace 10 h' },
  { text: 'Copa Valencia programada para el 5 de Junio', time: 'Hace 12 h' },
];

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

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<SAStats | null>(null);
  const [pendingClubs, setPendingClubs] = useState<SAClub[]>([]);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string }>>([]);
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    setStats(getSAStats());
    const clubs = getSAClubs();
    setPendingClubs(clubs.filter(c => c.status === 'pending'));
  }, []);

  function toast(msg: string) {
    const id = Date.now();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  function handleClubAction(clubId: string, action: 'active' | 'rejected') {
    const all = getSAClubs();
    const updated = all.map(c => c.id === clubId ? { ...c, status: action } : c);
    saveSAClubs(updated);
    setPendingClubs(updated.filter(c => c.status === 'pending'));
    toast(action === 'active' ? 'Club aprobado correctamente' : 'Club rechazado');
  }

  if (!stats) {
    return (
      <div style={{ padding: 40, color: 'var(--grey-400)', fontSize: 14 }}>Cargando...</div>
    );
  }

  const tourDiff = stats.tournamentsThisMonth - stats.tournamentsLastMonth;

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
          value={stats.totalPlayers}
          sub={`+${stats.growthPercent}% este mes`}
        />
        <KPICard
          label="Clubes Activos"
          value={stats.totalClubs}
          sub={`${stats.pendingClubRequests} pendiente${stats.pendingClubRequests !== 1 ? 's' : ''}`}
        />
        <KPICard
          label="Torneos este Mes"
          value={stats.tournamentsThisMonth}
          sub={`${tourDiff >= 0 ? '▲' : '▼'} ${Math.abs(tourDiff)} vs mes anterior`}
        />
        <KPICard
          label="Solicitudes Pendientes"
          value={stats.pendingClubRequests + stats.pendingScoreRequests}
          sub="Clubes + score"
          highlight={stats.pendingClubRequests + stats.pendingScoreRequests > 0}
        />
      </div>

      {/* KPI Row 2 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        {/* NPS */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--grey-200)',
          borderRadius: 6,
          padding: '24px 28px',
          flex: 1,
          minWidth: 180,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 10 }}>
            NPS Score
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-display)', color: stats.nps >= 70 ? 'var(--turf-green)' : stats.nps >= 50 ? '#f59e0b' : '#dc2626' }}>
            {stats.nps} / 100
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 6 }}>
            {stats.nps >= 70 ? 'Excelente' : stats.nps >= 50 ? 'Bueno' : 'Mejorable'}
          </div>
        </div>

        {/* Retention */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--grey-200)',
          borderRadius: 6,
          padding: '24px 28px',
          flex: 1,
          minWidth: 180,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--grey-400)', textTransform: 'uppercase', marginBottom: 10 }}>
            Retencion de Usuarios
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>
            {stats.retentionRate}%
          </div>
          <div style={{
            marginTop: 10,
            height: 6,
            background: 'var(--grey-100)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${stats.retentionRate}%`,
              height: '100%',
              background: 'var(--turf-green)',
              borderRadius: 3,
            }} />
          </div>
        </div>

        {/* Revenue */}
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
          <div style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--grey-400)' }}>
            €{stats.monthlyRevenue}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 6, fontStyle: 'italic' }}>
            Stripe no conectado
          </div>
        </div>
      </div>

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
            <LineChart data={PLAYER_GROWTH}>
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
            <BarChart data={TORNEOS_MES}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {ACTIVITY_FEED.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '10px 0',
                borderBottom: i < ACTIVITY_FEED.length - 1 ? '1px solid var(--grey-100)' : 'none',
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
