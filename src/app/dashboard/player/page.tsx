'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAllGames, getGame, saveGame } from '@/lib/game-store';
import type { ActiveGame } from '@/lib/game-engine';
import {
  getPendingInvitationsForPlayer,
  respondToInvitation,
  type Invitation,
} from '@/lib/invitation-store';
import { addFriendship } from '@/lib/player-store';
import { getPendingRequestsFor, acceptFriendRequest, rejectFriendRequest, type FriendRequest } from '@/lib/friend-request-store';
import { getTournament, saveTournament } from '@/lib/tournament-store';
import {
  getMatchHistoryForPlayer,
  getNextEventForPlayer,
  getActiveEventsForPlayer,
  type MatchEntry,
  type UpcomingEvent,
} from '@/lib/match-history';

type CurrentUser = { id: string; name: string; email: string; shortId?: string; role: string; sub?: string; firstLogin?: boolean };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  created:       { label: 'Inscripto',     color: 'var(--grey-400)' },
  starting_soon: { label: 'Por comenzar',  color: '#f5a623' },
  live:          { label: 'En juego',       color: 'var(--turf-green)' },
};

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

const friends = [
  { name: 'Ana Rodríguez', ranking: '#52', activity: 'Ganó su partido hace 2h' },
  { name: 'Carlos Vega', ranking: '#38', activity: 'Se inscribió a Open Knockout' },
  { name: 'Marcos Herrera', ranking: '#61', activity: 'Nuevo ranking personal' },
];

