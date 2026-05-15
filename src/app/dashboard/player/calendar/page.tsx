'use client';

import Link from 'next/link';
import { useState } from 'react';

const events = [
  { day: 14, month: 'May', weekKey: 'w1', name: 'Express Nocturno',       type: 'quick_game',  with: 'Ana R., Marcos H., Carlos V.',       club: 'Padel Arena',       city: 'Buenos Aires', time: '20:00', status: 'live',         code: 'JR-2026-3841', gameId: 'g1' },
  { day: 15, month: 'May', weekKey: 'w1', name: 'Juego Rápido Tarde',     type: 'quick_game',  with: 'Sofía L., Diego F., Laura T.',        club: 'Club Barrio Norte', city: 'Buenos Aires', time: '17:00', status: 'starting_soon', code: 'JR-2026-5519', gameId: 'g2' },
  { day: 17, month: 'May', weekKey: 'w1', name: 'Mexicano del Club',      type: 'tournament',  format: 'Mexicano',                          club: 'Club La Cantera',   city: 'Córdoba',      time: '10:00', status: 'enrolled',      spots: '6/8',         tournamentId: 'da05effb-cada-4351-8946-b27ecf0c4961' },
  { day: 20, month: 'May', weekKey: 'w2', name: 'Juego del Sábado',       type: 'quick_game',  with: 'Ana R., Marcos H. + 2 por confirmar', club: 'Club Barrio Norte', city: 'Buenos Aires', time: '11:00', status: 'created',       code: 'JR-2026-4827', gameId: 'g3' },
  { day: 20, month: 'May', weekKey: 'w2', name: 'Liga Premier LATAM – J9',type: 'league',      format: 'Round Robin',                       club: 'Sede Central',     city: 'Buenos Aires', time: '18:00', status: 'confirmed' },
  { day: 24, month: 'May', weekKey: 'w2', name: 'Express Saturday',       type: 'tournament',  format: 'Americano',                         club: 'Club Caribe',       city: 'Cartagena',    time: '09:00', status: 'enrolled',      spots: '3/8',         tournamentId: 'da05effb-cada-4351-8946-b27ecf0c4961' },
  { day: 25, month: 'May', weekKey: 'w3', name: 'Swiss Open Santiago',    type: 'tournament',  format: 'Swiss',                             club: 'Padel Santiago',    city: 'Santiago',     time: '09:00', status: 'enrolled',      spots: '12/32',       tournamentId: 'da05effb-cada-4351-8946-b27ecf0c4961' },
  { day: 28, month: 'May', weekKey: 'w3', name: 'Copa Federación – Final',type: 'tournament',  format: 'Knockout',                          club: 'Arena Nacional',    city: 'Buenos Aires', time: '14:00', status: 'pending',        tournamentId: 'da05effb-cada-4351-8946-b27ecf0c4961' },
  { day: 1,  month: 'Jun', weekKey: 'w4', name: 'Abierto Junio Americano',type: 'tournament',  format: 'Americano',                         club: 'Club Central',      city: 'Buenos Aires', time: '10:00', status: 'open',           spots: '8/16',        tournamentId: 'da05effb-cada-4351-8946-b27ecf0c4961' },
];

const WEEKS: Record<string, string> = {
  w1: '11 – 17 de Mayo',
  w2: '18 – 24 de Mayo',
  w3: '25 – 31 de Mayo',
  w4: '1 – 7 de Junio',
};

const typeColor: Record<string, string> = {
  tournament: 'var(--court-blue)',
  league:     'var(--turf-green)',
  quick_game: '#7c3aed',
  game:       'var(--black)',
};

const typeLabel: Record<string, string> = {
  tournament: 'Torneo', league: 'Liga', quick_game: 'Juego Rápido', game: 'Amistoso',
};

const statusLabel: Record<string, { label: string; color: string }> = {
  confirmed:     { label: 'Confirmado',    color: 'var(--turf-green)' },
  enrolled:      { label: 'Inscripto',     color: 'var(--court-blue)' },
  pending:       { label: 'Por confirmar', color: '#f5a623' },
  open:          { label: 'Disponible',    color: 'var(--grey-400)' },
  live:          { label: 'En Vivo',       color: 'var(--turf-green)' },
  starting_soon: { label: 'Por Empezar',   color: '#f5a623' },
  created:       { label: 'Creado',        color: '#7c3aed' },
};

