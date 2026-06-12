'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getAllGames } from '@/lib/game-store';
import { getAllTournaments } from '@/lib/tournament-store';
import type { ActiveGame, InvitedPlayer } from '@/lib/game-engine';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalendarEvent {
  id: string;
  type: 'tournament' | 'quick_game';
  name: string;
  date: string; // YYYY-MM-DD
  time?: string;
  club: string;
  city: string;
  status: string;
  code?: string;
  format?: string;
  spots?: string;
  playersWith?: string;
  gameId?: string;
  tournamentId?: string;
  isCreator?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FORMAT_LABEL: Record<string, string> = {
  americano:   'Americano',
  mexicano:    'Mexicano',
  round_robin: 'Round Robin',
  team_league: 'Team League',
  knockout:    'Knockout',
  world_cup:   'World Cup',
};

const typeColor: Record<string, string> = {
  tournament: 'var(--court-blue)',
  quick_game: '#7c3aed',
};

const typeLabel: Record<string, string> = {
  tournament: 'Torneo',
  quick_game: 'Juego Rápido',
};

const statusLabel: Record<string, { label: string; color: string }> = {
  confirmed:     { label: 'Confirmado',    color: 'var(--turf-green)' },
  enrolled:      { label: 'Inscripto',     color: 'var(--court-blue)' },
  pending:       { label: 'Por confirmar', color: '#f5a623' },
  open:          { label: 'Disponible',    color: 'var(--grey-400)' },
  live:          { label: 'En Vivo',       color: 'var(--turf-green)' },
  starting_soon: { label: 'Por Empezar',   color: '#f5a623' },
  created:       { label: 'Creado',        color: '#7c3aed' },
  finished:      { label: 'Finalizado',    color: 'var(--grey-400)' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse YYYY-MM-DD → { day, month } using UTC to avoid timezone shifts */
function parseDateParts(dateStr: string): { day: number; month: string } {
  const [, m, d] = dateStr.split('-').map(Number);
  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return { day: d, month: monthNames[m - 1] ?? '' };
}

/** Return ISO week number (Mon=1 … Sun=7) start date for a YYYY-MM-DD date */
function weekMondayStr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day); // days to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function weekLabel(mondayStr: string): string {
  const mon = new Date(mondayStr + 'T00:00:00');
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);

  const monthShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const monD = mon.getDate();
  const sunD = sun.getDate();
  const monM = monthShort[mon.getMonth()];
  const sunM = monthShort[sun.getMonth()];

  if (mon.getMonth() === sun.getMonth()) {
    return `${monD} – ${sunD} de ${monM}`;
  }
  return `${monD} ${monM} – ${sunD} ${sunM}`;
}

function getEventHref(e: CalendarEvent): string {
  if (e.type === 'quick_game') {
    if (e.isCreator) {
      return `/dashboard/player/quick-game/${e.gameId}`;
    }
    // Non-creator: go to public quick-game page
    return `/quick-game/${e.code}`;
  }
  // tournament
  if (e.isCreator) {
    return `/dashboard/player/tournaments/${e.tournamentId}`;
  }
  return `/dashboard/player/tournaments/${e.tournamentId}/view`;
}

function getEventBtnLabel(e: CalendarEvent): string {
  if (e.type === 'quick_game') return e.isCreator ? 'Gestionar' : 'Ver';
  return e.isCreator ? 'Gestionar' : 'Ver';
}

// ---------------------------------------------------------------------------
// EventRow
// ---------------------------------------------------------------------------

