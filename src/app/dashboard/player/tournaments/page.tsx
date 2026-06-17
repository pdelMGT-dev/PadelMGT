'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { getAllTournaments, createTournament, getTournament, saveTournament, cloneTournament } from '@/lib/tournament-store';
import { checkTournamentGate, incrementUsage, getPlayerLimits } from '@/lib/plan-config';
import type { Tournament } from '@/lib/tournament-store';
import type { FixedPair } from '@/lib/game-engine';
import {
  getAllPersonalizado,
  getPendingInvitationsForPlayer,
  acceptTeamInvitation,
  rejectTeamInvitation,
  type PersonalizadoTournament,
  type PendingInvitation,
} from '@/lib/personalizado-store';
import { getFriendsForPlayer, searchPlayers } from '@/lib/player-store';
import type { RegisteredPlayer } from '@/lib/player-store';
import { getPlayerClubs } from '@/lib/club-membership-store';
import { getSAClubs } from '@/lib/superadmin-data';
import { useToast } from '@/components/ToastProvider';
import { SkeletonCard } from '@/components/Skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import CloneDialog from '@/components/CloneDialog';
import { estimateEventDuration, matchDurationMinutes, formatDurationRange } from '@/lib/duration-estimate';

// ── Types ─────────────────────────────────────────────────────────────────────

type FormatKey = 'americano' | 'mexicano' | 'round_robin' | 'team_league' | 'knockout' | 'world_cup';
type PlayerClub = { id: string; name: string; city: string; country: string; courts: number };
type TournamentPlayer = { id: string; name: string; ranking: number; isCreator: boolean; email?: string; sex?: 'masculino' | 'femenino'; isProvisional?: boolean };
type InvitedEntry = { id: string; name: string; email?: string; shortId?: string; ranking: number; status: 'pending' | 'accepted' | 'rejected'; invitedAt: string; isProvisional?: boolean };

// ── Static data ───────────────────────────────────────────────────────────────

// Clubs loaded dynamically from club-membership-store and SA store

const FORMAT_INFO: Record<FormatKey, { label: string; desc: string; functional: boolean }> = {
  americano:   { label: 'Americano',   desc: 'Rotación de parejas, puntos acumulados. Rondas pre-generadas.',         functional: true  },
  mexicano:    { label: 'Mexicano',    desc: 'Rotación dinámica según posición en el ranking del torneo.',              functional: true  },
  round_robin: { label: 'Round Robin', desc: 'Todos contra todos. Puntuación tradicional (sets/games). Parejas rotan.',  functional: true  },
  team_league: { label: 'Team League', desc: 'Liga por equipos con jornadas semanales.',                               functional: false },
  knockout:    { label: 'Knockout',    desc: 'Eliminación directa por parejas. Fase de grupos opcional + cuadro.',     functional: true  },
  world_cup:   { label: 'World Cup',   desc: 'Estilo Mundial: 4 u 8 grupos de 4 equipos, clasifican 2 → cuadro FIFA.',  functional: true  },
};
const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

const PLAYER_COUNT_OPTIONS = Array.from({ length: 15 }, (_, i) => 4 + i * 2); // [4,6,8,...,32]

