'use client';
import React, { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTournament, saveTournament } from '@/lib/tournament-store';
import type { Tournament } from '@/lib/tournament-store';
import type { GamePlayer, InvitedPlayer } from '@/lib/game-engine';
import { startTournament } from '@/lib/tournament-engine';
import { createInvitation, getInvitationsForGame } from '@/lib/invitation-store';
import { searchPlayers, getFriendsForPlayer } from '@/lib/player-store';
import type { RegisteredPlayer } from '@/lib/player-store';
import { loadJoinRequests, approveJoinRequest, rejectJoinRequest, syncJoinRequestsFromSupabase, type JoinRequest } from '@/lib/join-request-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { QRCodeSVG } from 'qrcode.react';

// ── Shared styles ─────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: '1px solid var(--grey-200)', background: '#fff',
  color: 'var(--black)', outline: 'none', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 6, display: 'block',
};

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 16,
};

const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '–';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

const MODALIDAD_LABEL: Record<string, string> = {
  individual: 'Individual', parejas: 'Parejas',
};

function statusInfo(status: string): { label: string; bg: string; color: string } {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    created:       { label: 'Inscripciones abiertas', bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed' },
    starting_soon: { label: 'Por Empezar',            bg: 'rgba(245,166,35,0.1)', color: '#f5a623' },
    live:          { label: 'En Vivo',                bg: 'rgba(0,180,0,0.1)',     color: 'var(--turf-green)' },
    finished:      { label: 'Finalizado',             bg: 'var(--grey-100)',       color: 'var(--grey-500)' },
    cancelled:     { label: 'Cancelado',              bg: 'rgba(220,38,38,0.1)',   color: '#dc2626' },
  };
  return map[status] ?? map.created;
}

// ── Page Component ─────────────────────────────────────────────────────────────