function EventRow({ e }: { e: CalendarEvent }) {
  const { day, month } = parseDateParts(e.date);
  const st    = statusLabel[e.status] ?? { label: e.status, color: 'var(--grey-400)' };
  const isQR  = e.type === 'quick_game' && e.status === 'created';
  const href  = getEventHref(e);
  const label = getEventBtnLabel(e);

  return (
    <div style={{ background: '#fff', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 24 }}>
      {/* Date block */}
      <div style={{ background: typeColor[e.type], padding: '14px 16px', minWidth: 64, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{day}</div>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{month}</div>
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
          {e.playersWith && <span> · {e.playersWith}</span>}
          {e.format && <span> · {e.format}</span>}
          {e.spots && <span> · {e.spots} jugadores</span>}
        </div>
      </div>

      {/* Status + action */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 8 }}>
          {e.status === 'live' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
          <span style={{ fontSize: 12, fontWeight: 600, color: st.color }}>{st.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          {isQR && e.code && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', letterSpacing: '0.08em' }}>{e.code}</span>
          )}
          <Link href={href} className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>{label}</Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PlayerCalendarPage() {
  const { user } = useCurrentUser();
  const [filter,   setFilter]   = useState('Todos');
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');
  const [events,   setEvents]   = useState<CalendarEvent[]>([]);
  const [tournamentsCount, setTournamentsCount] = useState(0);
  const [quickGamesCount,  setQuickGamesCount]  = useState(0);

  useEffect(() => {
    const userId = user?.id ?? '';
    const calEvents: CalendarEvent[] = [];

    // ── Quick games ──────────────────────────────────────────────────────────
    const allGames = getAllGames();
    const myGames = allGames.filter((g: ActiveGame) => {
      if (g.cancelledAt) return false;
      const isCreator   = g.creatorId === userId;
      const isConfirmed = (g.players ?? []).some((p) => p.id === userId);
      const isInvited   = (g.invitedPlayers ?? []).some((p: InvitedPlayer) => p.id === userId);
      return isCreator || isConfirmed || isInvited;
    });

    for (const g of myGames) {
      const invited = g.invitedPlayers ?? [];
      const isInvitedPending = invited.some(
        (p: InvitedPlayer) => p.id === userId && p.status === 'pending',
      );
      const calStatus = isInvitedPending ? 'pending' : g.status;
      const isCreator = g.creatorId === userId;

      const confirmedOthers = (g.players ?? [])
        .filter((p) => p.id !== userId)
        .map((p) => p.name);
      const pendingCount = invited.filter(
        (p: InvitedPlayer) => p.status === 'pending' && p.id !== userId,
      ).length;
      const playersWith = [
        ...confirmedOthers,
        ...(pendingCount > 0 ? [`+${pendingCount} por confirmar`] : []),
      ].join(', ') || undefined;

      calEvents.push({
        id:        g.id,
        type:      'quick_game',
        name:      g.name,
        date:      g.date,
        time:      g.time,
        club:      g.club,
        city:      g.city,
        status:    calStatus,
        code:      g.code,
        format:    FORMAT_LABEL[g.format] ?? g.format,
        playersWith,
        gameId:    g.id,
        isCreator,
      });
    }

    // ── Tournaments ──────────────────────────────────────────────────────────
    const allTournaments = getAllTournaments();
    const myTournaments = allTournaments.filter((t) => {
      if (t.cancelledAt) return false;
      const isCreator   = t.creatorId === userId;
      const isConfirmed = (t.players ?? []).some((p) => p.id === userId);
      const isInvited   = (t.invitedPlayers ?? []).some((p: InvitedPlayer) => p.id === userId);
      return isCreator || isConfirmed || isInvited;
    });

    for (const t of myTournaments) {
      const invited = t.invitedPlayers ?? [];
      const isInvitedPending = invited.some(
        (p: InvitedPlayer) => p.id === userId && p.status === 'pending',
      );
      const isConfirmedPlayer = (t.players ?? []).some((p) => p.id === userId);
      const isCreator = t.creatorId === userId;

      let calStatus: string;
      if (isInvitedPending) {
        calStatus = 'pending';
      } else if (isConfirmedPlayer && t.status === 'created') {
        calStatus = 'enrolled';
      } else {
        calStatus = t.status;
      }

      calEvents.push({
        id:           t.id,
        type:         'tournament',
        name:         t.name,
        date:         t.date,
        time:         t.time ?? undefined,
        club:         t.club,
        city:         t.city,
        status:       calStatus,
        format:       FORMAT_LABEL[t.format] ?? t.format,
        spots:        `${(t.players ?? []).length}/${t.maxPlayers}`,
        tournamentId: t.id,
        isCreator,
      });
    }

    // Sort by date ascending
    calEvents.sort((a, b) => a.date.localeCompare(b.date));

    setEvents(calEvents);
    setTournamentsCount(myTournaments.length);
    setQuickGamesCount(myGames.length);
  }, [user]);

  const filtered = events.filter((e) => {
    if (filter === 'Todos')          return true;
    if (filter === 'Torneos')        return e.type === 'tournament';
    if (filter === 'Juegos Rápidos') return e.type === 'quick_game';
    return false;
  });

  // Group by week for weekly view
  const byWeek = filtered.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    const key = weekMondayStr(e.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  // Sorted week keys
  const weekKeys = Object.keys(byWeek).sort();

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
          { label: 'Torneos inscripto',  value: String(tournamentsCount) },
          { label: 'Juegos de liga',   value: '0' },
          { label: 'Juegos Rápidos',     value: String(quickGamesCount), color: '#7c3aed' },
          { label: 'Juegos amistosos', value: '0' },
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
          {filtered.map((e) => <EventRow key={e.id} e={e} />)}
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
          {weekKeys.map((wk) => {
            const weekEvents = byWeek[wk] ?? [];
            if (weekEvents.length === 0) return null;
            return (
              <div key={wk}>
                {/* Week header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', flexShrink: 0 }}>{weekLabel(wk)}</div>
                  <div style={{ flex: 1, height: 1, background: 'var(--grey-200)' }} />
                  <span style={{ fontSize: 10, color: 'var(--grey-400)' }}>{weekEvents.length} evento{weekEvents.length > 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
                  {weekEvents.map((e) => <EventRow key={e.id} e={e} />)}
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