// ── Shared styles ─────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: '1px solid var(--grey-200)', background: '#fff',
  color: 'var(--black)', outline: 'none', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
};
const sel: React.CSSProperties = {
  ...inp, appearance: 'none' as const, cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const STEP_LABELS = ['I INFORMACIÓN', 'II FORMATO', 'III JUGADORES'];

function WizardSteps({ current }: { current: number }) {
  const progress = Math.round(((current - 1) / (STEP_LABELS.length - 1)) * 100);
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
        {STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const done = current > num;
          const active = current === num;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                  background: done ? 'var(--turf-green)' : active ? 'var(--black)' : 'var(--grey-100)',
                  color: done || active ? '#fff' : 'var(--grey-400)',
                  fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                  boxShadow: active ? '0 0 0 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  {done ? '✓' : num}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: active ? 'var(--black)' : done ? 'var(--turf-green)' : 'var(--grey-300)',
                  whiteSpace: 'nowrap',
                }}>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{ width: 40, height: 2, background: done ? 'var(--turf-green)' : 'var(--grey-200)', margin: '0 4px', marginBottom: 18, flexShrink: 0, transition: 'background 0.3s' }} />
              )}
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--grey-100)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--turf-green)', borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function NavBtns({
  onBack, onNext, nextLabel = 'Siguiente →', disabled = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
      {onBack
        ? <button onClick={onBack} style={{ padding: '11px 24px', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>← Atrás</button>
        : <div />}
      <button onClick={onNext} disabled={disabled} style={{ padding: '11px 28px', background: disabled ? 'var(--grey-200)' : 'var(--black)', color: disabled ? 'var(--grey-400)' : '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {nextLabel}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function PlayerTournamentsPage() {
  const { showToast } = useToast();

  // ── View ────────────────────────────────────────────────────────────────────
  const [view, setView] = useState<'dashboard' | 'wizard'>('dashboard');
  const [step, setStep] = useState(1);
  const [planError, setPlanError] = useState('');

  // ── Current user ────────────────────────────────────────────────────────────
  const { user: currentUser } = useCurrentUser();

  // ── My tournaments ──────────────────────────────────────────────────────────
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [historialFilter, setHistorialFilter] = useState<'todos' | 'finalizado' | 'cancelado' | 'organizador' | 'jugador'>('todos');
  const [histPage, setHistPage]     = useState(0);
  const [activeView, setActiveView] = useState<'icons' | 'list'>('icons');

  // ── Clone modal ───────────────────────────────────────────────────────────────
  const [cloneSource, setCloneSource]   = useState<Tournament | null>(null);
  const [cloneName, setCloneName]       = useState('');
  const [cloneDate, setCloneDate]       = useState('');
  const [cloneTime, setCloneTime]       = useState('');
  const [cloneRoster, setCloneRoster]   = useState(true);
  const [cloning, setCloning]           = useState(false);

  function openClone(t: Tournament) {
    setCloneSource(t);
    setCloneName(`${t.name} (copia)`);
    setCloneDate('');
    setCloneTime(t.time || '');
    setCloneRoster(true);
  }

  function handleCloneConfirm() {
    if (!cloneSource || !currentUser) return;
    if (!cloneName.trim() || !cloneDate || !cloneTime) return;
    setCloning(true);
    const created = cloneTournament(cloneSource, {
      name: cloneName.trim(),
      date: cloneDate,
      time: cloneTime,
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      copyRoster: cloneRoster,
    });
    setCloning(false);
    setCloneSource(null);
    showToast('¡Torneo clonado!', 'success');
    window.location.href = `/dashboard/player/tournaments/${created.id}`;
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  const [newTId, setNewTId] = useState('');
  const [newTCode, setNewTCode] = useState('');
  const [newTShareUrl, setNewTShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const [tName, setTName] = useState('');
  const [tDate, setTDate] = useState('');
  const [tTime, setTTime] = useState('');
  const [tHasLocation, setTHasLocation] = useState<boolean | null>(null);
  const [tIsRegClub, setTIsRegClub] = useState<boolean | null>(null);
  const [tSelectedRegClub, setTSelectedRegClub] = useState<PlayerClub | null>(null);
  const [myTClubs, setMyTClubs] = useState<PlayerClub[]>([]);
  const [tAllClubs, setTAllClubs] = useState<PlayerClub[]>([]);
  const [tClubSearch, setTClubSearch] = useState('');
  const [tSelectedSearchClub, setTSelectedSearchClub] = useState<PlayerClub | null>(null);
  const [tIsPrivateCourt, setTIsPrivateCourt] = useState(false);
  const [tCustomClub, setTCustomClub] = useState('');

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  const [tFormat, setTFormat] = useState<FormatKey | null>(null);
  const [tModalidad, setTModalidad] = useState<'individual' | 'parejas'>('individual');
  const [tMixto, setTMixto] = useState(false);
  const [tMaxPlayers, setTMaxPlayers] = useState(8);
  const [tCourts, setTCourts] = useState(2);
  const [tScoreType, setTScoreType] = useState<'points' | 'traditional'>('points');
  const [tPtTarget, setTPtTarget] = useState(24);
  const [tSets, setTSets] = useState(1);
  const [tGames, setTGames] = useState(6);
  const [tTiebreak, setTTiebreak] = useState(7);
  const [tDeuce, setTDeuce] = useState<'ventaja' | 'oro' | 'plata' | 'ipf'>('oro');
  const [tPjTarget, setTPjTarget] = useState(4);      // round_robin: games per player
  const [tAllowTies, setTAllowTies] = useState(false); // round_robin: allow set tie (6-6)
  const [tAcceptsFamily, setTAcceptsFamily] = useState(false); // organizer allows family-member inscription

  // ── Knockout config ──────────────────────────────────────────────────────────
  const [tKOHasGroups, setTKOHasGroups] = useState(false);
  const [tKONumGroups, setTKONumGroups] = useState(4);
  const [tKOTeamsPerGroup, setTKOTeamsPerGroup] = useState(3);
  const [tKOTeamsAdvancing, setTKOTeamsAdvancing] = useState(1);
  // Group-phase score params (same type as main tScoreType, separate params)
  const [tGrpSets, setTGrpSets] = useState(1);
  const [tGrpGames, setTGrpGames] = useState(6);
  const [tGrpTiebreak, setTGrpTiebreak] = useState(7);
  const [tGrpDeuce, setTGrpDeuce] = useState<'ventaja' | 'oro' | 'plata' | 'ipf'>('oro');
  const [tGrpTarget, setTGrpTarget] = useState(24);

  // ── Step 3 ──────────────────────────────────────────────────────────────────
  const [tPlayers, setTPlayers] = useState<TournamentPlayer[]>([]);
  const [tInvited, setTInvited] = useState<InvitedEntry[]>([]);
  const [tCreatorInGame, setTCreatorInGame] = useState(true);
  const [tPlayerTab, setTPlayerTab] = useState<'friends' | 'search'>('friends');
  const [tFriendList, setTFriendList] = useState<RegisteredPlayer[]>([]);
  const [tSearchQ, setTSearchQ] = useState('');
  const [tSearchResults, setTSearchResults] = useState<RegisteredPlayer[]>([]);
  const [tProvName, setTProvName] = useState('');
  const [tShowProvInput, setTShowProvInput] = useState(false);
  const [tShowAddPanel, setTShowAddPanel] = useState(false);
  // Pair assignments
  const [tPairAssignments, setTPairAssignments] = useState<FixedPair[]>([]);
  const [tPairsLocked, setTPairsLocked] = useState(false);
  const [tDragId, setTDragId] = useState<string | null>(null);
  const [tDragSource, setTDragSource] = useState<string | null>(null);
  const [tDropOver, setTDropOver] = useState<string | null>(null);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const memberships = getPlayerClubs(currentUser.id);
    setMyTClubs(memberships.map(m => ({ id: m.clubId, name: m.clubName, city: m.clubCity, country: m.clubCountry, courts: 0 })));
    setTAllClubs(getSAClubs().filter(c => c.status === 'active').map(c => ({ id: c.id, name: c.name, city: c.city || '', country: c.country || '', courts: c.courts || 0 })));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    setMyTournaments(getAllTournaments().filter(t =>
      t.creatorId === currentUser.id ||
      t.players.some(p => p.id === currentUser.id) ||
      (t.invitedPlayers ?? []).some(p => p.id === currentUser.id)
    ));
    setTournamentsLoading(false);
  }, [currentUser]);

  const [activePersonalizados, setActivePersonalizados] = useState<PersonalizadoTournament[]>([]);
  useEffect(() => {
    if (!currentUser) return;
    const active = getAllPersonalizado().filter(
      t => t.creatorId === currentUser.id &&
        (t.status === 'registration_open' || t.status === 'configured' || t.status === 'live')
    );
    setActivePersonalizados(active);
  }, [currentUser]);

  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [invitationLoading, setInvitationLoading] = useState<string | null>(null);
  useEffect(() => {
    if (!currentUser?.email) return;
    setPendingInvitations(getPendingInvitationsForPlayer(currentUser.email));
  }, [currentUser]);

  // World Cup is a knockout with a mandatory group stage and FIFA presets:
  // groups of 4 teams, top 2 advance. The creator only picks 4 or 8 groups.
  useEffect(() => {
    if (tFormat === 'world_cup') {
      setTKOHasGroups(true);
      setTKOTeamsPerGroup(4);
      setTKOTeamsAdvancing(2);
      setTKONumGroups(g => (g === 4 || g === 8 ? g : 4));
    }
  }, [tFormat]);

  // Auto-derive maxPlayers for knockout/world_cup with groups
  useEffect(() => {
    if ((tFormat === 'knockout' || tFormat === 'world_cup') && tKOHasGroups) {
      setTMaxPlayers(tKONumGroups * tKOTeamsPerGroup * 2);
    }
  }, [tFormat, tKOHasGroups, tKONumGroups, tKOTeamsPerGroup]);

  // Clamp teamsAdvancing when teamsPerGroup changes
  useEffect(() => {
    if (tKOTeamsAdvancing >= tKOTeamsPerGroup) {
      setTKOTeamsAdvancing(Math.max(1, tKOTeamsPerGroup - 1));
    }
  }, [tKOTeamsPerGroup, tKOTeamsAdvancing]);

  // Load friends when entering step 3
  useEffect(() => {
    if (step === 3 && currentUser) {
      const friends = getFriendsForPlayer(currentUser.id);
      setTFriendList(friends.filter(f => !tPlayers.some(p => p.id === f.id)));
    }
  }, [step, currentUser]);

  // Ensure creator is in tPlayers when entering step 3
  useEffect(() => {
    if (step === 3 && currentUser && tCreatorInGame) {
      setTPlayers(prev => {
        if (prev.some(p => p.id === currentUser.id)) return prev;
        return [{ id: currentUser.id, name: currentUser.name, ranking: currentUser.ranking ?? 100, isCreator: true, email: currentUser.email }, ...prev];
      });
    }
  }, [step, currentUser, tCreatorInGame]);

  // Search players in step 3
  useEffect(() => {
    if (tSearchQ.trim().length >= 2) {
      setTSearchResults(searchPlayers(tSearchQ).filter(p => !tPlayers.some(tp => tp.id === p.id)));
    } else {
      setTSearchResults([]);
    }
  }, [tSearchQ, tPlayers]);

  // Initialize pair assignments when player list fills
  useEffect(() => {
    if (tPlayers.length === tMaxPlayers && (tModalidad === 'parejas' || tMixto)) {
      const numPairs = tMaxPlayers / 2;
      setTPairAssignments(prev => {
        if (prev.length === numPairs) return prev;
        return Array.from({ length: numPairs }, (_, i) => ({
          pairIndex: i,
          player1Id: '', player1Name: '',
          player2Id: '', player2Name: '',
        }));
      });
    }
  }, [tPlayers.length, tMaxPlayers, tModalidad]);

  // ── Location helpers ─────────────────────────────────────────────────────────
  function resolvedClub(): string {
    if (!tHasLocation) return '';
    if (tIsRegClub === true && tSelectedRegClub) return tSelectedRegClub.name;
    if (tIsRegClub === false) {
      if (tIsPrivateCourt) return tCustomClub.trim() || '';
      if (tSelectedSearchClub) return tSelectedSearchClub.name;
    }
    return '';
  }
  function resolvedCity(): string {
    if (tIsRegClub === true && tSelectedRegClub) return tSelectedRegClub.city;
    if (tIsRegClub === false && !tIsPrivateCourt && tSelectedSearchClub) return tSelectedSearchClub.city;
    return '';
  }
  function resolvedCountry(): string {
    if (tIsRegClub === true && tSelectedRegClub) return tSelectedRegClub.country;
    if (tIsRegClub === false && !tIsPrivateCourt && tSelectedSearchClub) return tSelectedSearchClub.country;
    return '';
  }

  // ── Validation ───────────────────────────────────────────────────────────────
  const step1Valid = useMemo(() => {
    if (!tName.trim() || !tDate || !tTime) return false;
    if (tHasLocation === null) return true; // location optional
    if (tHasLocation === false) return true;
    if (tIsRegClub === null) return false;
    if (tIsRegClub === true) return tSelectedRegClub !== null;
    // not registered club
    if (tIsPrivateCourt) return tCustomClub.trim().length > 0;
    return tSelectedSearchClub !== null;
  }, [tName, tDate, tTime, tHasLocation, tIsRegClub, tSelectedRegClub, tIsPrivateCourt, tCustomClub, tSelectedSearchClub]);

  const step2Valid = useMemo(() => {
    if (!tFormat) return false;
    if (!FORMAT_INFO[tFormat].functional) return false;
    if (tFormat === 'world_cup') {
      if (tKONumGroups !== 4 && tKONumGroups !== 8) return false;
    }
    if (tFormat === 'knockout' && tKOHasGroups) {
      if (tKOTeamsPerGroup < 2) return false;
      if (tKOTeamsAdvancing < 1 || tKOTeamsAdvancing >= tKOTeamsPerGroup) return false;
    }
    return true;
  }, [tFormat, tKOHasGroups, tKONumGroups, tKOTeamsPerGroup, tKOTeamsAdvancing]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  function resetWizard() {
    setStep(1);
    setTName(''); setTDate(''); setTTime('');
    setTHasLocation(null); setTIsRegClub(null); setTSelectedRegClub(null);
    setTClubSearch(''); setTSelectedSearchClub(null); setTIsPrivateCourt(false); setTCustomClub('');
    setTFormat(null); setTModalidad('individual'); setTMixto(false);
    setTMaxPlayers(8); setTCourts(2); setTScoreType('points');
    setTPtTarget(24); setTSets(1); setTGames(6); setTTiebreak(7); setTDeuce('oro');
    setTAcceptsFamily(false);
    setTPlayers([]); setTInvited([]); setTCreatorInGame(true);
    setTPlayerTab('friends'); setTFriendList([]); setTSearchQ(''); setTSearchResults([]);
    setTProvName(''); setTShowProvInput(false); setTShowAddPanel(false);
    setTPairAssignments([]); setTPairsLocked(false);
    setTDragId(null); setTDragSource(null); setTDropOver(null);
    setTKOHasGroups(false); setTKONumGroups(4); setTKOTeamsPerGroup(3); setTKOTeamsAdvancing(1);
    setTGrpSets(1); setTGrpGames(6); setTGrpTiebreak(7); setTGrpDeuce('oro'); setTGrpTarget(24);
    setNewTId(''); setNewTCode(''); setNewTShareUrl(''); setCopied(false);
  }

  // ── Create tournament ────────────────────────────────────────────────────────
  function handleCreateTournament() {
    if (!currentUser) return;
    const gate = checkTournamentGate(tMaxPlayers);
    if (!gate.allowed) {
      if (gate.reason === 'tournaments_per_month') {
        setPlanError(`Alcanzaste el límite de ${gate.limit} torneo por mes en el plan Free. Activá Pro para torneos ilimitados.`);
      } else {
        setPlanError(`El plan Free permite hasta ${gate.limit} jugadores por torneo. Activá Pro para hasta 64 jugadores.`);
      }
      return;
    }
    setPlanError('');
    const scoreConfig = tScoreType === 'points'
      ? { type: 'points' as const, target: tPtTarget }
      : {
          type: 'traditional' as const,
          setsPerMatch: tSets,
          gamesPerSet: tGames,
          tiebreak: tAllowTies ? undefined : tTiebreak,
          deuce: tDeuce,
          ...(tFormat === 'round_robin' ? { allowTies: tAllowTies } : {}),
        };

    // Knockout/World Cup with groups: separate score config for group stage phase
    const groupScoreConfig = ((tFormat === 'knockout' || tFormat === 'world_cup') && tKOHasGroups)
      ? (tScoreType === 'points'
          ? { type: 'points' as const, target: tGrpTarget }
          : { type: 'traditional' as const, setsPerMatch: tGrpSets, gamesPerSet: tGrpGames, tiebreak: tGrpTiebreak, deuce: tGrpDeuce })
      : undefined;

    // Only creator + provisionals go to confirmed players
    const confirmedPlayers = tPlayers.filter(p => p.isCreator || p.id.startsWith('prov-'));

    // Non-creator non-provisional go to invitedPlayers as pending
    const registeredInvites = tPlayers
      .filter(p => !p.isCreator && !p.id.startsWith('prov-'))
      .map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        shortId: undefined as string | undefined,
        ranking: p.ranking,
        status: 'pending' as const,
        invitedAt: new Date().toISOString(),
        isFriend: true,
        isProvisional: false,
      }));

    // tInvited already contains provisional entries from the wizard
    const tInvitedMapped = tInvited.map(e => ({
      id: e.id, name: e.name, email: e.email, shortId: e.shortId,
      ranking: e.ranking, status: e.status, invitedAt: e.invitedAt,
      isFriend: false, isProvisional: e.isProvisional,
    }));

    const allInvited = [
      ...tInvitedMapped, // from tInvited (the provisional list)
      ...registeredInvites,
    ];

    const isKnockout = tFormat === 'knockout' || tFormat === 'world_cup';
    const tournament = createTournament({
      name: tName.trim() || `Torneo ${FORMAT_LABEL[tFormat ?? 'americano']}`,
      date: tDate,
      time: tTime,
      club: resolvedClub() || '–',
      city: resolvedCity() || '–',
      country: resolvedCountry() || '–',
      format: tFormat ?? 'americano',
      pairType: isKnockout ? 'parejas' : (tModalidad as 'individual' | 'parejas'),
      mixto: isKnockout ? false : tMixto,
      scoreConfig,
      maxPlayers: tMaxPlayers,
      courts: tCourts,
      players: confirmedPlayers,
      invitedPlayers: allInvited,
      creatorId: currentUser.id,
      pjTarget: tFormat === 'round_robin' ? tPjTarget : undefined,
      knockoutConfig: isKnockout ? {
        hasGroups: tKOHasGroups,
        numGroups: tKOHasGroups ? tKONumGroups : 0,
        teamsAdvancing: tKOHasGroups ? tKOTeamsAdvancing : 0,
        currentPhase: tKOHasGroups ? 'group_stage' : 'bracket',
      } : undefined,
      groupScoreConfig,
      acceptsFamilyMembers: tAcceptsFamily,
    });

    if (tPairsLocked && tPairAssignments.length > 0) {
      saveTournament({ ...tournament, fixedPairs: tPairAssignments });
    }

    incrementUsage('tournaments');
    setNewTId(tournament.id);
    setNewTCode(tournament.code);

    // Build snapshot URL so QR works cross-device (no localStorage dependency)
    try {
      const snap = {
        id:  tournament.id,
        n:   tournament.name,
        cl:  tournament.club  || '',
        ci:  tournament.city  || '',
        co:  tournament.country || '',
        st:  tournament.status,
        p:   tournament.players.length,
        mp:  tournament.maxPlayers,
        fmt: tournament.format   || 'americano',
        pt:  tournament.pairType || 'individual',
        lv:  tournament.levelLabel || '',
        d:   tournament.date || '',
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(snap))));
      setNewTShareUrl(`${window.location.origin}/t/${tournament.code}?s=${encoded}`);
    } catch {
      setNewTShareUrl(`${window.location.origin}/t/${tournament.code}`);
    }

    setStep(99);
    showToast('¡Torneo creado exitosamente!', 'success');

    setMyTournaments(getAllTournaments().filter(t =>
      t.creatorId === currentUser.id ||
      t.players.some(p => p.id === currentUser.id) ||
      (t.invitedPlayers ?? []).some(p => p.id === currentUser.id)
    ));
  }

  // ── DnD helpers ──────────────────────────────────────────────────────────────
  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    tPairAssignments.forEach(pa => {
      if (pa.player1Id) ids.add(pa.player1Id);
      if (pa.player2Id) ids.add(pa.player2Id);
    });
    return ids;
  }, [tPairAssignments]);

  const poolPlayers = useMemo(() =>
    tPlayers.filter(p => !assignedIds.has(p.id)),
    [tPlayers, assignedIds]
  );

  function handleDrop(targetKey: string) {
    if (!tDragId || !tDragSource) return;
    const draggedPlayer = tPlayers.find(p => p.id === tDragId);
    if (!draggedPlayer) return;

    setTPairAssignments(prev => {
      const next = prev.map(pa => ({ ...pa }));

      // Remove from source if it was a slot
      if (tDragSource !== 'pool') {
        const [srcPairStr, srcSlot] = tDragSource.split('-');
        const srcIdx = parseInt(srcPairStr);
        const pair = next[srcIdx];
        if (pair) {
          if (srcSlot === 'p1') { pair.player1Id = ''; pair.player1Name = ''; }
          if (srcSlot === 'p2') { pair.player2Id = ''; pair.player2Name = ''; }
        }
      }

      // Place in target slot
      if (targetKey !== 'pool') {
        const [tgtPairStr, tgtSlot] = targetKey.split('-');
        const tgtIdx = parseInt(tgtPairStr);
        const tgtPair = next[tgtIdx];
        if (tgtPair) {
          // If target slot is occupied, return that player to pool (handled by removing from target)
          if (tgtSlot === 'p1') { tgtPair.player1Id = draggedPlayer.id; tgtPair.player1Name = draggedPlayer.name; }
          if (tgtSlot === 'p2') { tgtPair.player2Id = draggedPlayer.id; tgtPair.player2Name = draggedPlayer.name; }
        }
      }

      return next;
    });

    setTDragId(null); setTDragSource(null); setTDropOver(null);
  }

  function removeFromPair(pairIdx: number, slot: 'p1' | 'p2') {
    setTPairAssignments(prev => {
      const next = prev.map(pa => ({ ...pa }));
      const pair = next[pairIdx];
      if (pair) {
        if (slot === 'p1') { pair.player1Id = ''; pair.player1Name = ''; }
        if (slot === 'p2') { pair.player2Id = ''; pair.player2Name = ''; }
      }
      return next;
    });
  }

  const allPairsFilled = useMemo(() =>
    tPairAssignments.length > 0 && tPairAssignments.every(pa => pa.player1Id && pa.player2Id),
    [tPairAssignments]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // WIZARD VIEW
  // ══════════════════════════════════════════════════════════════════════════

  if (view === 'wizard') {

    const wizardHeader = (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid var(--grey-100)' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 4 }}>Nuevo Torneo</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>CREAR TORNEO</h1>
        </div>
        <button onClick={() => { resetWizard(); setView('dashboard'); }} style={{ padding: '9px 18px', border: '1px solid var(--grey-200)', fontSize: 11, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ← Mis Torneos
        </button>
      </div>
    );

    // ── STEP 1: Información Básica ─────────────────────────────────────────
    if (step === 1) {
      return (
        <div style={{ padding: '40px 40px 80px', maxWidth: 960, margin: '0 auto' }}>
          {wizardHeader}
          <WizardSteps current={1} />

          {/* Card 1: Nombre */}
          <div style={card}>
            <div style={secTitle}>Nombre del torneo</div>
            <label style={lbl}>Nombre</label>
            <input type="text" value={tName} onChange={e => setTName(e.target.value)} placeholder="Ej: Americano de Primavera, Copa Club…" style={inp} />
          </div>

          {/* Card 2: Fecha y hora */}
          <div style={card}>
            <div style={secTitle}>Fecha y hora</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Fecha *</label>
                <input type="date" value={tDate} min={today()} onChange={e => setTDate(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Hora *</label>
                <input type="time" value={tTime} onChange={e => setTTime(e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          {/* Card 3: Ubicación */}
          <div style={card}>
            <div style={secTitle}>Ubicación (Club / Sede)</div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>¿Tenés la ubicación para el Torneo?</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['SÍ', 'NO'] as const).map(opt => {
                  const val = opt === 'SÍ';
                  const active = tHasLocation === val;
                  return (
                    <button key={opt} onClick={() => {
                      setTHasLocation(val);
                      if (!val) { setTIsRegClub(null); setTSelectedRegClub(null); setTSelectedSearchClub(null); setTClubSearch(''); setTIsPrivateCourt(false); setTCustomClub(''); }
                    }}
                      style={{ flex: 1, padding: '14px', border: `2px solid ${active ? 'var(--black)' : 'var(--grey-200)'}`, background: active ? 'var(--black)' : '#fff', color: active ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {tHasLocation === true && (
              <div>
                <label style={lbl}>¿Es uno de tus Clubs Registrados?</label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  {(['SÍ', 'NO'] as const).map(opt => {
                    const val = opt === 'SÍ';
                    const active = tIsRegClub === val;
                    return (
                      <button key={opt} onClick={() => {
                        setTIsRegClub(val);
                        setTSelectedRegClub(null); setTSelectedSearchClub(null); setTClubSearch(''); setTIsPrivateCourt(false); setTCustomClub('');
                      }}
                        style={{ flex: 1, padding: '12px', border: `2px solid ${active ? 'var(--black)' : 'var(--grey-200)'}`, background: active ? 'var(--black)' : '#fff', color: active ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {tIsRegClub === true && (
                  <div>
                    {myTClubs.length === 0 ? (
                      <div style={{ padding: '16px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', fontSize: 13, color: 'var(--grey-500)', lineHeight: 1.5 }}>
                        No tenés clubes registrados.{' '}
                        <a href="/dashboard/player/clubs" style={{ color: 'var(--court-blue)', fontWeight: 600, textDecoration: 'none' }}>
                          Ir a Mis Clubes →
                        </a>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={tClubSearch}
                          onChange={e => { setTClubSearch(e.target.value); setTSelectedRegClub(null); }}
                          placeholder="Buscar por nombre, ciudad…"
                          style={{ ...inp, marginBottom: 10 }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {myTClubs
                            .filter(c => {
                              const q = tClubSearch.toLowerCase();
                              return !q || c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
                            })
                            .map(c => (
                              <button key={c.id} onClick={() => setTSelectedRegClub(c)}
                                style={{ padding: '14px 18px', textAlign: 'left', border: `2px solid ${tSelectedRegClub?.id === c.id ? 'var(--black)' : 'var(--grey-200)'}`, background: tSelectedRegClub?.id === c.id ? 'var(--black)' : '#fff', color: tSelectedRegClub?.id === c.id ? '#fff' : 'var(--black)', cursor: 'pointer' }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, textTransform: 'uppercase' }}>{c.name}</div>
                                <div style={{ fontSize: 11, marginTop: 2, color: tSelectedRegClub?.id === c.id ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>{c.city}, {c.country}</div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tIsRegClub === false && (
                  <div>
                    {!tIsPrivateCourt ? (
                      <div>
                        <input
                          type="text"
                          value={tClubSearch}
                          onChange={e => { setTClubSearch(e.target.value); setTSelectedSearchClub(null); }}
                          placeholder="Buscar club por nombre, país, ciudad…"
                          style={{ ...inp, marginBottom: 10 }}
                        />
                        {tSelectedSearchClub && (
                          <div style={{ padding: '12px 16px', background: 'var(--grey-50)', border: '2px solid var(--black)', marginBottom: 10, fontSize: 13, fontWeight: 600 }}>
                            ✓ {tSelectedSearchClub.name} · {tSelectedSearchClub.city}, {tSelectedSearchClub.country}
                          </div>
                        )}
                        {tClubSearch.trim().length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                            {tAllClubs
                              .filter(c => {
                                const q = tClubSearch.toLowerCase();
                                return c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
                              })
                              .slice(0, 8)
                              .map(c => (
                                <button key={c.id} onClick={() => { setTSelectedSearchClub(c); setTClubSearch(''); }}
                                  style={{ padding: '12px 16px', textAlign: 'left', border: `2px solid ${tSelectedSearchClub?.id === c.id ? 'var(--black)' : 'var(--grey-200)'}`, background: tSelectedSearchClub?.id === c.id ? 'var(--black)' : '#fff', color: tSelectedSearchClub?.id === c.id ? '#fff' : 'var(--black)', cursor: 'pointer' }}>
                                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase' }}>{c.name}</div>
                                  <div style={{ fontSize: 11, marginTop: 2, color: tSelectedSearchClub?.id === c.id ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>{c.city}, {c.country}</div>
                                </button>
                              ))}
                          </div>
                        )}
                        <button
                          onClick={() => { setTIsPrivateCourt(true); setTSelectedSearchClub(null); setTClubSearch(''); }}
                          style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', border: '1px dashed var(--grey-300)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--grey-500)' }}
                        >
                          Es una pista privada / No encontré el club →
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label style={lbl}>Nombre del lugar *</label>
                        <input type="text" value={tCustomClub} onChange={e => setTCustomClub(e.target.value)} placeholder="Ej: Cancha de Lucas, Club privado…" style={{ ...inp, marginBottom: 10 }} />
                        <button
                          onClick={() => { setTIsPrivateCourt(false); setTCustomClub(''); }}
                          style={{ fontSize: 12, color: 'var(--grey-500)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' }}
                        >
                          ← Volver a buscar un club
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {tHasLocation === false && (
              <div style={{ padding: '12px 16px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', fontSize: 12, color: 'var(--grey-500)' }}>
                Podés agregar la ubicación desde la gestión del torneo más adelante.
              </div>
            )}
          </div>

          <NavBtns onNext={() => setStep(2)} nextLabel="Paso 2: Formato →" disabled={!step1Valid} />
        </div>
      );
    }

    // ── STEP 2: Formato + Configuración ───────────────────────────────────
    if (step === 2) {
      const fmtFunctional = tFormat ? FORMAT_INFO[tFormat].functional : false;

      return (
        <div style={{ padding: '40px 40px 80px', maxWidth: 960, margin: '0 auto' }}>
          {wizardHeader}
          <WizardSteps current={2} />

          {/* Card 1: Formato */}
          <div style={card}>
            <div style={secTitle}>Formato del torneo</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(Object.keys(FORMAT_INFO) as FormatKey[]).map(fk => {
                const f = FORMAT_INFO[fk];
                const active = tFormat === fk;
                return (
                  <button key={fk}
                    onClick={() => {
                      if (!f.functional) return;
                      setTFormat(fk);
                      if (fk === 'americano' || fk === 'mexicano') {
                        setTScoreType('points');
                        setTPtTarget(24);
                      } else if (fk === 'round_robin') {
                        setTScoreType('traditional');
                      }
                    }}
                    style={{ padding: '16px', border: `2px solid ${active ? 'var(--black)' : 'var(--grey-200)'}`, background: active ? 'var(--black)' : f.functional ? '#fff' : 'var(--grey-50)', cursor: f.functional ? 'pointer' : 'default', textAlign: 'left', position: 'relative', opacity: f.functional ? 1 : 0.65 }}>
                    {!f.functional && (
                      <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--grey-200)', color: 'var(--grey-500)', padding: '2px 6px' }}>Próximamente</div>
                    )}
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', color: active ? '#fff' : f.functional ? 'var(--black)' : 'var(--grey-400)', marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)', lineHeight: 1.4 }}>{f.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Knockout / World Cup config — shown when format = knockout or world_cup */}
          {(tFormat === 'knockout' || tFormat === 'world_cup') && (() => {
            const isWC = tFormat === 'world_cup';
            const koPlayers = tKONumGroups * tKOTeamsPerGroup * 2;
            const totalQual  = tKONumGroups * tKOTeamsAdvancing;
            let bracketSize = 2; while (bracketSize < totalQual) bracketSize *= 2;
            const needsBestOf = totalQual < bracketSize;
            const deuceBtns = (
              curVal: 'ventaja'|'oro'|'plata'|'ipf',
              setter: (v: 'ventaja'|'oro'|'plata'|'ipf') => void,
            ) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  { v: 'ventaja' as const, label: 'Ventaja Tradicional', desc: 'D y AD hasta ganar 2 consecutivos.' },
                  { v: 'oro'     as const, label: 'Punto de Oro',        desc: 'El siguiente punto en Deuce gana el game.' },
                  { v: 'plata'   as const, label: 'Punto de Plata',      desc: 'Ventaja al primero en puntuar en Deuce. Si la pierde, vuelve a Deuce.' },
                  { v: 'ipf'     as const, label: 'IPF',                 desc: 'Punto de Oro federado. El siguiente punto gana.' },
                ] as const).map(o => (
                  <button key={o.v} onClick={() => setter(o.v)}
                    style={{ padding: '10px 14px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10, border: `1px solid ${curVal === o.v ? 'var(--black)' : 'var(--grey-200)'}`, background: curVal === o.v ? '#111' : '#fff', color: curVal === o.v ? '#fff' : 'var(--black)' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${curVal === o.v ? 'var(--neon)' : 'var(--grey-300)'}`, background: curVal === o.v ? 'var(--neon)' : 'transparent', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{o.label}</div>
                      <div style={{ fontSize: 10, color: curVal === o.v ? 'rgba(255,255,255,0.5)' : 'var(--grey-400)', lineHeight: 1.4 }}>{o.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            );
            const traditionalParams = (
              sets: number, setSets: (n:number)=>void,
              games: number, setGames: (n:number)=>void,
              tb: number, setTb: (n:number)=>void,
              deuce: 'ventaja'|'oro'|'plata'|'ipf', setDeuce: (v:'ventaja'|'oro'|'plata'|'ipf')=>void,
            ) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={lbl}>Sets por partido</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3].map(n => (
                      <button key={n} onClick={() => setSets(n)}
                        style={{ flex: 1, padding: '12px 8px', border: `2px solid ${sets === n ? 'var(--black)' : 'var(--grey-200)'}`, background: sets === n ? 'var(--black)' : '#fff', color: sets === n ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3, color: sets === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>
                          {n === 1 ? 'set' : n === 2 ? 'sets (tb)' : 'best of 3'}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 6 }}>
                    {sets === 2 ? 'Si cada equipo gana 1 set, se juega tiebreak para desempatar.' : sets === 3 ? 'Gana el primero en ganar 2 sets.' : 'El que gana el set, gana el partido.'}
                  </div>
                </div>
                <div>
                  <label style={lbl}>Games por set</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[4, 5, 6].map(n => (
                      <button key={n} onClick={() => setGames(n)}
                        style={{ width: 48, height: 42, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, cursor: 'pointer', border: `2px solid ${games === n ? 'var(--black)' : 'var(--grey-200)'}`, background: games === n ? 'var(--black)' : '#fff', color: games === n ? '#fff' : 'var(--black)' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={lbl}>Tiebreak a</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[7, 10].map(n => (
                      <button key={n} onClick={() => setTb(n)}
                        style={{ width: 52, height: 42, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tb === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tb === n ? 'var(--black)' : '#fff', color: tb === n ? '#fff' : 'var(--black)' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={lbl}>Regla de Deuce / Ventaja</label>
                  {deuceBtns(deuce, setDeuce)}
                </div>
              </div>
            );
            const pointsParam = (target: number, setter: (n:number)=>void) => (
              <div>
                <label style={lbl}>Puntos objetivo</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[16, 24, 32].map(n => (
                    <button key={n} onClick={() => setter(n)}
                      style={{ width: 58, height: 48, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, cursor: 'pointer', border: `2px solid ${target === n ? 'var(--black)' : 'var(--grey-200)'}`, background: target === n ? 'var(--black)' : '#fff', color: target === n ? '#fff' : 'var(--black)' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            );
            return (
              <>
                <div style={{ padding: '12px 16px', background: 'rgba(214,255,0,0.06)', border: '1px solid rgba(214,255,0,0.3)', marginBottom: 8, fontSize: 12, color: 'var(--black)' }}>
                  {isWC
                    ? <>El <strong>World Cup</strong> es por <strong>Parejas</strong>: fase de grupos (todos contra todos) seguida de un cuadro de eliminatorias estilo Mundial. Los jugadores se organizan en parejas antes de iniciar.</>
                    : <>Knockout siempre es por <strong>Parejas</strong>. Los jugadores se organizan en parejas antes de iniciar.</>}
                </div>

                {/* PHASE I: Groups */}
                <div style={card}>
                  <div style={secTitle}>{isWC ? 'Fase I — Grupos' : 'Fase I — Grupos (opcional)'}</div>
                  {isWC ? (
                    <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 16 }}>
                      Formato Mundial: grupos de <strong>4 equipos</strong>, clasifican los <strong>2 primeros</strong> de cada grupo. Elegí cuántos grupos.
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 12 }}>
                        ¿Deseas una fase de grupos clasificatoria antes del cuadro de eliminatorias?
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginBottom: tKOHasGroups ? 20 : 0 }}>
                        {([{ label: 'Sin grupos', val: false }, { label: 'Con grupos', val: true }] as const).map(o => (
                          <button key={String(o.val)} onClick={() => setTKOHasGroups(o.val)}
                            style={{ flex: 1, padding: '12px', border: `2px solid ${tKOHasGroups === o.val ? 'var(--black)' : 'var(--grey-200)'}`, background: tKOHasGroups === o.val ? 'var(--black)' : '#fff', color: tKOHasGroups === o.val ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {tKOHasGroups && (
                    <>
                      {isWC ? (
                        <div style={{ marginBottom: 16 }}>
                          <label style={lbl}>Número de grupos</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {[4, 8].map(n => (
                              <button key={n} onClick={() => setTKONumGroups(n)}
                                style={{ flex: 1, padding: '14px 8px', fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer', border: `2px solid ${tKONumGroups === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tKONumGroups === n ? 'var(--black)' : '#fff', color: tKONumGroups === n ? '#fff' : 'var(--black)', textAlign: 'center' }}>
                                <div style={{ fontSize: 24, lineHeight: 1 }}>{n}</div>
                                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, color: tKONumGroups === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>
                                  grupos · {n * 4} equipos · {n * 8} jugadores
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <label style={lbl}>Número de grupos</label>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {[2,3,4,5,6,7,8,9,10].map(n => (
                              <button key={n} onClick={() => setTKONumGroups(n)}
                                style={{ width: 40, height: 38, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tKONumGroups === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tKONumGroups === n ? 'var(--black)' : '#fff', color: tKONumGroups === n ? '#fff' : 'var(--black)' }}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label style={lbl}>Equipos por grupo</label>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {[2,3,4,5,6,7,8,9,10].map(n => (
                              <button key={n} onClick={() => setTKOTeamsPerGroup(n)}
                                style={{ width: 40, height: 38, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tKOTeamsPerGroup === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tKOTeamsPerGroup === n ? 'var(--black)' : '#fff', color: tKOTeamsPerGroup === n ? '#fff' : 'var(--black)' }}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label style={lbl}>Clasifican por grupo</label>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {Array.from({ length: Math.max(1, tKOTeamsPerGroup - 1) }, (_, i) => i + 1).map(n => (
                              <button key={n} onClick={() => setTKOTeamsAdvancing(n)}
                                style={{ width: 40, height: 38, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tKOTeamsAdvancing === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tKOTeamsAdvancing === n ? 'var(--black)' : '#fff', color: tKOTeamsAdvancing === n ? '#fff' : 'var(--black)' }}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      )}

                      {/* Auto-calculated summary */}
                      <div style={{ background: 'var(--black)', color: '#fff', padding: '16px 20px', marginBottom: needsBestOf ? 8 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--neon)', lineHeight: 1 }}>{koPlayers}</div>
                            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>Jugadores totales</div>
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', flex: 1 }}>
                            {tKONumGroups} grupos × {tKOTeamsPerGroup} equipos × 2 jugadores = <strong style={{ color: '#fff' }}>{koPlayers} jugadores</strong><br />
                            {totalQual} equipos clasifican → cuadro de {bracketSize}
                            {needsBestOf && <span style={{ color: 'var(--neon)' }}> (+{bracketSize - totalQual} mejores no clasificados)</span>}
                          </div>
                        </div>
                      </div>
                      {needsBestOf && (
                        <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', fontSize: 11, color: '#92400e' }}>
                          ℹ️ Con {totalQual} equipos clasificados el cuadro será de {bracketSize}. El sistema seleccionará automáticamente los {bracketSize - totalQual} mejores equipos no clasificados para completarlo.
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* PUNTUACIÓN */}
                <div style={card}>
                  <div style={secTitle}>Puntuación</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[{ v: 'points', label: 'Por Puntos' }, { v: 'traditional', label: 'Tradicional (sets)' }].map(o => (
                      <button key={o.v} onClick={() => setTScoreType(o.v as 'points' | 'traditional')}
                        style={{ padding: '10px 18px', border: `2px solid ${tScoreType === o.v ? 'var(--black)' : 'var(--grey-200)'}`, background: tScoreType === o.v ? 'var(--black)' : '#fff', color: tScoreType === o.v ? '#fff' : 'var(--black)', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                  {tKOHasGroups ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div style={{ borderRight: '1px solid var(--grey-100)', paddingRight: 20 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--grey-100)' }}>Fase I — Grupos</div>
                        {tScoreType === 'traditional'
                          ? traditionalParams(tGrpSets, setTGrpSets, tGrpGames, setTGrpGames, tGrpTiebreak, setTGrpTiebreak, tGrpDeuce, setTGrpDeuce)
                          : pointsParam(tGrpTarget, setTGrpTarget)}
                      </div>
                      <div style={{ paddingLeft: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--grey-100)' }}>{isWC ? 'Fase II — Cuadro' : 'Fase II — Knockout'}</div>
                        {tScoreType === 'traditional'
                          ? traditionalParams(tSets, setTSets, tGames, setTGames, tTiebreak, setTTiebreak, tDeuce, setTDeuce)
                          : pointsParam(tPtTarget, setTPtTarget)}
                      </div>
                    </div>
                  ) : (
                    tScoreType === 'traditional'
                      ? traditionalParams(tSets, setTSets, tGames, setTGames, tTiebreak, setTTiebreak, tDeuce, setTDeuce)
                      : pointsParam(tPtTarget, setTPtTarget)
                  )}
                </div>
              </>
            );
          })()}

          {/* Card 2: Modalidad (only if format is functional and not knockout/world_cup) */}
          {tFormat && fmtFunctional && tFormat !== 'knockout' && tFormat !== 'world_cup' && (
            <div style={card}>
              <div style={secTitle}>Modalidad</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['individual', 'parejas'] as const).map(m => (
                  <button key={m} onClick={() => setTModalidad(m)}
                    style={{ padding: '10px 20px', border: `2px solid ${tModalidad === m ? 'var(--black)' : 'var(--grey-200)'}`, background: tModalidad === m ? 'var(--black)' : '#fff', color: tModalidad === m ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card 2b: Mixto toggle (only for americano/mexicano) */}
          {tFormat && fmtFunctional && tFormat !== 'knockout' && (tFormat === 'americano' || tFormat === 'mexicano') && (
            <div style={card}>
              <div style={secTitle}>Mixto</div>
              <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 12 }}>¿Es torneo mixto (Hombres + Mujeres)?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([{ label: 'No', val: false }, { label: 'Sí', val: true }] as const).map(o => (
                  <button key={String(o.val)} onClick={() => setTMixto(o.val)}
                    style={{ padding: '10px 20px', border: `2px solid ${tMixto === o.val ? 'var(--black)' : 'var(--grey-200)'}`, background: tMixto === o.val ? 'var(--black)' : '#fff', color: tMixto === o.val ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card 2c: Participantes (familiares) */}
          {tFormat && (
            <div style={card}>
              <div style={secTitle}>Participantes</div>
              <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 12 }}>Permite que un responsable inscriba a un familiar menor sin cuenta propia.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([{ label: 'No', val: false }, { label: 'Sí', val: true }] as const).map(o => (
                  <button key={String(o.val)} onClick={() => setTAcceptsFamily(o.val)}
                    style={{ padding: '10px 20px', border: `2px solid ${tAcceptsFamily === o.val ? 'var(--black)' : 'var(--grey-200)'}`, background: tAcceptsFamily === o.val ? 'var(--black)' : '#fff', color: tAcceptsFamily === o.val ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>
                    {o.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 8 }}>Acepta participantes familiares (menores)</div>
            </div>
          )}

          {/* Card 3: Jugadores y canchas */}
          {tFormat && (
            <div style={card}>
              <div style={secTitle}>Jugadores y canchas</div>
              {(tFormat === 'knockout' || tFormat === 'world_cup') && tKOHasGroups ? (
                /* Knockout/World Cup with groups: player count is auto-calculated */
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Jugadores (calculado automáticamente)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--black)', lineHeight: 1 }}>{tMaxPlayers}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-500)' }}>
                      {tKONumGroups} grupos × {tKOTeamsPerGroup} equipos × 2 jugadores
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Jugadores</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {PLAYER_COUNT_OPTIONS.map(n => {
                      const planLimit = getPlayerLimits().maxPlayersPerTournament;
                      const locked = planLimit !== -1 && n > planLimit;
                      return (
                        <button key={n}
                          onClick={() => { if (!locked) { setTMaxPlayers(n); setPlanError(''); } }}
                          title={locked ? `Requiere Plan Pro (máx ${planLimit} en Free)` : undefined}
                          style={{
                            width: 52, height: 44,
                            fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
                            cursor: locked ? 'not-allowed' : 'pointer',
                            border: `2px solid ${tMaxPlayers === n ? 'var(--black)' : locked ? 'var(--grey-100)' : 'var(--grey-200)'}`,
                            background: tMaxPlayers === n ? 'var(--black)' : locked ? 'var(--grey-50)' : '#fff',
                            color: tMaxPlayers === n ? '#fff' : locked ? 'var(--grey-300)' : 'var(--black)',
                            position: 'relative',
                          }}>
                          {locked && <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 8 }}>🔒</span>}
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  {getPlayerLimits().maxPlayersPerTournament !== -1 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--grey-400)' }}>
                      Plan Free: máx {getPlayerLimits().maxPlayersPerTournament} jugadores.{' '}
                      <a href="/pricing" style={{ color: 'var(--black)', fontWeight: 700 }}>Activar Pro →</a>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label style={lbl}>Canchas (pistas)</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button key={n} onClick={() => setTCourts(n)}
                      style={{ width: 44, height: 44, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tCourts === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tCourts === n ? 'var(--black)' : '#fff', color: tCourts === n ? '#fff' : 'var(--black)' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Duration estimate — shown whenever format + courts + players are set */}
          {tFormat && (() => {
            const sc: import('@/lib/game-engine').ScoreConfig = tScoreType === 'points'
              ? { type: 'points', target: tPtTarget }
              : { type: 'traditional', setsPerMatch: tSets, gamesPerSet: tGames, tiebreak: tTiebreak, deuce: tDeuce };
            const kc: import('@/lib/game-engine').KnockoutConfig | undefined =
              (tFormat === 'knockout' || tFormat === 'world_cup') && tKOHasGroups
                ? { hasGroups: true, numGroups: tKONumGroups, teamsAdvancing: tKOTeamsAdvancing, currentPhase: 'group_stage' }
                : tFormat === 'world_cup'
                  ? { hasGroups: true, numGroups: tKONumGroups, teamsAdvancing: 2, currentPhase: 'group_stage' }
                  : undefined;
            const est = estimateEventDuration({
              format: tFormat,
              scoreConfig: sc,
              maxPlayers: tMaxPlayers,
              courts: tCourts,
              pjTarget: tPjTarget,
              knockoutConfig: kc,
            });
            if (!est) return null;
            const matchDur = matchDurationMinutes(sc);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 16 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>⏱</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#166534', marginBottom: 3 }}>Duración estimada del torneo</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#15803d', fontFamily: 'var(--font-display)' }}>
                    {formatDurationRange(est.min, est.max)}
                  </div>
                  <div style={{ fontSize: 10, color: '#4ade80', marginTop: 2 }}>
                    {est.clockRounds} rondas · partido: {formatDurationRange(matchDur.min, matchDur.max)} · nivel intermedio
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Card 3b: PJ selector — only for Round Robin */}
          {tFormat === 'round_robin' && (
            <div style={card}>
              <div style={secTitle}>Partidos por jugador / equipo (PJ)</div>
              <label style={lbl}>Juegos por jugador o equipo</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button key={n} onClick={() => setTPjTarget(n)}
                    style={{ width: 44, height: 44, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tPjTarget === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tPjTarget === n ? 'var(--black)' : '#fff', color: tPjTarget === n ? '#fff' : 'var(--black)' }}>
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 10 }}>
                Rondas totales: {tCourts > 0 ? Math.ceil((tMaxPlayers * tPjTarget) / (tCourts * 4)) : '–'}
              </div>
            </div>
          )}

          {/* Card 4: Puntuación */}
          {tFormat && tFormat !== 'knockout' && tFormat !== 'world_cup' && (
            <div style={card}>
              <div style={secTitle}>Puntuación</div>

              {(tFormat === 'americano' || tFormat === 'mexicano') ? (
                /* Americano / Mexicano: only multiples-of-4 points picker */
                <div>
                  <label style={lbl}>Puntos (múltiplos de 4)</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[4, 8, 12, 16, 20, 24, 28, 32].map(n => (
                      <button key={n} onClick={() => setTPtTarget(n)}
                        style={{ width: 52, height: 44, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tPtTarget === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tPtTarget === n ? 'var(--black)' : '#fff', color: tPtTarget === n ? '#fff' : 'var(--black)' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ) : tFormat === 'round_robin' ? (
                /* Round Robin: traditional only — Quick Game style */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ fontSize: 11, color: 'var(--grey-500)', padding: '8px 12px', background: 'var(--grey-50)', border: '1px solid var(--grey-100)' }}>
                    Puntuación tradicional (sets y games). V: +3 pts · Empate: +1 pt · Derrota: -1 pt
                  </div>
                  <div>
                    <label style={lbl}>Sets por partido</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[1, 3].map(n => (
                        <button key={n} onClick={() => setTSets(n)}
                          style={{ flex: 1, padding: '16px', border: `2px solid ${tSets === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tSets === n ? 'var(--black)' : '#fff', color: tSets === n ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, color: tSets === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>Set{n > 1 ? 's' : ''}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Games por set</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[4, 5, 6].map(n => (
                        <button key={n} onClick={() => setTGames(n)}
                          style={{ flex: 1, padding: '14px', border: `2px solid ${tGames === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tGames === n ? 'var(--black)' : '#fff', color: tGames === n ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, color: tGames === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>games</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>¿Se permiten empates (T) en el set? — ej. 6-6</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {([{ v: false, label: 'No', sub: 'Siempre hay ganador' }, { v: true, label: 'Sí', sub: 'Empate válido (T)' }] as const).map(o => (
                        <button key={String(o.v)} onClick={() => setTAllowTies(o.v)}
                          style={{ flex: 1, padding: '14px', border: `2px solid ${tAllowTies === o.v ? 'var(--black)' : 'var(--grey-200)'}`, background: tAllowTies === o.v ? 'var(--black)' : '#fff', color: tAllowTies === o.v ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{o.label}</div>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, color: tAllowTies === o.v ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>{o.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {!tAllowTies && (
                  <div>
                    <label style={lbl}>Tiebreak (puntos para ganar)</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[7, 10].map(n => (
                        <button key={n} onClick={() => setTTiebreak(n)}
                          style={{ flex: 1, padding: '14px', border: `2px solid ${tTiebreak === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tTiebreak === n ? 'var(--black)' : '#fff', color: tTiebreak === n ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, color: tTiebreak === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>puntos</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  )}
                  <div>
                    <label style={lbl}>Regla de Deuce / Ventaja</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {([
                        { v: 'ventaja' as const, label: 'Ventaja Tradicional', desc: 'D y AD hasta que un equipo gane 2 puntos consecutivos.' },
                        { v: 'oro'     as const, label: 'Punto de Oro',        desc: 'En Deuce, el siguiente punto gana el game. (Sin ventaja)' },
                        { v: 'plata'   as const, label: 'Punto de Plata',      desc: 'Ventaja para quien gana el primer punto del Deuce. Si lo pierde, vuelve a Deuce.' },
                        { v: 'ipf'     as const, label: 'IPF',                 desc: 'Como Punto de Oro. El siguiente punto en Deuce gana el game. (Reglamento federado)' },
                      ]).map(o => (
                        <button key={o.v} onClick={() => setTDeuce(o.v)}
                          style={{ padding: '12px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12, border: `1px solid ${tDeuce === o.v ? 'var(--black)' : 'var(--grey-200)'}`, background: tDeuce === o.v ? 'var(--grey-900, #111)' : '#fff', color: tDeuce === o.v ? '#fff' : 'var(--black)' }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${tDeuce === o.v ? 'var(--neon, #d4f53c)' : 'var(--grey-300)'}`, background: tDeuce === o.v ? 'var(--neon, #d4f53c)' : 'transparent', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{o.label}</div>
                            <div style={{ fontSize: 11, color: tDeuce === o.v ? 'rgba(255,255,255,0.5)' : 'var(--grey-400)', lineHeight: 1.5 }}>{o.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Other formats (round_robin, knockout-without-groups): both scoring options */
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {[{ v: 'points', label: 'Por Puntos' }, { v: 'traditional', label: 'Tradicional (sets)' }].map(o => (
                      <button key={o.v} onClick={() => setTScoreType(o.v as 'points' | 'traditional')}
                        style={{ padding: '10px 18px', border: `2px solid ${tScoreType === o.v ? 'var(--black)' : 'var(--grey-200)'}`, background: tScoreType === o.v ? 'var(--black)' : '#fff', color: tScoreType === o.v ? '#fff' : 'var(--black)', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {o.label}
                      </button>
                    ))}
                  </div>

                  {tScoreType === 'points' && (
                    <div>
                      <label style={lbl}>Puntos objetivo</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[16, 24, 32].map(n => (
                          <button key={n} onClick={() => setTPtTarget(n)}
                            style={{ width: 58, height: 48, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tPtTarget === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tPtTarget === n ? 'var(--black)' : '#fff', color: tPtTarget === n ? '#fff' : 'var(--black)' }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {tScoreType === 'traditional' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label style={lbl}>Sets por partido</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[1, 2, 3].map(n => (
                            <button key={n} onClick={() => setTSets(n)}
                              style={{ flex: 1, padding: '12px 8px', border: `2px solid ${tSets === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tSets === n ? 'var(--black)' : '#fff', color: tSets === n ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3, color: tSets === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>
                                {n === 1 ? 'set' : n === 2 ? 'sets (tb)' : 'best of 3'}
                              </div>
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 6 }}>
                          {tSets === 2 ? 'Con 1-1 se juega tiebreak para desempatar.' : tSets === 3 ? 'Gana el primero en ganar 2 sets.' : 'El que gana el único set gana el partido.'}
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>Games por set</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[4, 5, 6].map(n => (
                            <button key={n} onClick={() => setTGames(n)}
                              style={{ width: 52, height: 44, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tGames === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tGames === n ? 'var(--black)' : '#fff', color: tGames === n ? '#fff' : 'var(--black)' }}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>Tiebreak a</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[7, 10].map(n => (
                            <button key={n} onClick={() => setTTiebreak(n)}
                              style={{ width: 52, height: 44, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tTiebreak === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tTiebreak === n ? 'var(--black)' : '#fff', color: tTiebreak === n ? '#fff' : 'var(--black)' }}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>Regla de Deuce / Ventaja</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {([
                            { v: 'ventaja' as const, label: 'Ventaja Tradicional', desc: 'D y AD hasta que un equipo gane 2 puntos consecutivos.' },
                            { v: 'oro'     as const, label: 'Punto de Oro',        desc: 'En Deuce, el siguiente punto gana el game.' },
                            { v: 'plata'   as const, label: 'Punto de Plata',      desc: 'Ventaja al primero en puntuar. Si la pierde, vuelve a Deuce.' },
                            { v: 'ipf'     as const, label: 'IPF',                 desc: 'Como Punto de Oro. Reglamento federado.' },
                          ]).map(o => (
                            <button key={o.v} onClick={() => setTDeuce(o.v)}
                              style={{ padding: '10px 14px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10, border: `1px solid ${tDeuce === o.v ? 'var(--black)' : 'var(--grey-200)'}`, background: tDeuce === o.v ? '#111' : '#fff', color: tDeuce === o.v ? '#fff' : 'var(--black)' }}>
                              <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${tDeuce === o.v ? 'var(--neon)' : 'var(--grey-300)'}`, background: tDeuce === o.v ? 'var(--neon)' : 'transparent', flexShrink: 0, marginTop: 2 }} />
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{o.label}</div>
                                <div style={{ fontSize: 10, color: tDeuce === o.v ? 'rgba(255,255,255,0.5)' : 'var(--grey-400)', lineHeight: 1.4 }}>{o.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <NavBtns onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Paso 3: Jugadores →" disabled={!step2Valid} />
        </div>
      );
    }

    // ── STEP 3: Jugadores + Parejas ────────────────────────────────────────
    if (step === 3) {
      const canAddMore = tPlayers.length < tMaxPlayers;
      const needsPairs = (tModalidad === 'parejas' || tMixto) && tPlayers.length === tMaxPlayers;
      const canCreate = tPlayers.length >= 1 && (!needsPairs || tPairsLocked);

      return (
        <div style={{ padding: '40px 40px 80px', maxWidth: 960, margin: '0 auto' }}>
          {wizardHeader}
          <WizardSteps current={3} />

          {/* A: Lista de jugadores */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)' }}>
                Jugadores ({tPlayers.length} / {tMaxPlayers})
              </div>
            </div>

            {tPlayers.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--grey-300)', fontStyle: 'italic', padding: '8px 0', marginBottom: 12 }}>
                Aún no hay jugadores confirmados.
              </div>
            )}

            {/* Confirmed players */}
            {tPlayers.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, border: '1px solid var(--grey-200)', background: p.isCreator ? 'rgba(214,255,0,0.04)' : '#fff' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: p.isCreator ? 'var(--black)' : 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {initials(p.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  {p.isCreator && <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>Creador</div>}
                </div>
                <span style={{ fontSize: 10, color: 'var(--grey-500)' }}>#{p.ranking}</span>
                {p.isCreator && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: 'var(--turf-green)', color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CREADOR</span>
                )}
                {!p.isCreator && (
                  <button onClick={() => {
                    setTPlayers(prev => prev.filter(x => x.id !== p.id));
                    setTFriendList(prev => [...prev]);
                    setTPairAssignments([]);
                    setTPairsLocked(false);
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-300)', padding: 0, lineHeight: 1 }}>×</button>
                )}
              </div>
            ))}

            {/* Pending invited */}
            {tInvited.filter(e => e.status === 'pending').map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, border: '1px dashed var(--grey-200)' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--grey-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {initials(e.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{e.name}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: 'var(--grey-100)', color: 'var(--grey-500)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pendiente</span>
                <button onClick={() => setTInvited(prev => prev.filter(x => x.id !== e.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-300)', padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}

            {/* Creator toggle */}
            {currentUser && (
              <div style={{ marginTop: 12 }}>
                {tCreatorInGame ? (
                  <button onClick={() => {
                    setTCreatorInGame(false);
                    setTPlayers(prev => prev.filter(p => p.id !== currentUser.id));
                    setTPairAssignments([]); setTPairsLocked(false);
                  }} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-500)' }}>
                    Salirme del torneo
                  </button>
                ) : (
                  <button onClick={() => {
                    setTCreatorInGame(true);
                    if (!tPlayers.some(p => p.id === currentUser.id)) {
                      setTPlayers(prev => [{ id: currentUser.id, name: currentUser.name, ranking: currentUser.ranking ?? 100, isCreator: true, email: currentUser.email }, ...prev]);
                    }
                    setTPairAssignments([]); setTPairsLocked(false);
                  }} style={{ padding: '8px 16px', background: 'var(--turf-green)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fff' }}>
                    Unirme al torneo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Add player */}
          {canAddMore && (
            <div style={card}>
              <div style={secTitle}>Agregar Jugador</div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--grey-200)' }}>
                {(['friends', 'search'] as const).map(tab => {
                  const labels = { friends: 'Mis Amistades', search: 'Buscar Jugador' };
                  return (
                    <button key={tab} onClick={() => { setTPlayerTab(tab); setTSearchQ(''); setTSearchResults([]); }}
                      style={{ padding: '10px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', borderBottom: `2px solid ${tPlayerTab === tab ? 'var(--black)' : 'transparent'}`, background: 'transparent', color: tPlayerTab === tab ? 'var(--black)' : 'var(--grey-400)', cursor: 'pointer', marginBottom: -2 }}>
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* Friends tab */}
              {tPlayerTab === 'friends' && (
                <div>
                  {tFriendList.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--grey-400)', padding: '16px 0' }}>No tenés amigos disponibles para agregar.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                      {tFriendList.filter(f => !tPlayers.some(p => p.id === f.id)).map(f => (
                        <button key={f.id} onClick={() => {
                          setTPlayers(prev => [...prev, { id: f.id, name: f.name, ranking: f.ranking, isCreator: false, email: f.email }]);
                          setTPairAssignments([]); setTPairsLocked(false);
                        }}
                          style={{ padding: '12px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {initials(f.name)}
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>#{f.ranking}</span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{f.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 2 }}>{f.shortId}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search tab */}
              {tPlayerTab === 'search' && (
                <div>
                  <input type="text" value={tSearchQ} onChange={e => setTSearchQ(e.target.value)} placeholder="Buscar por nombre, email o #ID…" style={{ ...inp, marginBottom: 0 }} />
                  {tSearchQ.trim().length >= 2 && (
                    <div style={{ border: '1px solid var(--grey-200)', borderTop: 'none', maxHeight: 280, overflowY: 'auto' }}>
                      {tSearchResults.length === 0 ? (
                        <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey-400)' }}>No se encontraron jugadores.</div>
                      ) : tSearchResults.map(p => (
                        <button key={p.id} onClick={() => {
                          setTPlayers(prev => [...prev, { id: p.id, name: p.name, ranking: p.ranking, isCreator: false, email: p.email }]);
                          setTSearchQ(''); setTSearchResults([]);
                          setTPairAssignments([]); setTPairsLocked(false);
                        }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--grey-100)', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {initials(p.name)}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.shortId} · #{p.ranking}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {tSearchQ.trim().length > 0 && tSearchQ.trim().length < 2 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--grey-400)' }}>Escribí al menos 2 caracteres para buscar.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Provisional player */}
          <div style={{ marginBottom: 16 }}>
            {!tShowProvInput ? (
              <button onClick={() => setTShowProvInput(true)} style={{ padding: '8px 16px', background: 'none', border: '1px dashed var(--grey-300)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-500)' }}>
                + Nombre Provisional
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={tProvName} onChange={e => setTProvName(e.target.value)} placeholder="Nombre del jugador provisional…" style={{ ...inp, flex: 1 }} />
                <button onClick={() => {
                  if (tProvName.trim() && canAddMore) {
                    setTPlayers(prev => [...prev, { id: `prov-${Date.now()}`, name: tProvName.trim(), ranking: 999, isCreator: false }]);
                    setTProvName(''); setTShowProvInput(false);
                    setTPairAssignments([]); setTPairsLocked(false);
                  }
                }} style={{ padding: '8px 16px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  Agregar
                </button>
                <button onClick={() => { setTShowProvInput(false); setTProvName(''); }} style={{ padding: '8px 12px', background: 'none', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, color: 'var(--grey-400)' }}>
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* B: Armar Parejas */}
          {needsPairs && (
            <div style={card}>
              <div style={secTitle}>Armar Parejas</div>

              {tMixto && (
                <div style={{ padding: '10px 14px', background: '#fef9c3', border: '1px solid #fde047', fontSize: 12, color: '#854d0e', marginBottom: 16 }}>
                  Las parejas Mixto deben ser Hombre + Mujer.
                </div>
              )}

              {/* Pool */}
              {poolPlayers.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 10 }}>Sin asignar</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', minHeight: 48, padding: '8px', background: 'var(--grey-50)', border: `2px dashed ${tDropOver === 'pool' ? 'var(--black)' : 'var(--grey-200)'}` }}
                    onDragOver={e => { e.preventDefault(); setTDropOver('pool'); }}
                    onDragLeave={() => setTDropOver(null)}
                    onDrop={() => handleDrop('pool')}>
                    {poolPlayers.map(p => (
                      <div key={p.id}
                        draggable
                        onDragStart={() => { setTDragId(p.id); setTDragSource('pool'); }}
                        onDragEnd={() => { setTDragId(null); setTDragSource(null); setTDropOver(null); }}
                        style={{ padding: '6px 12px', background: tDragId === p.id ? 'var(--grey-200)' : 'var(--black)', color: '#fff', cursor: 'grab', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {initials(p.name)} {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pair rows */}
              {tPairAssignments.map((pa, pIdx) => (
                <div key={pIdx} style={{ border: '1px solid var(--grey-200)', padding: '14px 16px', marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--court-blue)', marginBottom: 10 }}>
                    Pareja {pIdx + 1}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['p1', 'p2'] as const).map(slot => {
                      const playerId = slot === 'p1' ? pa.player1Id : pa.player2Id;
                      const playerName = slot === 'p1' ? pa.player1Name : pa.player2Name;
                      const dropKey = `${pIdx}-${slot}`;
                      return (
                        <div key={slot}
                          style={{ flex: 1, minHeight: 44, padding: '8px 12px', border: `2px dashed ${tDropOver === dropKey ? 'var(--black)' : playerId ? 'var(--grey-200)' : 'var(--grey-100)'}`, background: playerId ? '#fff' : 'var(--grey-50)', display: 'flex', alignItems: 'center', gap: 8 }}
                          onDragOver={e => { e.preventDefault(); setTDropOver(dropKey); }}
                          onDragLeave={() => setTDropOver(null)}
                          onDrop={() => handleDrop(dropKey)}>
                          {playerId ? (
                            <>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                {initials(playerName)}
                              </div>
                              <span
                                draggable
                                onDragStart={() => { setTDragId(playerId); setTDragSource(dropKey); }}
                                onDragEnd={() => { setTDragId(null); setTDragSource(null); setTDropOver(null); }}
                                style={{ flex: 1, fontSize: 13, fontWeight: 600, cursor: 'grab' }}>{playerName}</span>
                              <button onClick={() => removeFromPair(pIdx, slot)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-300)', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--grey-300)' }}>Arrastrar jugador aquí</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Confirm pairs button */}
              {!tPairsLocked && (
                <button
                  onClick={() => allPairsFilled && setTPairsLocked(true)}
                  disabled={!allPairsFilled}
                  style={{ marginTop: 8, padding: '11px 24px', background: allPairsFilled ? 'var(--black)' : 'var(--grey-200)', color: allPairsFilled ? '#fff' : 'var(--grey-400)', border: 'none', cursor: allPairsFilled ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Confirmar Parejas
                </button>
              )}
              {tPairsLocked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--turf-green)' }}>✓ Parejas confirmadas</span>
                  <button onClick={() => setTPairsLocked(false)} style={{ padding: '6px 12px', background: 'none', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-400)' }}>
                    Editar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Plan gate error */}
          {planError && (
            <div style={{ margin: '16px 0 0', padding: '14px 16px', background: '#fef3c7', border: '1px solid #fbbf24', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>{planError}</div>
                <a href="/pricing" style={{ fontSize: 12, color: '#92400e', fontWeight: 700, textDecoration: 'underline' }}>Ver Plan Pro ($3/mes) →</a>
              </div>
            </div>
          )}

          {/* C: Crear Torneo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={{ padding: '11px 24px', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>← Atrás</button>
            <button
              onClick={handleCreateTournament}
              disabled={!canCreate}
              style={{ padding: '13px 36px', background: canCreate ? 'var(--black)' : 'var(--grey-200)', color: canCreate ? 'var(--neon)' : 'var(--grey-400)', border: 'none', cursor: canCreate ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              CREAR TORNEO
            </button>
          </div>
        </div>
      );
    }

    // ── STEP 99: Éxito ─────────────────────────────────────────────────────
    if (step === 99) {
      return (
        <div style={{ padding: '40px 40px 80px', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '40px 0 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, color: 'var(--turf-green)', marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: 8 }}>¡TORNEO CREADO!</div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 32 }}>Tu torneo fue generado y está listo para inscribir jugadores.</div>
          </div>

          <div style={{ background: 'var(--black)', padding: '28px', color: '#fff', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 8 }}>Código del torneo</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '0.08em', color: '#fff', marginBottom: 4 }}>{newTCode}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>Compartí este código con los jugadores para que se inscriban</div>

            <div style={{ display: 'inline-block', background: '#fff', padding: 12, marginBottom: 16 }}>
              <QRCodeSVG
                value={newTShareUrl || `https://padelmgt.com/t/${newTCode}`}
                size={140} bgColor="#ffffff" fgColor="#000000" level="M"
              />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Escaneá el QR para acceder al torneo</div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 14px', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', wordBreak: 'break-all' }}>
                {newTShareUrl || `padelmgt.com/t/${newTCode}`}
              </div>
              <button
                onClick={() => {
                  const url = newTShareUrl || `${window.location.origin}/t/${newTCode}`;
                  navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
                }}
                style={{ padding: '8px 16px', background: copied ? 'var(--turf-green)' : 'var(--neon)', color: 'var(--black)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                {copied ? '✓ Copiado' : 'Copiar link'}
              </button>
            </div>
          </div>

          <div style={{ border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 24 }}>
            {[
              { label: 'Torneo',   value: tName || `Torneo ${FORMAT_LABEL[tFormat ?? 'americano']}` },
              { label: 'Formato',  value: FORMAT_LABEL[tFormat ?? 'americano'] },
              { label: 'Fecha',    value: tDate || '–' },
              { label: 'Hora',     value: tTime || '–' },
              { label: 'Club',     value: resolvedClub() || '–' },
              { label: 'Cupos',    value: `${tMaxPlayers} jugadores` },
              { label: 'Canchas',  value: String(tCourts) },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--grey-100)' }}>
                <span style={{ fontSize: 11, color: 'var(--grey-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`/dashboard/player/tournaments/${newTId}`}
              style={{ padding: '12px 24px', background: 'var(--black)', color: 'var(--neon)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', fontFamily: 'var(--font-display)' }}>
              Ir a Gestionar →
            </Link>
            <button onClick={() => { resetWizard(); setStep(1); }}
              style={{ padding: '12px 24px', background: 'none', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-500)' }}>
              Crear otro
            </button>
          </div>
        </div>
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD VIEW
  // ══════════════════════════════════════════════════════════════════════════

  const activeTournaments = myTournaments.filter(t =>
    !t.cancelledAt && (t.status === 'created' || t.status === 'starting_soon' || t.status === 'live')
  );
  const allFinished = myTournaments
    .filter(t => t.status === 'finished' || !!t.cancelledAt)
    .sort((a, b) => {
      const da = (a.date || '') + (a.time || '');
      const db = (b.date || '') + (b.time || '');
      return db.localeCompare(da);
    });
  const finishedTournaments = allFinished.filter(t => {
    if (historialFilter === 'finalizado') return t.status === 'finished';
    if (historialFilter === 'cancelado') return !!t.cancelledAt;
    if (historialFilter === 'organizador') return currentUser && t.creatorId === currentUser.id;
    if (historialFilter === 'jugador') return currentUser && t.creatorId !== currentUser.id && t.players.some(p => p.id === currentUser!.id);
    return true;
  });

  function statusBadge(status: string) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      created:       { label: 'Creado',      bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed'          },
      starting_soon: { label: 'Por Empezar', bg: 'rgba(245,166,35,0.1)', color: '#f5a623'           },
      live:          { label: 'En Vivo',     bg: 'rgba(0,180,0,0.1)',     color: 'var(--turf-green)' },
      finished:      { label: 'Finalizado',  bg: 'var(--grey-100)',       color: 'var(--grey-500)'   },
      cancelled:     { label: 'Cancelado',   bg: 'var(--grey-100)',       color: 'var(--grey-500)'   },
    };
    const s = map[status] ?? map.created;
    return (
      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: s.bg, color: s.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {s.label}
      </span>
    );
  }

  function TournamentCard({ t }: { t: Tournament }) {
    const isCreator = currentUser && t.creatorId === currentUser.id;
    const isConfirmed = !isCreator && currentUser && t.players.some(p => p.id === currentUser.id);
    const invEntry = currentUser && (t.invitedPlayers ?? []).find(p => p.id === currentUser.id);
    const isPending = !isCreator && !isConfirmed && invEntry?.status === 'pending';

    function roleBadge() {
      if (isCreator) {
        return (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--black)', color: 'var(--neon)' }}>
            ORGANIZADOR
          </span>
        );
      }
      if (isConfirmed) {
        return (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(0,180,0,0.1)', color: 'var(--turf-green)' }}>
            CONFIRMADO
          </span>
        );
      }
      if (isPending) {
        return (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(245,166,35,0.1)', color: '#f5a623' }}>
            INVITADO
          </span>
        );
      }
      return null;
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderTop: 'none', borderBottom: '1px solid var(--grey-100)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{t.name}</div>
          <div style={{ fontSize: 11, color: 'var(--grey-400)', marginBottom: 4 }}>
            {FORMAT_LABEL[t.format] ?? t.format} · {t.date} {t.time && `· ${t.time}`} · {t.club}, {t.city}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {statusBadge(t.cancelledAt ? 'cancelled' : t.status)}
            {roleBadge()}
            <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>{t.players.length}/{t.maxPlayers} jugadores</span>
          </div>
        </div>
        {(() => {
          const baseStyle: React.CSSProperties = { padding: '7px 16px', background: 'var(--grey-100)', color: 'var(--grey-600)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', whiteSpace: 'nowrap' };
          const isFinishedT = t.status === 'finished';
          const href = isFinishedT
            ? `/dashboard/player/tournaments/${t.id}/live`
            : t.status === 'live' && isCreator
            ? `/dashboard/player/tournaments/${t.id}/live`
            : isCreator
            ? `/dashboard/player/tournaments/${t.id}`
            : `/dashboard/player/tournaments/${t.id}/view`;
          const btnLabel = isFinishedT ? 'Ver resultados →' : t.status === 'live' && isCreator ? 'EN VIVO →' : isCreator ? 'Gestionar →' : 'Ver →';
          const btnStyle = isFinishedT
            ? { ...baseStyle, background: 'var(--grey-800)', color: '#fff' }
            : t.status === 'live' && isCreator
            ? { ...baseStyle, background: 'var(--turf-green)', color: '#fff' }
            : baseStyle;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {isFinishedT && (
                <button onClick={() => openClone(t)} title="Clonar este torneo"
                  style={{ ...baseStyle, background: 'transparent', border: '1px solid var(--grey-300)', cursor: 'pointer' }}>
                  ⧉ Clonar
                </button>
              )}
              <Link href={href} style={btnStyle}>
                {btnLabel}
              </Link>
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Mi historial</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MIS TORNEOS</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/dashboard/player/tournaments/personalizado" style={{
            position: 'relative',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '13px 28px',
            background: 'var(--neon)', border: 'none',
            color: 'var(--black)', textDecoration: 'none',
            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            + Torneo Personalizado
            <span style={{
              position: 'absolute', top: -10, right: -8,
              background: 'var(--black)', color: 'var(--neon)',
              fontFamily: 'var(--font-sans, inherit)',
              fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
              padding: '3px 7px', whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            }}>
              DESDE $9
            </span>
          </Link>
          <button
            onClick={() => { resetWizard(); setView('wizard'); setStep(1); }}
            style={{ padding: '13px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            + Crear Torneo
          </button>
        </div>
      </div>

      {/* Invitaciones Pendientes */}
      {pendingInvitations.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={secTitle}>Invitaciones Pendientes ({pendingInvitations.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingInvitations.map(({ team, tournament }) => {
              const cat = tournament.categories.find(c => c.id === team.categoryId);
              const isLoading = invitationLoading === team.id;
              return (
                <div key={team.id} style={{
                  background: '#fff', border: '1px solid rgba(59,130,246,0.3)',
                  padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1d4ed8', marginBottom: 3 }}>
                        Invitación de {team.player1Name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)' }}>
                        {tournament.name}
                      </div>
                      {cat && (
                        <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 3 }}>
                          {cat.name} · {tournament.date}{tournament.time ? ` · ${tournament.time}` : ''}
                          {tournament.locationName ? ` · ${tournament.locationName}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      disabled={isLoading}
                      onClick={async () => {
                        if (!currentUser) return;
                        setInvitationLoading(team.id);
                        const res = await acceptTeamInvitation(tournament.id, team.id, currentUser.id, currentUser.name);
                        setInvitationLoading(null);
                        if (res.ok) {
                          setPendingInvitations(prev => prev.filter(inv => inv.team.id !== team.id));
                          setActivePersonalizados(prev => {
                            const existing = prev.find(t => t.id === tournament.id);
                            if (existing) {
                              return prev.map(t => t.id === tournament.id
                                ? { ...t, teams: t.teams.map(tm => tm.id === team.id ? { ...tm, player2Id: currentUser.id, player2Name: currentUser.name } : tm) }
                                : t
                              );
                            }
                            return [...prev, { ...tournament, status: tournament.status, teams: tournament.teams }];
                          });
                        }
                      }}
                      style={{
                        padding: '8px 20px', background: 'var(--turf-green)', color: '#fff',
                        border: 'none', cursor: isLoading ? 'wait' : 'pointer',
                        fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em', opacity: isLoading ? 0.6 : 1,
                      }}
                    >
                      {isLoading ? '…' : 'ACEPTAR'}
                    </button>
                    <button
                      disabled={isLoading}
                      onClick={async () => {
                        setInvitationLoading(team.id);
                        const res = await rejectTeamInvitation(tournament.id, team.id);
                        setInvitationLoading(null);
                        if (res.ok) setPendingInvitations(prev => prev.filter(inv => inv.team.id !== team.id));
                      }}
                      style={{
                        padding: '8px 20px', background: 'transparent', color: 'var(--grey-500)',
                        border: '1px solid var(--grey-200)', cursor: isLoading ? 'wait' : 'pointer',
                        fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em', opacity: isLoading ? 0.6 : 1,
                      }}
                    >
                      RECHAZAR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Torneos Activos */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={secTitle}>Torneos Activos ({tournamentsLoading ? '...' : activeTournaments.length + activePersonalizados.length})</div>
          {activeTournaments.length > 0 && (
            <div style={{ display: 'flex', gap: 2 }}>
              {(['icons', 'list'] as const).map(mode => (
                <button key={mode} onClick={() => setActiveView(mode)}
                  style={{ padding: '5px 10px', fontSize: 11, border: '1px solid var(--grey-200)', background: activeView === mode ? 'var(--black)' : '#fff', color: activeView === mode ? '#fff' : 'var(--grey-400)', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {mode === 'icons' ? '⊞ Íconos' : '☰ Lista'}
                </button>
              ))}
            </div>
          )}
        </div>

        {tournamentsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} rows={3} />)}
          </div>
        ) : activeTournaments.length === 0 && activePersonalizados.length === 0 ? (
          <div style={{ padding: '32px', background: '#fff', border: '1px solid var(--grey-200)', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
            No tenés torneos activos. ¡Creá uno!
          </div>
        ) : activeView === 'icons' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 1, background: 'var(--grey-200)' }}>
            {activeTournaments.map(t => {
              const isCreator = currentUser && t.creatorId === currentUser.id;
              const si = { created: { label: 'Inscripciones abiertas', color: '#7c3aed' }, starting_soon: { label: 'Por Empezar', color: '#f5a623' }, live: { label: 'En Vivo', color: 'var(--turf-green)' } }[t.status as string] ?? { label: t.status, color: 'var(--grey-400)' };
              const href = t.status === 'live' && isCreator
                ? `/dashboard/player/tournaments/${t.id}/live`
                : isCreator
                ? `/dashboard/player/tournaments/${t.id}`
                : `/dashboard/player/tournaments/${t.id}/view`;
              return (
                <div key={t.id} style={{ background: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.2, flex: 1, marginRight: 10 }}>{t.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: si.color, flexShrink: 0 }}>{si.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', lineHeight: 1.7 }}>
                    {t.date}{t.time ? ` · ${t.time}` : ''}<br />
                    {t.club}, {t.city}<br />
                    {FORMAT_LABEL[t.format] ?? t.format} · {t.pairType === 'parejas' ? 'Parejas' : 'Individual'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                        {t.players.length}<span style={{ fontSize: 13, color: 'var(--grey-400)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>/{t.maxPlayers}</span>
                      </div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-400)', fontWeight: 600 }}>jugadores</div>
                    </div>
                    <Link href={href}
                      style={{ padding: '7px 16px', background: t.status === 'live' && isCreator ? 'var(--turf-green)' : 'var(--black)', color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-block' }}>
                      {t.status === 'live' && isCreator ? 'EN VIVO →' : isCreator ? 'Gestionar' : 'Ver'}
                    </Link>
                  </div>
                </div>
              );
            })}
            {activePersonalizados.map(pt => {
              const enrolled = pt.teams.filter(tm => tm.status !== 'rejected').length;
              const totalSlots = pt.categories.reduce((s, c) => s + c.maxTeams, 0);
              const si = {
                registration_open: { label: 'Inscripciones abiertas', color: '#7c3aed' },
                configured: { label: 'Configurado', color: '#f5a623' },
                live: { label: 'En Vivo', color: 'var(--turf-green)' },
              }[pt.status] ?? { label: pt.status, color: 'var(--grey-400)' };
              return (
                <div key={pt.id} style={{ background: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 3 }}>Personalizado</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{pt.name}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: si.color, flexShrink: 0, marginLeft: 8 }}>{si.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', lineHeight: 1.7 }}>
                    {pt.date}{pt.time ? ` · ${pt.time}` : ''}<br />
                    {pt.locationName}{pt.city ? `, ${pt.city}` : ''}<br />
                    {pt.categories.length} categoría{pt.categories.length !== 1 ? 's' : ''} · Parejas
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                        {enrolled}<span style={{ fontSize: 13, color: 'var(--grey-400)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>/{totalSlots}</span>
                      </div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-400)', fontWeight: 600 }}>equipos</div>
                    </div>
                    <Link href={`/dashboard/player/tournaments/personalizado/${pt.id}`}
                      style={{ padding: '7px 16px', background: pt.status === 'live' ? 'var(--turf-green)' : 'var(--black)', color: pt.status === 'live' ? '#fff' : 'var(--neon)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-block' }}>
                      {pt.status === 'live' ? 'EN VIVO →' : 'GESTIONAR'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
            {activeTournaments.map(t => <TournamentCard key={t.id} t={t} />)}
            {activePersonalizados.map(pt => {
              const enrolled = pt.teams.filter(tm => tm.status !== 'rejected').length;
              const totalSlots = pt.categories.reduce((s, c) => s + c.maxTeams, 0);
              const si = {
                registration_open: 'Inscripciones abiertas',
                configured: 'Configurado',
                live: 'En Vivo',
              }[pt.status] ?? pt.status;
              return (
                <div key={pt.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--grey-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 2 }}>Personalizado</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{pt.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>
                      {pt.date}{pt.locationName ? ` · ${pt.locationName}` : ''} · {enrolled}/{totalSlots} equipos
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: pt.status === 'live' ? 'var(--turf-green)' : pt.status === 'configured' ? '#f5a623' : '#7c3aed' }}>{si}</span>
                    <Link href={`/dashboard/player/tournaments/personalizado/${pt.id}`}
                      style={{ padding: '6px 14px', background: 'var(--black)', color: 'var(--neon)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
                      GESTIONAR
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial */}
      {(() => {
        const PAGE = 10;
        const totalPages = Math.ceil(finishedTournaments.length / PAGE);
        const page = Math.min(histPage, Math.max(0, totalPages - 1));
        const pageTournaments = finishedTournaments.slice(page * PAGE, page * PAGE + PAGE);
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)' }}>
                  Historial ({finishedTournaments.length}{historialFilter !== 'todos' ? ` de ${allFinished.length}` : ''})
                </div>
                {totalPages > 1 && (
                  <div style={{ fontSize: 10, color: 'var(--grey-400)', fontWeight: 600 }}>
                    {page * PAGE + 1}–{Math.min((page + 1) * PAGE, finishedTournaments.length)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['todos', 'finalizado', 'cancelado', 'organizador', 'jugador'] as const).map(f => (
                  <button key={f} onClick={() => { setHistorialFilter(f); setHistPage(0); }} style={{
                    padding: '3px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', border: '1px solid',
                    borderColor: historialFilter === f ? 'var(--black)' : 'var(--grey-200)',
                    background: historialFilter === f ? 'var(--black)' : 'transparent',
                    color: historialFilter === f ? '#fff' : 'var(--grey-400)',
                    cursor: 'pointer',
                  }}>
                    {f === 'todos' ? 'Todos' : f === 'finalizado' ? 'Finalizado' : f === 'cancelado' ? 'Cancelado' : f === 'organizador' ? 'Organizador' : 'Jugador'}
                  </button>
                ))}
              </div>
            </div>
            {tournamentsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[1, 2, 3].map(i => <SkeletonCard key={i} rows={2} style={{ borderRadius: 0 }} />)}
              </div>
            ) : finishedTournaments.length === 0 ? (
              <div style={{ padding: '32px', background: '#fff', border: '1px solid var(--grey-200)', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
                No hay torneos finalizados todavía.
              </div>
            ) : (
              <>
                <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
                  {pageTournaments.map(t => <TournamentCard key={t.id} t={t} />)}
                </div>
                {totalPages > 1 && (() => {
                  const pages: (number | '…')[] = [];
                  if (totalPages <= 7) {
                    for (let i = 0; i < totalPages; i++) pages.push(i);
                  } else {
                    pages.push(0);
                    if (page > 2) pages.push('…');
                    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
                    if (page < totalPages - 3) pages.push('…');
                    pages.push(totalPages - 1);
                  }
                  const btnBase: React.CSSProperties = { padding: '5px 10px', fontSize: 11, fontWeight: 700, border: '1px solid var(--grey-200)', cursor: 'pointer', letterSpacing: '0.04em', minWidth: 32, textAlign: 'center' };
                  return (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
                      <button onClick={() => setHistPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        style={{ ...btnBase, background: page === 0 ? 'var(--grey-50)' : '#fff', color: page === 0 ? 'var(--grey-300)' : 'var(--grey-600)', cursor: page === 0 ? 'default' : 'pointer' }}>
                        ← Ant
                      </button>
                      {pages.map((p2, idx) =>
                        p2 === '…'
                          ? <span key={`e${idx}`} style={{ padding: '5px 4px', fontSize: 11, color: 'var(--grey-400)' }}>…</span>
                          : <button key={p2} onClick={() => setHistPage(p2 as number)}
                              style={{ ...btnBase, background: p2 === page ? 'var(--black)' : '#fff', color: p2 === page ? '#fff' : 'var(--grey-600)', borderColor: p2 === page ? 'var(--black)' : 'var(--grey-200)' }}>
                              {(p2 as number) + 1}
                            </button>
                      )}
                      <button onClick={() => setHistPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                        style={{ ...btnBase, background: page === totalPages - 1 ? 'var(--grey-50)' : '#fff', color: page === totalPages - 1 ? 'var(--grey-300)' : 'var(--grey-600)', cursor: page === totalPages - 1 ? 'default' : 'pointer' }}>
                        Sig →
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        );
      })()}

      {/* ── Clone modal ── */}
      {cloneSource && (
        <CloneDialog
          title="Clonar Torneo"
          sourceName={cloneSource.name}
          name={cloneName} setName={setCloneName}
          date={cloneDate} setDate={setCloneDate}
          time={cloneTime} setTime={setCloneTime}
          copyRoster={cloneRoster} setCopyRoster={setCloneRoster}
          rosterCount={cloneSource.players.length + (cloneSource.invitedPlayers?.length ?? 0)}
          busy={cloning}
          onCancel={() => setCloneSource(null)}
          onConfirm={handleCloneConfirm}
        />
      )}
    </div>
  );
}
