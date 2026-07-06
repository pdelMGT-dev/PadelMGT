'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Trophy, Zap, BarChart3, Building2, Shield, Users, CalendarDays, User, Share2 } from 'lucide-react';
import { getAllGames, getGame, saveGame } from '@/lib/game-store';
import type { ActiveGame } from '@/lib/game-engine';
import {
  getPendingInvitationsForPlayer,
  respondToInvitation,
  syncMyInvitations,
  type Invitation,
} from '@/lib/invitation-store';
import { addFriendship, getPlayer, type RegisteredPlayer } from '@/lib/player-store';
import { fetchFriendData, acceptFriendRequestSB, rejectFriendRequestSB, type FriendRequest, type FriendSummary } from '@/lib/friend-request-store';
import { getTournament, saveTournament } from '@/lib/tournament-store';
import {
  getMatchHistoryForPlayer,
  getNextEventForPlayer,
  getActiveEventsForPlayer,
  type MatchEntry,
  type UpcomingEvent,
} from '@/lib/match-history';
import { loadPlayerReviewTeams, type PlayerReviewTeam } from '@/lib/personalizado-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import PlanUsageBanner from '@/components/PlanUsageBanner';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  created:       { label: 'Inscripto',     color: 'var(--grey-400)' },
  starting_soon: { label: 'Por comenzar',  color: '#f5a623' },
  live:          { label: 'En juego',       color: 'var(--turf-green)' },
};

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