export default function PlayerHomePage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [myActiveEvents, setMyActiveEvents] = useState<ReturnType<typeof getActiveEventsForPlayer>>([]);
  const [nextEvent, setNextEvent] = useState<UpcomingEvent | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchEntry[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [showProfileReminder, setShowProfileReminder] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (raw) {
        const u = JSON.parse(raw) as CurrentUser;
        setCurrentUser(u);
        setFriendRequests(getPendingRequestsFor(u.id));
        if (u.firstLogin) {
          setShowProfileReminder(true);
          // Clear firstLogin flag so reminder only shows once per session
          const updated = { ...u, firstLogin: false };
          localStorage.setItem('padelmgt_user', JSON.stringify(updated));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id;
    setMyActiveEvents(getActiveEventsForPlayer(uid));
    setNextEvent(getNextEventForPlayer(uid));
    setRecentMatches(getMatchHistoryForPlayer(uid).slice(0, 10));
    setPendingInvitations(getPendingInvitationsForPlayer(uid));
  }, [currentUser]);

  async function handleAccept(inv: Invitation) {
    if (!currentUser) return;
    respondToInvitation(inv.id, 'accepted');
    const game = getGame(inv.gameId);
    if (game) {
      const updatedInvitedPlayers = game.invitedPlayers.map(ip =>
        ip.id === currentUser.id ? { ...ip, status: 'accepted' as const } : ip
      );
      const alreadyInPlayers = game.players.some(p => p.id === currentUser.id);
      const updatedPlayers = alreadyInPlayers ? game.players : [
        ...game.players,
        { id: currentUser.id, name: currentUser.name, ranking: 1000, isCreator: false, email: currentUser.email, shortId: currentUser.shortId },
      ];
      const updatedGame = { ...game, invitedPlayers: updatedInvitedPlayers, players: updatedPlayers };
      saveGame(updatedGame);
      if (game.creatorId) addFriendship(currentUser.id, game.creatorId);
      setMyActiveEvents(getActiveEventsForPlayer(currentUser.id));
    } else {
      const tournament = getTournament(inv.gameId);
      if (tournament) {
        const updatedInvitedPlayers = (tournament.invitedPlayers ?? []).map(ip =>
          ip.id === currentUser.id ? { ...ip, status: 'accepted' as const } : ip
        );
        const alreadyConfirmed = tournament.players.some(p => p.id === currentUser.id);
        const updatedPlayers = alreadyConfirmed ? tournament.players : [
          ...tournament.players,
          { id: currentUser.id, name: currentUser.name, ranking: 1000, isCreator: false, email: currentUser.email, shortId: currentUser.shortId ?? '' },
        ];
        saveTournament({ ...tournament, invitedPlayers: updatedInvitedPlayers, players: updatedPlayers });
        if (tournament.creatorId) addFriendship(currentUser.id, tournament.creatorId);
        setMyActiveEvents(getActiveEventsForPlayer(currentUser.id));
      }
    }
    setPendingInvitations(prev => prev.filter(i => i.id !== inv.id));
    showToast(`Aceptaste la invitación a ${inv.gameName}`);
  }

  function handleReject(inv: Invitation) {
    if (!currentUser) return;
    respondToInvitation(inv.id, 'rejected');
    const game = getGame(inv.gameId);
    if (game) {
      saveGame({ ...game, invitedPlayers: game.invitedPlayers.map(ip => ip.id === currentUser.id ? { ...ip, status: 'rejected' as const } : ip) });
    } else {
      const tournament = getTournament(inv.gameId);
      if (tournament) {
        saveTournament({ ...tournament, invitedPlayers: (tournament.invitedPlayers ?? []).map(ip => ip.id === currentUser.id ? { ...ip, status: 'rejected' as const } : ip) });
      }
    }
    setPendingInvitations(prev => prev.filter(i => i.id !== inv.id));
    showToast(`Rechazaste la invitación a ${inv.gameName}`);
  }

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'var(--black)', color: '#fff', padding: '12px 24px', fontSize: 13, fontWeight: 600, zIndex: 9999, pointerEvents: 'none', letterSpacing: '0.04em' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Bienvenido de vuelta</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.95, margin: 0 }}>
          HOLA,<br /><span style={{ color: 'var(--court-blue)' }}>{currentUser ? currentUser.name.split(' ')[0].toUpperCase() : 'JUGADOR'}.</span>
        </h1>
      </div>

      {/* Profile completion reminder (first login) */}
      {showProfileReminder && (
        <div style={{ background: 'var(--neon)', padding: '16px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: 'var(--black)', marginBottom: 2 }}>¡Bienvenido a PadelMGT! 🎾</div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>Terminá de configurar tu perfil para sacar el máximo provecho de la plataforma.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href="/dashboard/player/profile" style={{ padding: '10px 20px', background: 'var(--black)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Completar perfil →
            </Link>
            <button onClick={() => setShowProfileReminder(false)}
              style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.12)', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--black)' }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Solicitudes de amistad pendientes */}
      {friendRequests.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #fcd34d', marginBottom: 24 }}>
          <div style={{ padding: '12px 20px', background: '#fffbeb', borderBottom: '1px solid #fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: '#92400e' }}>Solicitudes de Amistad</span>
              <span style={{ fontSize: 11, background: '#ee0005', color: '#fff', fontWeight: 800, padding: '2px 7px', lineHeight: 1.5 }}>{friendRequests.length}</span>
            </div>
            <Link href="/dashboard/player/friends?tab=requests" style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ver todas →</Link>
          </div>
          {friendRequests.slice(0, 3).map(req => (
            <div key={req.id} style={{ padding: '14px 20px', borderBottom: '1px solid #fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{req.fromName}</span>
                <span style={{ fontSize: 12, color: 'var(--grey-400)', marginLeft: 8 }}>quiere ser tu amigo</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => { acceptFriendRequest(req.id); setFriendRequests(prev => prev.filter(r => r.id !== req.id)); showToast(`¡Ahora sos amigo de ${req.fromName}!`); }}
                  style={{ padding: '6px 14px', background: 'var(--turf-green)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>✓ Aceptar</button>
                <button onClick={() => { rejectFriendRequest(req.id); setFriendRequests(prev => prev.filter(r => r.id !== req.id)); }}
                  style={{ padding: '6px 14px', background: '#fff', border: '1px solid var(--grey-200)', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: 'var(--grey-500)' }}>Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invitaciones Pendientes */}
      {pendingInvitations.length > 0 && (
        <div style={{ background: '#fff', border: '2px solid var(--neon)', marginBottom: 32 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--black)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--neon)' }}>Invitaciones Pendientes</div>
            <span style={{ fontSize: 11, background: 'var(--neon)', color: 'var(--black)', fontWeight: 800, padding: '2px 7px', lineHeight: 1.5 }}>{pendingInvitations.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pendingInvitations.map((inv) => (
              <div key={inv.id} style={{ padding: '18px 24px', borderBottom: '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--black)', marginBottom: 4 }}>{inv.gameName}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4 }}>{inv.gameDate} · {inv.gameTime} · {inv.gameClub}, {inv.gameCity}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>Invitado por <span style={{ fontWeight: 600, color: 'var(--black)' }}>{inv.fromPlayerName}</span></div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleAccept(inv)} style={{ padding: '8px 16px', background: 'var(--turf-green)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>✓ Aceptar</button>
                  <button onClick={() => handleReject(inv)} style={{ padding: '8px 16px', background: '#ee0005', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>✗ Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats (mock — visual only) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Torneos jugados', value: '24', delta: '+3 este mes' },
          { label: 'Victorias', value: String(recentMatches.filter(m => m.result === 'V').length) || '0', delta: recentMatches.length > 0 ? `${Math.round(recentMatches.filter(m => m.result === 'V').length / recentMatches.length * 100)}% win rate` : '—' },
          { label: 'Ranking', value: '#47', delta: '▲4 posiciones' },
          { label: 'Puntos', value: '1,840', delta: '+120 esta semana' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '28px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, margin: '6px 0 4px' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: s.delta.startsWith('▲') ? 'var(--turf-green)' : 'var(--grey-400)' }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Mis Juegos Activos */}
      {myActiveEvents.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', marginBottom: 24 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Mis Juegos Activos</div>
            <Link href="/dashboard/player/quick-game" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {myActiveEvents.map((ev) => {
              const href = ev.entityType === 'game'
                ? `/dashboard/player/quick-game/${ev.id}`
                : ev.status === 'live' && ev.isCreator
                  ? `/dashboard/player/tournaments/${ev.id}/live`
                  : ev.isCreator
                    ? `/dashboard/player/tournaments/${ev.id}`
                    : `/dashboard/player/tournaments/${ev.id}/view`;
              const si = STATUS_LABEL[ev.status] ?? { label: ev.status, color: 'var(--grey-400)' };
              const typeLabel = ev.entityType === 'tournament' ? (FORMAT_LABEL[ev.format] ?? ev.format) : 'Juego Rápido';
              return (
                <div key={ev.id} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--grey-100)', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</span>
                      {ev.isCreator && <span style={{ fontSize: 9, background: 'var(--black)', color: 'var(--neon)', padding: '2px 6px', fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0 }}>CREADOR</span>}
                      <span style={{ fontSize: 9, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '2px 6px', fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0, textTransform: 'uppercase' }}>{typeLabel}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{ev.date} · {ev.time} · {ev.club}, {ev.city}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: si.color }}>{si.label}</span>
                      <span style={{ fontSize: 9, color: 'var(--grey-400)' }}>·</span>
                      <span style={{ fontSize: 9, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ev.players}/{ev.maxPlayers} jugadores</span>
                    </div>
                  </div>
                  <Link href={href} className="btn btn-sm" style={{ background: ev.status === 'live' && ev.isCreator ? 'var(--turf-green)' : 'var(--black)', color: '#fff', borderRadius: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {ev.isCreator ? 'Gestionar →' : 'Ver →'}
                  </Link>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--grey-100)' }}>
            <Link href="/dashboard/player/quick-game" style={{ fontSize: 12, color: 'var(--grey-400)', textDecoration: 'none', fontWeight: 600 }}>Ver Historial →</Link>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginBottom: 24 }}>
        {/* Próximo evento */}
        {nextEvent ? (
          <div style={{ background: 'var(--black)', padding: '32px' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 12 }}>
              {nextEvent.entityType === 'tournament' ? 'Próximo Torneo' : 'Próximo Juego Rápido'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#fff', marginBottom: 8 }}>{nextEvent.name}</div>
            <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 24 }}>
              <span>{nextEvent.date}{nextEvent.time ? ` · ${nextEvent.time}` : ''}</span>
              <span>·</span>
              <span>{nextEvent.club}, {nextEvent.city}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <span className="chip" style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none' }}>{FORMAT_LABEL[nextEvent.format] ?? nextEvent.format}</span>
              <span className="chip" style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none' }}>{nextEvent.players} / {nextEvent.maxPlayers} jugadores</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href={nextEvent.entityType === 'game' ? `/dashboard/player/quick-game/${nextEvent.id}` : `/dashboard/player/tournaments/${nextEvent.id}`}
                className="btn btn-sm" style={{ background: 'var(--neon)', color: 'var(--black)', borderRadius: 0, fontWeight: 700 }}>Ver detalles</Link>
              <Link href="/dashboard/player/calendar" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 0 }}>Mi calendario</Link>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--black)', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Sin eventos próximos</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>No tenés torneos ni juegos programados.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/dashboard/player/tournaments" className="btn btn-sm" style={{ background: 'var(--neon)', color: 'var(--black)', borderRadius: 0, fontWeight: 700 }}>Crear Torneo</Link>
              <Link href="/dashboard/player/quick-game" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 0 }}>Juego Rápido</Link>
            </div>
          </div>
        )}

        {/* Friends activity */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Amigos</div>
            <Link href="/dashboard/player/friends" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {friends.map((f) => (
              <div key={f.name} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, background: 'var(--grey-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--black)', flexShrink: 0 }}>
                  {f.name.split(' ').map((w: string) => w[0]).join('')}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{f.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>{f.ranking}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>{f.activity}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent matches */}
      <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Últimos Partidos</div>
          <Link href="/dashboard/player/matches" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
        </div>
        {recentMatches.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
            Todavía no jugaste ningún partido.
          </div>
        ) : (
          <table className="rank-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>Fecha</th>
                <th>Juego / Torneo</th>
                <th>Pareja</th>
                <th>Rivales</th>
                <th style={{ textAlign: 'center' }}>Resultado</th>
                <th style={{ textAlign: 'center' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {recentMatches.map((m) => (
                <tr key={m.id}>
                  <td style={{ paddingLeft: 24, fontSize: 12, color: 'var(--grey-400)' }}>{m.date}</td>
                  <td style={{ fontWeight: 500, fontSize: 14 }}>{m.gameName}</td>
                  <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{m.partner}</td>
                  <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{m.opponents}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: '50%', background: m.result === 'V' ? 'var(--turf-green)' : m.result === 'T' ? '#f5a623' : '#ee0005', color: '#fff', fontSize: 11, fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}>
                      {m.result}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{m.scoreLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