function getEventHref(e: typeof events[0]): string {
  if (e.type === 'quick_game') {
    const gid = (e as any).gameId;
    if (e.status === 'live' || e.status === 'starting_soon') return `/dashboard/player/quick-game/${gid}`;
    return `/dashboard/player/quick-game/${gid}/edit`;
  }
  if (e.type === 'tournament') {
    const tid = (e as any).tournamentId;
    return tid ? `/tournaments/detail/${tid}` : '/tournaments';
  }
  if (e.type === 'league') return '/dashboard/player/ranking';
  return '/dashboard/player/quick-game';
}

function getEventBtnLabel(e: typeof events[0]): string {
  if (e.type === 'quick_game') {
    if (e.status === 'live') return 'Ver Partido';
    if (e.status === 'starting_soon') return 'Ver Partido';
    return 'Gestionar';
  }
  return 'Ver';
}

function EventRow({ e }: { e: typeof events[0] }) {
  const st    = statusLabel[e.status] ?? { label: e.status, color: 'var(--grey-400)' };
  const isQR  = e.type === 'quick_game' && (e.status === 'created');
  const href  = getEventHref(e);
  const label = getEventBtnLabel(e);

  return (
    <div style={{ background: '#fff', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 24 }}>
      {/* Date block */}
      <div style={{ background: typeColor[e.type], padding: '14px 16px', minWidth: 64, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{e.day}</div>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{e.month}</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)' }}>{e.name}</div>
          <span className="chip" style={{ fontSize: 9, background: typeColor[e.type] + '22', color: typeColor[e.type] }}>{typeLabel[e.type]}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>
          {e.time && <span>{e.time} · </span>}
          {e.club}{e.city ? `, ${e.city}` : ''}
          {(e as any).with && <span> · {(e as any).with}</span>}
          {(e as any).format && <span> · {(e as any).format}</span>}
          {(e as any).spots && <span> · {(e as any).spots} jugadores</span>}
        </div>
      </div>

      {/* Status + action */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 8 }}>
          {e.status === 'live' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
          <span style={{ fontSize: 12, fontWeight: 600, color: st.color }}>{st.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          {isQR && (e as any).code && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', letterSpacing: '0.08em' }}>{(e as any).code}</span>
          )}
          <Link href={href} className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>{label}</Link>
        </div>
      </div>
    </div>
  );
}

export default function PlayerCalendarPage() {
  const [filter,   setFilter]   = useState('Todos');
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');

  const filtered = events.filter((e) => {
    if (filter === 'Todos')          return true;
    if (filter === 'Torneos')        return e.type === 'tournament';
    if (filter === 'Ligas')          return e.type === 'league';
    if (filter === 'Juegos Rápidos') return e.type === 'quick_game';
    return e.type === 'game';
  });

  const quickGames = events.filter(e => e.type === 'quick_game').length;

  // Group by week for weekly view
  const byWeek = filtered.reduce<Record<string, typeof events>>((acc, e) => {
    const key = e.weekKey;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Próximas fechas</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MI CALENDARIO</h1>
        </div>
        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: 1, background: 'var(--grey-200)' }}>
          {(['list', 'week'] as const).map((m) => (
            <button key={m} onClick={() => setViewMode(m)} style={{ padding: '9px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', cursor: 'pointer', background: viewMode === m ? 'var(--black)' : '#fff', color: viewMode === m ? '#fff' : 'var(--grey-500)' }}>
              {m === 'list' ? '≡ Lista' : '⊞ Semana'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Torneos inscripto',  value: '3' },
          { label: 'Partidos de liga',   value: '1' },
          { label: 'Juegos Rápidos',     value: String(quickGames), color: '#7c3aed' },
          { label: 'Partidos amistosos', value: '0' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: s.color || 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Todos', 'Torneos', 'Ligas', 'Juegos Rápidos', 'Amistosos'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`pill-tab${filter === f ? ' active' : ''}`}>{f}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard/player/quick-game" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>+ Juego Rápido</Link>
          <Link href="/tournaments" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>+ Torneo</Link>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
          {filtered.map((e, i) => <EventRow key={i} e={e} />)}
          {filtered.length === 0 && (
            <div style={{ background: '#fff', padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              No hay eventos con el filtro seleccionado.
            </div>
          )}
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {viewMode === 'week' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {Object.keys(WEEKS).map((wk) => {
            const weekEvents = byWeek[wk] || [];
            if (weekEvents.length === 0) return null;
            return (
              <div key={wk}>
                {/* Week header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', flexShrink: 0 }}>{WEEKS[wk]}</div>
                  <div style={{ flex: 1, height: 1, background: 'var(--grey-200)' }} />
                  <span style={{ fontSize: 10, color: 'var(--grey-400)' }}>{weekEvents.length} evento{weekEvents.length > 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
                  {weekEvents.map((e, i) => <EventRow key={i} e={e} />)}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              No hay eventos con el filtro seleccionado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