export default function PlayerHomePage() {
  const { user: currentUser, patchUser } = useCurrentUser();
  const [myActiveEvents, setMyActiveEvents] = useState<ReturnType<typeof getActiveEventsForPlayer>>([]);
  const [nextEvent, setNextEvent] = useState<UpcomingEvent | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchEntry[]>([]);
  const [allMatchCount, setAllMatchCount] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [eventsPlayed, setEventsPlayed] = useState(0);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [showProfileReminder, setShowProfileReminder] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<RegisteredPlayer | null>(null);
  const [realFriends, setRealFriends] = useState<FriendSummary[]>([]);
  const [reviewTeams, setReviewTeams] = useState<PlayerReviewTeam[]>([]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // Share the player's ID: native share sheet on mobile (WhatsApp, etc.),
  // falling back to copying it to the clipboard.
  async function shareMyId() {
    const id = currentUser?.shortId;
    if (!id) return;
    const message = `Agregame en PadelMGT con mi ID: ${id}`;
    const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      try { await nav.share({ title: 'PadelMGT', text: message }); return; } catch { /* cancelled */ return; }
    }
    try { await navigator.clipboard.writeText(id); showToast('ID copiado ✓'); }
    catch { showToast(`Tu ID: ${id}`); }
  }

  useEffect(() => {
    if (!currentUser) return;
    fetchFriendData().then(d => { if (d) { setFriendRequests(d.incoming); setRealFriends(d.friends); } });
    setPlayerData(getPlayer(currentUser.id));
    if (currentUser.firstLogin) {
      setShowProfileReminder(true);
      // Clear firstLogin flag so reminder only shows once per session
      patchUser({ firstLogin: false });
    }
  }, [currentUser, patchUser]);

  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id;
    setMyActiveEvents(getActiveEventsForPlayer(uid));
    setNextEvent(getNextEventForPlayer(uid));
    const allHistory = getMatchHistoryForPlayer(uid);
    setRecentMatches(allHistory.slice(0, 10));
    setAllMatchCount(allHistory.length);
    setTotalWins(allHistory.filter(m => m.result === 'V').length);
    setEventsPlayed(new Set(allHistory.map(m => m.gameId)).size);
    setPendingInvitations(getPendingInvitationsForPlayer(uid));
    // Pull invitations from Supabase (cross-device) then refresh the list.
    syncMyInvitations(uid, currentUser.email).then(() => setPendingInvitations(getPendingInvitationsForPlayer(uid))).catch(() => {});
    void loadPlayerReviewTeams(uid).then(setReviewTeams).catch(() => {});
  }, [currentUser]);

  async function handleAccept(inv: Invitation) {
    if (!currentUser) return;
    respondToInvitation(inv.id, 'accepted');
    const game = getGame(inv.gameId);
    if (game) {
      const updatedInvitedPlayers = game.invitedPlayers.map(ip =>
        ip.id === currentUser.id ? { ...ip, status: 'accepted' as const } : ip
      );
      const safePlayers = Array.isArray(game.players) ? game.players : [];
      const alreadyInPlayers = safePlayers.some(p => p.id === currentUser.id);
      const updatedPlayers = alreadyInPlayers ? safePlayers : [
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
    <div className="player-dashboard-page" style={{ padding: '40px 40px 80px' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'var(--black)', color: '#fff', padding: '12px 24px', fontSize: 13, fontWeight: 600, zIndex: 9999, pointerEvents: 'none', letterSpacing: '0.04em' }}>
          {toast}
        </div>
      )}

      {/* ── Mobile hero (Blue Spectrum) ── */}
      <div className="bs-mobile-only">
        <div className="bs-hero">
          <div className="bs-hero-label">
            Mi resumen · {new Date().toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()}
          </div>
          <div className="bs-hero-name">{currentUser ? currentUser.name.split(' ')[0] : 'Jugador'}</div>
          {currentUser?.shortId && (
            <button type="button" className="bs-hero-id" onClick={shareMyId}>
              <span className="bs-hero-id-label">Tu ID</span>
              <span className="bs-hero-id-code">{currentUser.shortId}</span>
              <Share2 size={13} />
            </button>
          )}
          <div className="bs-tiles">
            <div className="bs-tile">
              <div className="bs-tile-value">{eventsPlayed}</div>
              <div className="bs-tile-label">Torneos</div>
            </div>
            <div className="bs-tile">
              <div className="bs-tile-value">{totalWins}</div>
              <div className="bs-tile-label">Victorias</div>
            </div>
            <div className="bs-tile">
              <div className="bs-tile-value">{(playerData?.rankingPoints ?? 0).toLocaleString()}</div>
              <div className="bs-tile-label">Puntos</div>
            </div>
          </div>
        </div>
        <div className="bs-sheet">
          <div className="bs-quick">
            {[
              { href: '/dashboard/player/tournaments', label: 'Torneos',    Icon: Trophy },
              { href: '/dashboard/player/quick-game',  label: 'Juegos',     Icon: Zap },
              { href: '/dashboard/player/ranking',     label: 'Ranking',    Icon: BarChart3 },
              { href: '/dashboard/player/clubs',       label: 'Clubes',     Icon: Building2 },
              { href: '/dashboard/player/leagues',     label: 'Ligas',      Icon: Shield },
              { href: '/dashboard/player/friends',     label: 'Amigos',     Icon: Users },
              { href: '/dashboard/player/calendar',    label: 'Calendario', Icon: CalendarDays },
              { href: '/dashboard/player/profile',     label: 'Perfil',     Icon: User },
            ].map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="bs-quick-item">
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Plan usage banner */}
      <PlanUsageBanner role="player" />

      {/* Header (desktop) */}
      <div className="bs-desktop-only" style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Bienvenido de vuelta</div>
        <h1 className="player-h1" style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.95, margin: 0 }}>
          HOLA,<br /><span style={{ color: 'var(--court-blue)' }}>{currentUser ? currentUser.name.split(' ')[0].toUpperCase() : 'JUGADOR'}.</span>
        </h1>
        {currentUser?.shortId && (
          <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: 'rgba(0,0,0,0.06)', border: '1px solid var(--grey-200)' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Tu ID</span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--black)', letterSpacing: '0.04em' }}>{currentUser.shortId}</span>
          </div>
        )}
      </div>

      {/* Profile completion reminder (first login) */}
      {showProfileReminder && (
        <div style={{ background: 'var(--court-blue)', padding: '16px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: '#fff', marginBottom: 2 }}>¡Bienvenido a PadelMGT! 🎾</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Terminá de configurar tu perfil para sacar el máximo provecho de la plataforma.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href="/dashboard/player/profile" style={{ padding: '10px 20px', background: '#fff', color: 'var(--court-blue)', fontSize: 12, fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Completar perfil →
            </Link>
            <button onClick={() => setShowProfileReminder(false)}
              style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.15)', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Equipos en revisión (torneos personalizados) */}
      {reviewTeams.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #fcd34d', marginBottom: 24 }}>
          <div style={{ padding: '12px 20px', background: '#fffbeb', borderBottom: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: '#92400e' }}>Inscripciones en revisión</span>
            <span style={{ fontSize: 11, background: '#ca8a04', color: '#fff', fontWeight: 800, padding: '2px 7px', lineHeight: 1.5 }}>{reviewTeams.length}</span>
          </div>
          {reviewTeams.map(rt => {
            const isUnassigned = rt.status === 'unassigned';
            const canFindPartner = !isUnassigned && !rt.iAmReviewed;
            return (
              <div key={rt.teamId} style={{ padding: '14px 20px', borderBottom: '1px solid #fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--black)', marginBottom: 3 }}>
                    {rt.tournamentName}{rt.categoryName ? <span style={{ color: 'var(--grey-400)', fontWeight: 400 }}> · {rt.categoryName}</span> : null}
                  </div>
                  <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>
                    {isUnassigned
                      ? '⚠ Tu equipo quedó sin categoría — el organizador está revisando los datos.'
                      : rt.iAmReviewed
                      ? '⚠ Tu inscripción está en revisión por el organizador. Tu lugar sigue reservado.'
                      : `ℹ Tu compañero/a ${rt.reviewedName ?? ''} está en revisión. Podés inscribirte con un nuevo compañero/a.`}
                  </div>
                </div>
                {canFindPartner && (
                  <Link
                    href={`/inscripcion/${rt.tournamentCode}`}
                    style={{ padding: '8px 16px', background: 'var(--court-blue)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}
                  >
                    Buscar compañero/a →
                  </Link>
                )}
              </div>
            );
          })}
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
                <button onClick={() => { acceptFriendRequestSB(req.id); setFriendRequests(prev => prev.filter(r => r.id !== req.id)); showToast(`¡Ahora sos amigo de ${req.fromName}!`); }}
                  style={{ padding: '6px 14px', background: 'var(--turf-green)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>✓ Aceptar</button>
                <button onClick={() => { rejectFriendRequestSB(req.id); setFriendRequests(prev => prev.filter(r => r.id !== req.id)); }}
                  style={{ padding: '6px 14px', background: '#fff', border: '1px solid var(--grey-200)', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: 'var(--grey-500)' }}>Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invitaciones Pendientes */}
      {pendingInvitations.length > 0 && (
        <div style={{ background: '#fff', border: '2px solid var(--court-blue)', marginBottom: 32 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--court-blue-deep)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--bs-light)' }}>Invitaciones Pendientes</div>
            <span style={{ fontSize: 11, background: 'var(--court-blue)', color: '#fff', fontWeight: 800, padding: '2px 7px', lineHeight: 1.5 }}>{pendingInvitations.length}</span>
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

      {/* Stats (desktop — mobile shows them in the hero tiles) */}
      <div className="player-stats-grid bs-desktop-only" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {(() => {
          const pts = playerData?.rankingPoints ?? 0;
          const rankPos = playerData?.ranking ?? null;
          const winRate = allMatchCount > 0 ? `${Math.round(totalWins / allMatchCount * 100)}% win rate` : '—';
          return [
            { label: 'Torneos jugados', value: String(eventsPlayed), delta: '' },
            { label: 'Victorias', value: String(totalWins), delta: winRate },
            { label: 'Ranking', value: rankPos ? `#${rankPos}` : '—', delta: '' },
            { label: 'Puntos', value: pts.toLocaleString(), delta: '' },
          ];
        })().map((s) => (
          <div key={s.label} className="player-stats-card" style={{ background: '#fff', padding: '28px 24px' }}>
            <div className="player-stats-value" style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, margin: '6px 0 4px' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: s.delta.startsWith('▲') ? 'var(--turf-green)' : 'var(--grey-400)' }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Torneo Personalizado quick-access */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#0a0a0a', padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/assets/court-dark.svg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.08 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.92) 100%)' }} />
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ background: 'var(--bs-light)', color: 'var(--court-blue-deep)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', padding: '3px 10px', textTransform: 'uppercase' }}>NUEVO</span>
            <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>Torneo Personalizado</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#fff', lineHeight: 1 }}>
            TU TORNEO. <span style={{ color: 'var(--bs-light)' }}>TUS REGLAS.</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 8, maxWidth: 480 }}>
            Formato 100% configurable, inscripción por link e inscripción de menores bajo tu cuenta.
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <Link href="/dashboard/player/tournaments?format=personalizado" style={{ padding: '11px 24px', background: 'var(--bs-light)', color: 'var(--court-blue-deep)', fontSize: 13, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Crear torneo →
          </Link>
          <Link href="/dashboard/player/tournaments" style={{ padding: '11px 20px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Mis torneos
          </Link>
        </div>
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
                <div key={ev.id} className="player-event-row" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--grey-100)', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</span>
                      {ev.isCreator && <span style={{ fontSize: 9, background: 'var(--court-blue-deep)', color: 'var(--bs-light)', padding: '2px 6px', fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0 }}>CREADOR</span>}
                      <span style={{ fontSize: 9, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '2px 6px', fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0, textTransform: 'uppercase' }}>{typeLabel}</span>
                    </div>
                    <div className="player-event-date" style={{ fontSize: 12, color: 'var(--grey-400)' }}>{ev.date} · {ev.time} · {ev.club}, {ev.city}</div>
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

      <div className="player-split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginBottom: 24 }}>
        {/* Próximo evento */}
        {nextEvent ? (
          <div style={{ background: 'var(--black)', padding: '32px' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--bs-light)', fontWeight: 700, marginBottom: 12 }}>
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
                className="btn btn-sm" style={{ background: 'var(--bs-light)', color: 'var(--court-blue-deep)', borderRadius: 0, fontWeight: 700 }}>Ver detalles</Link>
              <Link href="/dashboard/player/calendar" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 0 }}>Mi calendario</Link>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--black)', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Sin eventos próximos</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>No tenés torneos ni juegos programados.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/dashboard/player/tournaments" className="btn btn-sm" style={{ background: 'var(--bs-light)', color: 'var(--court-blue-deep)', borderRadius: 0, fontWeight: 700 }}>Crear Torneo</Link>
              <Link href="/dashboard/player/quick-game" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 0 }}>Juego Rápido</Link>
            </div>
          </div>
        )}

        {/* Friends panel */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>
              Amigos ({realFriends.length})
            </div>
            <Link href="/dashboard/player/friends" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          {realFriends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 12 }}>Todavía no tenés amigos.</div>
              <Link href="/dashboard/player/friends?tab=search" style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)', textDecoration: 'none', borderBottom: '1px solid var(--black)', paddingBottom: 2 }}>Agregar jugadores →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {realFriends.slice(0, 4).map((f) => (
                <div key={f.playerId} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, background: 'var(--court-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                    {f.playerName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.playerName}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Amigo</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent matches */}
      <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Últimos Juegos</div>
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