export default function GestionarTorneoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const { user: currentUser } = useCurrentUser();
  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);

  // Edit panel
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editClub, setEditClub] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editMaxPlayers, setEditMaxPlayers] = useState(8);
  const [editFormat, setEditFormat] = useState('');
  const [editModalidad, setEditModalidad] = useState<'individual' | 'parejas'>('individual');
  const [editMixto, setEditMixto] = useState(false);
  const [editCourts, setEditCourts] = useState(2);
  const [editScoreType, setEditScoreType] = useState<'points' | 'traditional'>('points');
  const [editPtTarget, setEditPtTarget] = useState(24);

  // Info section expand
  const [infoExpanded, setInfoExpanded] = useState(true);

  // Provisional slot inputs: slotIndex → text
  const [provSlotInputs, setProvSlotInputs] = useState<Record<number, string>>({});

  // Invite panel
  const [inviteTab, setInviteTab] = useState<'friends' | 'search'>('friends');
  const [inviteFriends, setInviteFriends] = useState<RegisteredPlayer[]>([]);
  const [inviteQ, setInviteQ] = useState('');
  const [inviteResults, setInviteResults] = useState<RegisteredPlayer[]>([]);
  const [inviteSent, setInviteSent] = useState<string[]>([]);

  // Co-creator
  const [coCreatorDropdown, setCoCreatorDropdown] = useState('');

  // Cancel confirmation
  const [cancelConfirm, setCancelConfirm] = useState(false);

  // Starting_soon: adjust maxPlayers
  const [soonMaxPlayers, setSoonMaxPlayers] = useState<number>(8);

  // Join requests
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [showQR, setShowQR] = useState(false);

  // Pair builder state (for americano parejas mode)
  const [pairSlots, setPairSlots] = useState<Array<{
    name: string;
    player1Id: string | null;
    player2Id: string | null;
  }>>([]);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [hideCompleteTeams, setHideCompleteTeams] = useState(false);

  // ── User loaded via useCurrentUser hook ──────────────────────────────────

  // ── Load tournament (initial + polling) ───────────────────────────────────
  const loadTournament = useCallback(() => {
    const t = getTournament(id);
    setTournament(t ?? null);
    if (t) {
      setSoonMaxPlayers(t.maxPlayers);
      // Sync join requests from Supabase so requests from other devices appear
      syncJoinRequestsFromSupabase(t.id)
        .then(pending => setJoinRequests(pending))
        .catch(() => setJoinRequests(loadJoinRequests().filter(r => r.entityId === t.id && r.status === 'pending')));
    }
  }, [id]);

  useEffect(() => {
    loadTournament();
    const timer = setInterval(loadTournament, 5000);
    return () => clearInterval(timer);
  }, [loadTournament]);

  // ── Generate share URL with snapshot ─────────────────────────────────────
  useEffect(() => {
    const t = tournament;
    if (!t?.code) return;
    try {
      const snap = {
        id: t.id,
        n:   t.name,
        cl:  t.club     || '',
        ci:  t.city     || '',
        co:  t.country  || '',
        st:  t.status,
        p:   t.players.length,
        mp:  t.maxPlayers,
        fmt: t.format   || 'americano',
        pt:  t.pairType || 'individual',
        lv:  t.levelLabel || '',
        d:   t.date     || '',
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(snap))));
      setShareUrl(`${window.location.origin}/t/${t.code}?s=${encoded}`);
    } catch {
      setShareUrl(`${window.location.origin}/t/${tournament?.code}`);
    }
  }, [tournament?.code, tournament?.status, tournament?.players.length]);

  // ── Search players for invite ─────────────────────────────────────────────
  useEffect(() => {
    if (inviteQ.trim().length >= 2 && tournament) {
      const results = searchPlayers(inviteQ);
      const confirmedIds = new Set(tournament.players.map(p => p.id));
      const invitedIds = new Set((tournament.invitedPlayers ?? []).map(p => p.id));
      setInviteResults(results.filter(p => !confirmedIds.has(p.id) && !invitedIds.has(p.id)));
    } else {
      setInviteResults([]);
    }
  }, [inviteQ, tournament]);

  // ── Load friends for invite ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !tournament) return;
    const allIds = new Set([
      ...tournament.players.map(p => p.id),
      ...(tournament.invitedPlayers ?? []).map(p => p.id),
    ]);
    setInviteFriends(getFriendsForPlayer(currentUser.id).filter(f => !allIds.has(f.id)));
  }, [currentUser, tournament]);

  // ── Initialize pairSlots for americano parejas / knockout ────────────────
  useEffect(() => {
    if (!tournament || !((tournament.format === 'americano' && tournament.pairType === 'parejas') || tournament.format === 'knockout')) return;
    // If fixedPairs already set, restore them
    if (tournament.fixedPairs?.length) {
      setPairSlots(tournament.fixedPairs.map(fp => ({
        name: fp.name ?? '',
        player1Id: fp.player1Id,
        player2Id: fp.player2Id,
      })));
    } else {
      // Create empty slots: maxPlayers/2 slots
      setPairSlots(Array.from({ length: Math.floor(tournament.maxPlayers / 2) }, () => ({
        name: '', player1Id: null, player2Id: null,
      })));
    }
  }, [tournament?.id, tournament?.fixedPairs?.length]);

  // ── Guard: loading ────────────────────────────────────────────────────────
  if (tournament === undefined) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--grey-400)' }}>
        Cargando...
      </div>
    );
  }

  // ── Guard: not found ──────────────────────────────────────────────────────
  if (tournament === null) {
    return (
      <div style={{ padding: '80px 40px', maxWidth: 500, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
          Torneo no encontrado
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 28 }}>
          El torneo con ID <code>{id}</code> no existe o fue eliminado.
        </div>
        <Link href="/dashboard/player/tournaments"
          style={{ padding: '11px 24px', background: 'var(--black)', color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
          ← Mis Torneos
        </Link>
      </div>
    );
  }

  const isCreator = currentUser != null && tournament.creatorId === currentUser.id;
  const isCoCreator = currentUser != null && (tournament.coCreatorIds ?? []).includes(currentUser.id);
  const hasAccess = isCreator || isCoCreator;

  // ── Guard: no access ──────────────────────────────────────────────────────
  if (currentUser != null && !hasAccess) {
    return (
      <div style={{ padding: '80px 40px', maxWidth: 500, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
          No tienes acceso
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 28 }}>
          Solo el creador y co-creadores del torneo pueden gestionar esta página.
        </div>
        <Link href="/dashboard/player/tournaments"
          style={{ padding: '11px 24px', background: 'var(--black)', color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
          ← Mis Torneos
        </Link>
      </div>
    );
  }

  // ── Read-only view: finished / cancelled ──────────────────────────────────
  const isCancelled = !!tournament.cancelledAt;
  if (tournament.status === 'finished' || isCancelled) {
    const effectiveStatus = isCancelled ? 'cancelled' : tournament.status;
    const si = statusInfo(effectiveStatus);
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--grey-100)' }}>
          <Link href="/dashboard/player/tournaments"
            style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ← Mis Torneos
          </Link>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)' }}>PADELMGT</div>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
          {tournament.name}
        </h1>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: si.bg, color: si.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {si.label}
        </span>
        <div style={{ marginTop: 24, ...card }}>
          <div style={secTitle}>Resumen del torneo</div>
          {[
            { label: 'Fecha',      value: formatDateDDMMYYYY(tournament.date) },
            { label: 'Hora',       value: tournament.time || '–' },
            { label: 'Club',       value: `${tournament.club}, ${tournament.city}` },
            { label: 'Formato',    value: FORMAT_LABEL[tournament.format] ?? tournament.format },
            { label: 'Modalidad',  value: MODALIDAD_LABEL[tournament.pairType] ?? tournament.pairType },
            { label: 'Jugadores',  value: `${tournament.players.length} / ${tournament.maxPlayers}` },
            { label: 'Canchas',    value: String(tournament.courts) },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--grey-100)' }}>
              <span style={{ fontSize: 11, color: 'var(--grey-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em' }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
          {tournament.cancelledAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--grey-100)' }}>
              <span style={{ fontSize: 11, color: '#dc2626', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em' }}>Cancelado</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{formatDateDDMMYYYY(tournament.cancelledAt.slice(0, 10))}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Live state placeholder ────────────────────────────────────────────────
  if (tournament.status === 'live') {
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--grey-100)' }}>
          <Link href="/dashboard/player/tournaments"
            style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ← Mis Torneos
          </Link>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)' }}>PADELMGT</div>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
          {tournament.name}
        </h1>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: 'rgba(0,180,0,0.1)', color: 'var(--turf-green)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-block', marginBottom: 32 }}>
          En Vivo
        </span>
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
            En Vivo: usa la página de gestión de rondas
          </div>
          <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 20 }}>
            Próximamente — La vista de gestión de rondas en tiempo real estará disponible aquí.
          </div>
          <Link href={`/dashboard/player/tournaments/${id}/live`}
            style={{ padding: '11px 24px', background: 'var(--black)', color: 'var(--neon)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
            Ir a Rondas →
          </Link>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD VIEW (created / starting_soon)
  // ══════════════════════════════════════════════════════════════════════════

  const t = tournament;
  const confirmedPlayers = t.players;
  const pendingInvited = (t.invitedPlayers ?? []).filter(p => p.status === 'pending');
  const rejectedInvited = (t.invitedPlayers ?? []).filter(p => p.status === 'rejected');
  const emptySlots = Math.max(0, t.maxPlayers - confirmedPlayers.length);
  const isStartingSoon = t.status === 'starting_soon';
  const allFilled = confirmedPlayers.length >= t.maxPlayers;
  const noPending = pendingInvited.length === 0;
  const isAmericanoParejas = t.format === 'americano' && t.pairType === 'parejas';
  const isKnockout = t.format === 'knockout';
  const needsPairSetup = isAmericanoParejas || isKnockout;
  const completePairs = pairSlots.filter(s => s.player1Id && s.player2Id);
  const canStartParejas = needsPairSetup ? completePairs.length >= 2 && noPending : false;
  const canStart = needsPairSetup ? canStartParejas : (allFilled && noPending);
  const si = statusInfo(t.status);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSaveEdit() {
    const canChangeFormat = t.status !== 'live';
    const updated: Tournament = {
      ...t,
      name: editName.trim() || t.name,
      date: editDate || t.date,
      time: editTime || t.time,
      club: editClub.trim() || t.club,
      city: editCity.trim() || t.city,
      maxPlayers: editMaxPlayers,
      ...(canChangeFormat ? {
        format: editFormat as Tournament['format'],
        pairType: editModalidad,
        mixto: editMixto,
        courts: editCourts,
        scoreConfig: editScoreType === 'points'
          ? { type: 'points' as const, target: editPtTarget }
          : t.scoreConfig,
      } : {}),
    };
    saveTournament(updated);
    setTournament(updated);
    setShowEdit(false);
  }

  function openEdit() {
    setEditName(t.name);
    setEditDate(t.date);
    setEditTime(t.time);
    setEditClub(t.club);
    setEditCity(t.city);
    setEditMaxPlayers(t.maxPlayers);
    setEditFormat(t.format);
    setEditModalidad(t.pairType as 'individual' | 'parejas');
    setEditMixto(t.mixto);
    setEditCourts(t.courts);
    setEditScoreType(t.scoreConfig.type);
    setEditPtTarget(t.scoreConfig.target ?? 24);
    setShowEdit(true);
  }

  function handleRemovePlayer(playerId: string) {
    if (t.creatorId === playerId) return;
    if (t.status === 'live') return;
    const updated: Tournament = {
      ...t,
      players: t.players.filter(p => p.id !== playerId),
      invitedPlayers: (t.invitedPlayers ?? []).map(ip =>
        ip.id === playerId ? { ...ip, status: 'cancelled' as const } : ip
      ),
    };
    saveTournament(updated);
    setTournament(updated);
  }

  function handleCreatorLeaveAsPlayer() {
    if (!currentUser || currentUser.id !== t.creatorId) return;
    const updated: Tournament = {
      ...t,
      players: t.players.filter(p => p.id !== t.creatorId),
    };
    saveTournament(updated);
    setTournament(updated);
  }

  function handleCreatorJoinAsPlayer() {
    if (!currentUser || currentUser.id !== t.creatorId) return;
    if (t.players.some(p => p.id === currentUser.id)) return;
    const creatorPlayer: import('@/lib/game-engine').GamePlayer = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      ranking: currentUser.rankingPoints ?? currentUser.ranking ?? 0,
      isCreator: true,
    };
    const updated: Tournament = {
      ...t,
      players: [creatorPlayer, ...t.players],
    };
    saveTournament(updated);
    setTournament(updated);
  }

  function handleRemoveInvited(playerId: string) {
    if (tournament!.status === 'live') return;
    const updated: Tournament = {
      ...tournament!,
      invitedPlayers: (tournament!.invitedPlayers ?? []).filter(p => p.id !== playerId),
    };
    saveTournament(updated);
    setTournament(updated);
  }

  function handleAddProvisional(slotIndex: number) {
    const name = (provSlotInputs[slotIndex] ?? '').trim();
    if (!name) return;
    const newPlayer: GamePlayer = {
      id: `prov-${Date.now()}-${slotIndex}`,
      name,
      ranking: 999,
      isCreator: false,
    };
    const newInvitedEntry: InvitedPlayer = {
      id: newPlayer.id,
      name,
      ranking: 999,
      status: 'accepted',
      invitedAt: new Date().toISOString(),
      isFriend: false,
      isProvisional: true,
    };
    const updated: Tournament = {
      ...t,
      players: [...t.players, newPlayer],
      invitedPlayers: [...(t.invitedPlayers ?? []), newInvitedEntry],
    };
    saveTournament(updated);
    setTournament(updated);
    setProvSlotInputs(prev => {
      const n = { ...prev };
      delete n[slotIndex];
      return n;
    });
  }

  function handleInvitePlayer(player: RegisteredPlayer) {
    if (!currentUser) return;
    createInvitation({
      gameId: t.id,
      gameName: t.name,
      gameDate: t.date,
      gameTime: t.time,
      gameClub: t.club,
      gameCity: t.city,
      fromPlayerId: currentUser.id,
      fromPlayerName: currentUser.name,
      toPlayerId: player.id,
      toPlayerName: player.name,
      toPlayerEmail: player.email,
    });
    const newInvited: InvitedPlayer = {
      id: player.id,
      name: player.name,
      email: player.email,
      shortId: player.shortId,
      ranking: player.ranking,
      status: 'pending',
      invitedAt: new Date().toISOString(),
      isFriend: false,
    };
    const updated: Tournament = {
      ...t,
      invitedPlayers: [...(t.invitedPlayers ?? []), newInvited],
    };
    saveTournament(updated);
    setTournament(updated);
    setInviteSent(prev => [...prev, player.id]);
    setInviteQ('');
    setInviteResults([]);
  }

  function handleAddCoCreator() {
    if (!coCreatorDropdown) return;
    if ((t.coCreatorIds ?? []).includes(coCreatorDropdown)) return;
    const updated: Tournament = {
      ...t,
      coCreatorIds: [...(t.coCreatorIds ?? []), coCreatorDropdown],
    };
    saveTournament(updated);
    setTournament(updated);
    setCoCreatorDropdown('');
  }

  function handleRemoveCoCreator(playerId: string) {
    const updated: Tournament = {
      ...t,
      coCreatorIds: (t.coCreatorIds ?? []).filter(cid => cid !== playerId),
    };
    saveTournament(updated);
    setTournament(updated);
  }

  function handleCancelTournament() {
    const updated = {
      ...t,
      cancelledAt: new Date().toISOString(),
    } as Tournament;
    saveTournament(updated);
    setTournament(updated);
    router.push('/dashboard/player/tournaments');
  }

  function handleStartTournament() {
    let tournamentToStart = t;

    if (needsPairSetup) {
      const validPairs = pairSlots.filter(s => s.player1Id && s.player2Id);
      const activePairPlayerIds = new Set(validPairs.flatMap(s => [s.player1Id!, s.player2Id!]));
      tournamentToStart = {
        ...t,
        fixedPairs: validPairs.map((s, i) => ({
          pairIndex: i,
          player1Id: s.player1Id!,
          player2Id: s.player2Id!,
          player1Name: t.players.find(p => p.id === s.player1Id)?.name ?? '',
          player2Name: t.players.find(p => p.id === s.player2Id)?.name ?? '',
          name: s.name.trim() || undefined,
        })),
        // Keep only players in valid pairs
        players: t.players.filter(p => activePairPlayerIds.has(p.id)),
      };
    }

    const result = startTournament(tournamentToStart);
    saveTournament(result);
    setTournament(result);
    router.push(`/dashboard/player/tournaments/${id}/live`);
  }

  function handleUpdateSoonMaxPlayers() {
    const minAllowed = Math.max(4, confirmedPlayers.length);
    const clamped = Math.max(minAllowed, Math.min(soonMaxPlayers, t.maxPlayers));
    const updated: Tournament = { ...t, maxPlayers: clamped };
    saveTournament(updated);
    setTournament(updated);
    setSoonMaxPlayers(clamped);
  }

  function handleApproveJoinRequest(req: JoinRequest) {
    if (!t) return;
    const newPlayer: GamePlayer = {
      id: req.playerId,
      name: req.playerName,
      email: req.playerEmail,
      ranking: 999,
      isCreator: false,
    };
    const updated: Tournament = {
      ...t,
      players: [...t.players, newPlayer],
    };
    saveTournament(updated);
    setTournament(updated);
    approveJoinRequest(req.id);
    setJoinRequests(prev => prev.filter(r => r.id !== req.id));
  }

  function handleRejectJoinRequest(req: JoinRequest) {
    rejectJoinRequest(req.id);
    setJoinRequests(prev => prev.filter(r => r.id !== req.id));
  }

  // ── Co-creator eligible players ──────────────────────────────────────────
  const eligibleCoCreators = confirmedPlayers.filter(p =>
    p.id !== t.creatorId && !(t.coCreatorIds ?? []).includes(p.id)
  );

  // Keep invitation store in sync (read-only reference — polling handles fresh data)
  getInvitationsForGame(t.id);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 0 80px', maxWidth: 800, margin: '0 auto' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', borderBottom: '1px solid var(--grey-100)',
        background: '#fff', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard/player/tournaments"
          style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ← Mis Torneos
        </Link>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)' }}>
          PADELMGT
        </div>
        {!cancelConfirm ? (
          <button
            onClick={() => setCancelConfirm(true)}
            style={{ padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Cancelar Torneo
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>¿Seguro?</span>
            <button onClick={handleCancelTournament}
              style={{ padding: '7px 14px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              Sí, cancelar
            </button>
            <button onClick={() => setCancelConfirm(false)}
              style={{ padding: '7px 14px', background: 'transparent', color: 'var(--grey-500)', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              No, volver
            </button>
          </div>
        )}
      </div>

      {/* ── Header ── */}
      <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid var(--grey-100)' }}>
        {/* Starting soon banner */}
        {isStartingSoon && (
          <div style={{ padding: '10px 16px', background: '#fef9c3', border: '1px solid #fde047', color: '#854d0e', fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            El torneo comienza en menos de 24 horas
          </div>
        )}

        {/* All filled CTA */}
        {allFilled && (
          <div style={{ padding: '14px 20px', background: 'rgba(214,255,0,0.08)', border: '2px solid var(--neon)', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>¡Todos los cupos están ocupados!</span>
            <button onClick={handleStartTournament}
              style={{ padding: '10px 22px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              INICIAR TORNEO
            </button>
          </div>
        )}

        {/* QR + Share strip */}
        {shareUrl && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20, padding: '16px', background: 'var(--grey-50, #f9f9f9)', border: '1px solid var(--grey-100)' }}>
            <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => setShowQR(true)} title="Ver QR en grande">
              <QRCodeSVG value={shareUrl} size={72} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>Compartir Torneo</div>
              <div style={{ fontSize: 12, color: 'var(--black)', marginBottom: 8, wordBreak: 'break-all', fontFamily: 'monospace' }}>{shareUrl}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => { navigator.clipboard.writeText(shareUrl).catch(() => {}); }} style={{ padding: '6px 14px', background: 'var(--black)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
                  Copiar link
                </button>
                <button onClick={() => setShowQR(true)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--grey-200)', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: 'var(--grey-500)' }}>
                  Ver QR
                </button>
                <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>Código: <strong style={{ color: 'var(--black)' }}>{t.code}</strong></span>
              </div>
            </div>
          </div>
        )}

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
          {t.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: si.bg, color: si.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {si.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: 'var(--grey-500)' }}>
          <span>{formatDateDDMMYYYY(t.date)}</span>
          {t.time && <span>{t.time}</span>}
          <span>{t.club}, {t.city}</span>
          {t.country && <span>{t.country}</span>}
          <span>{FORMAT_LABEL[t.format] ?? t.format}</span>
          <span>{MODALIDAD_LABEL[t.pairType] ?? t.pairType}</span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: '24px 40px' }}>

        {/* ── Section 1: Información del Torneo ── */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div
            onClick={() => setInfoExpanded(e => !e)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', cursor: 'pointer', userSelect: 'none', borderBottom: infoExpanded ? '1px solid var(--grey-100)' : 'none' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, fontWeight: 700, color: 'var(--grey-400)' }}>
              Información del Torneo
            </div>
            <span style={{ fontSize: 18, color: 'var(--grey-400)' }}>{infoExpanded ? '▲' : '▼'}</span>
          </div>

          {infoExpanded && (
            <div style={{ padding: '20px 24px' }}>
              {!showEdit ? (
                <>
                  {[
                    { label: 'Nombre',     value: t.name },
                    { label: 'Fecha',      value: formatDateDDMMYYYY(t.date) },
                    { label: 'Hora',       value: t.time || '–' },
                    { label: 'Club',       value: t.club },
                    { label: 'Ciudad',     value: t.city },
                    { label: 'País',       value: t.country || '–' },
                    { label: 'Formato',    value: FORMAT_LABEL[t.format] ?? t.format },
                    { label: 'Modalidad',  value: MODALIDAD_LABEL[t.pairType] ?? t.pairType },
                    { label: 'Jugadores',  value: `${t.maxPlayers}` },
                    { label: 'Canchas',    value: String(t.courts) },
                    { label: 'Puntuación', value: t.scoreConfig.type === 'points' ? `Por puntos (objetivo: ${t.scoreConfig.target ?? '–'})` : `Tradicional (${t.scoreConfig.setsPerMatch ?? 1} sets)` },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--grey-100)' }}>
                      <span style={{ fontSize: 11, color: 'var(--grey-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em' }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{row.value}</span>
                    </div>
                  ))}
                  <button
                    onClick={openEdit}
                    style={{ marginTop: 16, padding: '9px 18px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-500)' }}>
                    ✏ Editar parámetros
                  </button>
                </>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Nombre</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Fecha</label>
                      <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Hora</label>
                      <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Club</label>
                      <input type="text" value={editClub} onChange={e => setEditClub(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Ciudad</label>
                      <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Máx. jugadores</label>
                      <input type="number" value={editMaxPlayers} min={confirmedPlayers.length} max={32}
                        onChange={e => setEditMaxPlayers(Number(e.target.value))} style={inp} />
                    </div>
                  </div>

                  {/* Lock notice */}
                  {t.status === 'live' && (
                    <div style={{ padding: '8px 12px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', fontSize: 11, color: 'var(--grey-500)', marginBottom: 14 }}>
                      Formato y modalidad bloqueados (torneo en vivo)
                    </div>
                  )}

                  {/* Formato */}
                  {t.status !== 'live' && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={lbl}>Formato</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(['americano', 'mexicano'] as const).map(fk => (
                          <button key={fk} onClick={() => setEditFormat(fk)}
                            style={{ padding: '10px 20px', border: `2px solid ${editFormat === fk ? 'var(--black)' : 'var(--grey-200)'}`, background: editFormat === fk ? 'var(--black)' : '#fff', color: editFormat === fk ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>
                            {fk.charAt(0).toUpperCase() + fk.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modalidad */}
                  {t.status !== 'live' && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={lbl}>Modalidad</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(['individual', 'parejas'] as const).map(m => (
                          <button key={m} onClick={() => setEditModalidad(m)}
                            style={{ padding: '10px 20px', border: `2px solid ${editModalidad === m ? 'var(--black)' : 'var(--grey-200)'}`, background: editModalidad === m ? 'var(--black)' : '#fff', color: editModalidad === m ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mixto */}
                  {t.status !== 'live' && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={lbl}>Mixto</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {([{ label: 'No', val: false }, { label: 'Sí', val: true }] as const).map(o => (
                          <button key={String(o.val)} onClick={() => setEditMixto(o.val)}
                            style={{ padding: '10px 20px', border: `2px solid ${editMixto === o.val ? 'var(--black)' : 'var(--grey-200)'}`, background: editMixto === o.val ? 'var(--black)' : '#fff', color: editMixto === o.val ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Canchas */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>Canchas</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <button key={n} onClick={() => setEditCourts(n)}
                          style={{ width: 44, height: 44, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, cursor: 'pointer', border: `2px solid ${editCourts === n ? 'var(--black)' : 'var(--grey-200)'}`, background: editCourts === n ? 'var(--black)' : '#fff', color: editCourts === n ? '#fff' : 'var(--black)' }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Puntuación (for americano/mexicano) */}
                  {(editFormat === 'americano' || editFormat === 'mexicano') && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={lbl}>Puntuación — Puntos (múltiplos de 4)</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[4, 8, 12, 16, 20, 24, 28, 32].map(n => (
                          <button key={n} onClick={() => setEditPtTarget(n)}
                            style={{ width: 52, height: 44, fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, cursor: 'pointer', border: `2px solid ${editPtTarget === n ? 'var(--black)' : 'var(--grey-200)'}`, background: editPtTarget === n ? 'var(--black)' : '#fff', color: editPtTarget === n ? '#fff' : 'var(--black)' }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleSaveEdit}
                      style={{ padding: '10px 22px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Guardar
                    </button>
                    <button onClick={() => setShowEdit(false)}
                      style={{ padding: '10px 18px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-500)' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Section 2: Jugadores ── */}
        <div style={card}>
          <div style={secTitle}>Jugadores ({confirmedPlayers.length} / {t.maxPlayers})</div>

          {/* Starting soon — adjust maxPlayers */}
          {isStartingSoon && (
            <div style={{ marginBottom: 20, padding: '14px 16px', background: '#fef9c3', border: '1px solid #fde047' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ajustar cupos (próximo inicio)
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="number" value={soonMaxPlayers}
                  min={Math.max(4, confirmedPlayers.length)} max={t.maxPlayers}
                  onChange={e => setSoonMaxPlayers(Number(e.target.value))}
                  style={{ ...inp, width: 90 }} />
                <button onClick={handleUpdateSoonMaxPlayers}
                  style={{ padding: '10px 16px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  Actualizar
                </button>
                <span style={{ fontSize: 11, color: '#854d0e' }}>Mínimo: {Math.max(4, confirmedPlayers.length)}</span>
              </div>
            </div>
          )}

          {/* Creator not playing — organizer-only banner */}
          {isCreator && !confirmedPlayers.some(p => p.id === currentUser?.id) && t.status !== 'live' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 12, background: 'rgba(124,58,237,0.05)', border: '1px dashed #7c3aed' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Solo organizando</span>
                <span style={{ fontSize: 11, color: 'var(--grey-500)', marginLeft: 8 }}>No estás inscrito como jugador</span>
              </div>
              <button
                onClick={handleCreatorJoinAsPlayer}
                disabled={confirmedPlayers.length >= t.maxPlayers}
                style={{ padding: '6px 14px', background: '#7c3aed', color: '#fff', border: 'none', cursor: confirmedPlayers.length < t.maxPlayers ? 'pointer' : 'not-allowed', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: confirmedPlayers.length >= t.maxPlayers ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                + Unirme como jugador
              </button>
            </div>
          )}

          {/* Confirmed */}
          {confirmedPlayers.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--turf-green)', marginBottom: 8 }}>
                Confirmados ({confirmedPlayers.length})
              </div>
              {confirmedPlayers.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, border: '1px solid var(--grey-200)', background: p.isCreator ? 'rgba(214,255,0,0.04)' : '#fff' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.isCreator ? 'var(--black)' : 'var(--turf-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {initials(p.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    {p.email && <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.email}</div>}
                  </div>
                  {p.isCreator && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: 'var(--black)', color: 'var(--neon)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CREADOR</span>
                      {t.status !== 'live' && (
                        <button
                          onClick={handleCreatorLeaveAsPlayer}
                          title="Salirse como jugador (seguís organizando el torneo)"
                          style={{ padding: '3px 9px', background: 'transparent', border: '1px solid var(--grey-300)', cursor: 'pointer', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>
                          Solo organizar
                        </button>
                      )}
                    </div>
                  )}
                  {!p.isCreator && t.status !== 'live' && (
                    <button onClick={() => handleRemovePlayer(p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-300)', padding: 0, lineHeight: 1 }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Join Requests from public page */}
          {joinRequests.length > 0 && t.status !== 'live' && t.status !== 'finished' && (
            <>
              <div style={{ marginTop: 12, paddingTop: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f5a623', display: 'inline-block' }} />
                Solicitudes de Ingreso ({joinRequests.length})
              </div>
              {joinRequests.map(req => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, border: '1px solid #fcd34d', background: 'rgba(245,166,35,0.04)' }}>
                  <div style={{ width: 32, height: 32, background: 'rgba(245,166,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#f5a623', flexShrink: 0 }}>
                    {req.playerName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{req.playerName}</div>
                    {req.playerEmail && <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{req.playerEmail}</div>}
                  </div>
                  {t.players.length < t.maxPlayers && (
                    <button onClick={() => handleApproveJoinRequest(req)} style={{ padding: '5px 12px', background: 'var(--turf-green)', color: '#fff', border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', flexShrink: 0 }}>
                      ✓ Aceptar
                    </button>
                  )}
                  <button onClick={() => handleRejectJoinRequest(req)} style={{ padding: '5px 12px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                    ✗ Rechazar
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Pending */}
          {pendingInvited.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>
                Invitados pendientes ({pendingInvited.length})
              </div>
              {pendingInvited.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, border: '1px dashed var(--grey-200)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grey-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {initials(p.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    {p.email && <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.email}</div>}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: 'rgba(245,166,35,0.15)', color: '#f5a623', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pendiente</span>
                  {t.status !== 'live' && (
                    <button onClick={() => handleRemoveInvited(p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-300)', padding: 0, lineHeight: 1 }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Rejected */}
          {rejectedInvited.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#dc2626', marginBottom: 8 }}>
                Rechazados ({rejectedInvited.length})
              </div>
              {rejectedInvited.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, border: '1px dashed var(--grey-100)', background: 'var(--grey-50)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grey-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--grey-400)', flexShrink: 0 }}>
                    {initials(p.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--grey-400)' }}>{p.name}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: 'rgba(220,38,38,0.1)', color: '#dc2626', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Rechazó</span>
                </div>
              ))}
            </div>
          )}

          {/* Empty slots */}
          {emptySlots > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>
                Slots vacíos ({emptySlots})
              </div>
              {Array.from({ length: emptySlots }, (_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, border: '1px dashed var(--grey-200)', background: 'var(--grey-50)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--grey-300)', flexShrink: 0 }}>
                    ?
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--grey-400)', flex: 1 }}>Slot vacío</span>
                  {provSlotInputs[i] !== undefined ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        value={provSlotInputs[i]}
                        placeholder="Nombre provisional…"
                        onChange={e => setProvSlotInputs(prev => ({ ...prev, [i]: e.target.value }))}
                        style={{ ...inp, width: 180, padding: '6px 10px', fontSize: 12 }}
                      />
                      <button
                        onClick={() => handleAddProvisional(i)}
                        style={{ padding: '6px 12px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Agregar
                      </button>
                      <button
                        onClick={() => setProvSlotInputs(prev => { const n = { ...prev }; delete n[i]; return n; })}
                        style={{ padding: '6px 10px', background: 'none', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, color: 'var(--grey-400)' }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setProvSlotInputs(prev => ({ ...prev, [i]: '' }))}
                      style={{ padding: '5px 12px', background: 'none', border: '1px dashed var(--grey-300)', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>
                      + Agregar provisional
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Invite panel */}
          {emptySlots > 0 && (
            <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 16, marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 10 }}>
                Invitar jugador
              </div>

              {/* Invite tabs */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--grey-200)' }}>
                {(['friends', 'search'] as const).map(tab => {
                  const labels = { friends: 'Mis Amistades', search: 'Buscar Jugador' };
                  return (
                    <button key={tab} onClick={() => { setInviteTab(tab); setInviteQ(''); setInviteResults([]); }}
                      style={{ padding: '10px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', borderBottom: `2px solid ${inviteTab === tab ? 'var(--black)' : 'transparent'}`, background: 'transparent', color: inviteTab === tab ? 'var(--black)' : 'var(--grey-400)', cursor: 'pointer', marginBottom: -2 }}>
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* Friends tab */}
              {inviteTab === 'friends' && (
                <div>
                  {inviteFriends.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--grey-400)', padding: '16px 0' }}>No tenés amigos disponibles para invitar.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                      {inviteFriends.map(f => (
                        <button key={f.id} onClick={() => handleInvitePlayer(f)}
                          disabled={inviteSent.includes(f.id)}
                          style={{ padding: '12px', border: `1px solid ${inviteSent.includes(f.id) ? 'var(--turf-green)' : 'var(--grey-200)'}`, background: inviteSent.includes(f.id) ? 'rgba(0,180,0,0.04)' : '#fff', cursor: inviteSent.includes(f.id) ? 'default' : 'pointer', textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grey-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {initials(f.name)}
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>#{f.ranking}</span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{f.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 2 }}>{f.shortId}</div>
                          {inviteSent.includes(f.id) && (
                            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--turf-green)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Enviado</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search tab */}
              {inviteTab === 'search' && (
                <div>
                  <input
                    type="text"
                    value={inviteQ}
                    onChange={e => setInviteQ(e.target.value)}
                    placeholder="Buscar por nombre, email o #ID…"
                    style={{ ...inp, marginBottom: 0 }}
                  />
                  {inviteQ.trim().length >= 2 && (
                    <div style={{ border: '1px solid var(--grey-200)', borderTop: 'none', maxHeight: 240, overflowY: 'auto' }}>
                      {inviteResults.length === 0 ? (
                        <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey-400)' }}>No se encontraron jugadores.</div>
                      ) : inviteResults.map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--grey-100)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grey-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--grey-500)', flexShrink: 0 }}>
                              {initials(p.name)}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.shortId} · #{p.ranking}</div>
                            </div>
                          </div>
                          {inviteSent.includes(p.id) ? (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', background: 'rgba(0,180,0,0.1)', color: 'var(--turf-green)', textTransform: 'uppercase' }}>Enviado</span>
                          ) : (
                            <button onClick={() => handleInvitePlayer(p)}
                              style={{ padding: '6px 14px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              Invitar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {inviteQ.trim().length > 0 && inviteQ.trim().length < 2 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--grey-400)' }}>Escribí al menos 2 caracteres para buscar.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Section 2b: Pair Builder (americano parejas / knockout) ── */}
        {needsPairSetup && t.status !== 'live' && (() => {
          // Compute unassigned players
          const assignedIds = new Set(
            pairSlots.flatMap(s => [s.player1Id, s.player2Id].filter(Boolean) as string[])
          );
          const unassigned = t.players.filter(p => !assignedIds.has(p.id));

          function handleDropOnSlot(pairIdx: number, slot: 'player1Id' | 'player2Id') {
            if (!draggedPlayerId) return;
            setPairSlots(prev => {
              // Remove dragged player from wherever they are
              const next = prev.map(s => ({
                ...s,
                player1Id: s.player1Id === draggedPlayerId ? null : s.player1Id,
                player2Id: s.player2Id === draggedPlayerId ? null : s.player2Id,
              }));
              // If target slot already occupied, swap (put displaced back to unassigned = null in that slot)
              next[pairIdx] = { ...next[pairIdx], [slot]: draggedPlayerId };
              return next;
            });
            setDraggedPlayerId(null);
          }

          function removeFromSlot(pairIdx: number, slot: 'player1Id' | 'player2Id') {
            setPairSlots(prev => prev.map((s, i) => i === pairIdx ? { ...s, [slot]: null } : s));
          }

          const playerName = (id: string | null) => id ? (t.players.find(p => p.id === id)?.name ?? id) : null;

          return (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 16 }}>
              <div style={secTitle}>FORMAR EQUIPOS</div>

              {/* Unassigned players pool */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey-400)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Jugadores sin equipo ({unassigned.length})
                </div>
                <div
                  style={{ minHeight: 44, background: 'var(--grey-50)', border: '1px dashed var(--grey-200)', padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    if (!draggedPlayerId) return;
                    setPairSlots(prev => prev.map(s => ({
                      ...s,
                      player1Id: s.player1Id === draggedPlayerId ? null : s.player1Id,
                      player2Id: s.player2Id === draggedPlayerId ? null : s.player2Id,
                    })));
                    setDraggedPlayerId(null);
                  }}
                >
                  {unassigned.length === 0
                    ? <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>Todos los jugadores están asignados</span>
                    : unassigned.map(p => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDraggedPlayerId(p.id)}
                        style={{
                          padding: '6px 14px', background: '#fff', border: '1px solid var(--grey-300)',
                          fontSize: 13, fontWeight: 600, cursor: 'grab', userSelect: 'none',
                          boxShadow: draggedPlayerId === p.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                          opacity: draggedPlayerId === p.id ? 0.5 : 1,
                        }}
                      >
                        {p.name}
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Collapse toggle */}
              {completePairs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--grey-500)' }}>
                    {completePairs.length} equipo{completePairs.length !== 1 ? 's' : ''} completo{completePairs.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHideCompleteTeams(v => !v)}
                    style={{ fontSize: 11, fontWeight: 700, color: hideCompleteTeams ? 'var(--black)' : 'var(--grey-500)', background: hideCompleteTeams ? 'var(--neon)' : 'var(--grey-100)', border: 'none', padding: '5px 14px', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    {hideCompleteTeams ? '▶ Mostrar todos' : '◀ Colapsar completos'}
                  </button>
                </div>
              )}

              {/* Compact summary of collapsed complete teams */}
              {hideCompleteTeams && completePairs.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, padding: '10px 14px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  {pairSlots.map((slot, i) => {
                    if (!slot.player1Id || !slot.player2Id) return null;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#fff', border: '1px solid rgba(34,197,94,0.35)', fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: 'var(--grey-500)', fontSize: 10, letterSpacing: '0.06em' }}>{slot.name || `E${i + 1}`}</span>
                        <span style={{ color: 'var(--grey-300)' }}>·</span>
                        <span style={{ fontWeight: 600 }}>{playerName(slot.player1Id)}</span>
                        <span style={{ color: 'var(--grey-300)' }}>/</span>
                        <span style={{ fontWeight: 600 }}>{playerName(slot.player2Id)}</span>
                        <button
                          onClick={() => setHideCompleteTeams(false)}
                          title="Expandir para editar"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-300)', fontSize: 11, padding: '0 0 0 4px', lineHeight: 1 }}
                        >✎</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Team slots grid — only show incomplete when collapsed */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {pairSlots.map((slot, i) => {
                  const isComplete = !!(slot.player1Id && slot.player2Id);
                  if (hideCompleteTeams && isComplete) return null;
                  return (
                    <div key={i} style={{
                      border: `2px solid ${isComplete ? 'var(--turf-green, #22c55e)' : 'var(--grey-200)'}`,
                      padding: '12px 14px',
                      background: isComplete ? 'rgba(34,197,94,0.04)' : '#fff',
                    }}>
                      {/* Team name input */}
                      <input
                        value={slot.name}
                        onChange={e => setPairSlots(prev => prev.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))}
                        placeholder={`Equipo ${i + 1}`}
                        style={{ ...inp, fontSize: 12, fontWeight: 700, marginBottom: 10, padding: '6px 10px' }}
                      />
                      {/* Player slots */}
                      {(['player1Id', 'player2Id'] as const).map(slotKey => (
                        <div
                          key={slotKey}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => handleDropOnSlot(i, slotKey)}
                          style={{
                            minHeight: 38, marginBottom: 6, padding: '6px 10px',
                            background: slot[slotKey] ? 'var(--grey-50)' : 'transparent',
                            border: `1px dashed ${slot[slotKey] ? 'var(--grey-300)' : 'var(--grey-200)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            fontSize: 13,
                          }}
                        >
                          {slot[slotKey] ? (
                            <>
                              <span
                                draggable
                                onDragStart={() => setDraggedPlayerId(slot[slotKey]!)}
                                style={{ fontWeight: 600, cursor: 'grab', flex: 1 }}
                              >
                                {playerName(slot[slotKey])}
                              </span>
                              <button
                                onClick={() => removeFromSlot(i, slotKey)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-400)', fontSize: 16, padding: '0 0 0 8px', lineHeight: 1 }}
                              >×</button>
                            </>
                          ) : (
                            <span style={{ color: 'var(--grey-300)', fontSize: 12 }}>Arrastrá un jugador aquí</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Status */}
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--grey-400)' }}>
                {completePairs.length} equipo{completePairs.length !== 1 ? 's' : ''} completo{completePairs.length !== 1 ? 's' : ''} · {unassigned.length} jugador{unassigned.length !== 1 ? 'es' : ''} sin equipo
                {unassigned.length > 0 && ' — los jugadores sin equipo serán excluidos al iniciar'}
              </div>
            </div>
          );
        })()}

        {/* ── Section 3: Co-Creadores ── */}
        <div style={card}>
          <div style={secTitle}>Co-Creadores</div>

          {(t.coCreatorIds ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 14, fontStyle: 'italic' }}>
              No hay co-creadores asignados.
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              {(t.coCreatorIds ?? []).map(cId => {
                const player = confirmedPlayers.find(p => p.id === cId);
                return (
                  <div key={cId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', marginBottom: 6, border: '1px solid var(--grey-200)', background: '#fff' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grey-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {initials(player?.name ?? cId)}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{player?.name ?? cId}</span>
                    <button onClick={() => handleRemoveCoCreator(cId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--grey-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Quitar
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {eligibleCoCreators.length > 0 && (
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                value={coCreatorDropdown}
                onChange={e => setCoCreatorDropdown(e.target.value)}
                style={{
                  ...inp, width: 'auto', flex: 1, appearance: 'none' as const, cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                }}>
                <option value="">Seleccionar jugador confirmado…</option>
                {eligibleCoCreators.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button onClick={handleAddCoCreator} disabled={!coCreatorDropdown}
                style={{ padding: '10px 18px', background: coCreatorDropdown ? 'var(--black)' : 'var(--grey-200)', color: coCreatorDropdown ? '#fff' : 'var(--grey-400)', border: 'none', cursor: coCreatorDropdown ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Agregar
              </button>
            </div>
          )}
        </div>

        {/* ── Section 4: Acciones ── */}
        <div style={card}>
          <div style={secTitle}>Acciones</div>

          {/* Cancel */}
          {!cancelConfirm ? (
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setCancelConfirm(true)}
                style={{ padding: '11px 24px', background: 'transparent', border: '2px solid #dc2626', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Cancelar Torneo
              </button>
            </div>
          ) : (
            <div style={{ padding: '16px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>
                ¿Seguro? Esta acción no se puede deshacer.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleCancelTournament}
                  style={{ padding: '10px 20px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Sí, cancelar el torneo
                </button>
                <button onClick={() => setCancelConfirm(false)}
                  style={{ padding: '10px 18px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-500)' }}>
                  No, volver
                </button>
              </div>
            </div>
          )}

          {/* Start tournament */}
          <button
            onClick={handleStartTournament}
            disabled={!canStart}
            style={{ width: '100%', padding: '16px', background: canStart ? 'var(--black)' : 'var(--grey-200)', color: canStart ? 'var(--neon)' : 'var(--grey-400)', border: 'none', cursor: canStart ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            INICIAR TORNEO
          </button>
          {!canStart && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--grey-400)', textAlign: 'center' }}>
              {needsPairSetup
                ? `Necesitás al menos 2 parejas completas para iniciar (tenés ${completePairs.length}).`
                : `Necesitás completar todos los cupos (${confirmedPlayers.length}/${t.maxPlayers}) para iniciar el torneo.`
              }
            </div>
          )}
        </div>

      </div>

      {/* QR Modal */}
      {showQR && (
        <div onClick={() => setShowQR(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 360, width: '90%' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 16 }}>Compartir Torneo</div>
            <QRCodeSVG value={shareUrl} size={200} />
            <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 16, wordBreak: 'break-all', textAlign: 'center', maxWidth: 280 }}>{shareUrl}</div>
            <button onClick={() => setShowQR(false)} style={{ marginTop: 20, padding: '10px 28px', background: 'var(--black)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
