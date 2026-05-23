'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { getAllTournaments, createTournament, getTournament, saveTournament } from '@/lib/tournament-store';
import type { Tournament } from '@/lib/tournament-store';
import type { FixedPair } from '@/lib/game-engine';
import { getFriendsForPlayer, searchPlayers } from '@/lib/player-store';
import type { RegisteredPlayer } from '@/lib/player-store';

// ── Types ─────────────────────────────────────────────────────────────────────

type FormatKey = 'americano' | 'mexicano' | 'round_robin' | 'team_league' | 'knockout' | 'world_cup';
type PlayerClub = { id: string; name: string; city: string; country: string; courts: number };
type TournamentPlayer = { id: string; name: string; ranking: number; isCreator: boolean; email?: string; sex?: 'masculino' | 'femenino'; isProvisional?: boolean };
type InvitedEntry = { id: string; name: string; email?: string; shortId?: string; ranking: number; status: 'pending' | 'accepted' | 'rejected'; invitedAt: string; isProvisional?: boolean };

// ── Static data ───────────────────────────────────────────────────────────────

const COUNTRIES_WITH_CLUBS = ['Argentina', 'Chile', 'Uruguay', 'España'];
const CITIES_WITH_CLUBS: Record<string, string[]> = {
  Argentina: ['Buenos Aires', 'Rosario', 'Córdoba'],
  Chile: ['Santiago'], Uruguay: ['Montevideo'], España: ['Madrid'],
};
type ClubEntry = { id: string; name: string; courts: number };
const CLUBS_BY_CITY: Record<string, ClubEntry[]> = {
  'Buenos Aires': [{ id: 'c1', name: 'Club Barrio Norte', courts: 6 }, { id: 'c2', name: 'Padel Arena', courts: 10 }, { id: 'c3', name: 'Club Deportivo Sur', courts: 4 }],
  Rosario: [{ id: 'c4', name: 'Padel Rosario Central', courts: 5 }],
  Córdoba: [{ id: 'c5', name: 'Club La Cantera', courts: 8 }],
  Santiago: [{ id: 'c6', name: 'Padel Santiago', courts: 6 }],
  Montevideo: [{ id: 'c7', name: 'Club Carrasco', courts: 4 }],
  Madrid: [{ id: 'c8', name: 'World Padel Tour', courts: 12 }],
};
const CREATOR_CLUBS: PlayerClub[] = [
  { id: 'c1', name: 'Club Barrio Norte', city: 'Buenos Aires', country: 'Argentina', courts: 6 },
  { id: 'c2', name: 'Padel Arena', city: 'Buenos Aires', country: 'Argentina', courts: 10 },
  { id: 'c5', name: 'Club La Cantera', city: 'Córdoba', country: 'Argentina', courts: 8 },
];

const FORMAT_INFO: Record<FormatKey, { label: string; desc: string; functional: boolean }> = {
  americano:   { label: 'Americano',   desc: 'Rotación de parejas, puntos acumulados. Rondas pre-generadas.',         functional: true  },
  mexicano:    { label: 'Mexicano',    desc: 'Rotación dinámica según posición en el ranking del torneo.',              functional: true  },
  round_robin: { label: 'Round Robin', desc: 'Todos contra todos en un mismo grupo.',                                  functional: false },
  team_league: { label: 'Team League', desc: 'Liga por equipos con jornadas semanales.',                               functional: false },
  knockout:    { label: 'Knockout',    desc: 'Eliminación directa, un perdedor queda afuera.',                         functional: false },
  world_cup:   { label: 'World Cup',   desc: 'Fase de grupos seguida de eliminatorias directas.',                      functional: false },
};
const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

const PLAYER_COUNT_OPTIONS = [4, 6, 8, 12, 16, 24, 32];

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
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = current > num;
        const active = current === num;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                background: done ? 'var(--turf-green)' : active ? 'var(--black)' : 'var(--grey-100)',
                color: done || active ? '#fff' : 'var(--grey-400)',
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
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
              <div style={{ width: 40, height: 2, background: done ? 'var(--turf-green)' : 'var(--grey-200)', margin: '0 4px', marginBottom: 18, flexShrink: 0 }} />
            )}
          </div>
        );
      })}
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
  // ── View ────────────────────────────────────────────────────────────────────
  const [view, setView] = useState<'dashboard' | 'wizard'>('dashboard');
  const [step, setStep] = useState(1);

  // ── Current user ────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; shortId?: string; ranking?: number } | null>(null);

  // ── My tournaments ──────────────────────────────────────────────────────────
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);

  // ── Success ─────────────────────────────────────────────────────────────────
  const [newTId, setNewTId] = useState('');
  const [newTCode, setNewTCode] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const [tName, setTName] = useState('');
  const [tDate, setTDate] = useState('');
  const [tTime, setTTime] = useState('');
  const [tHasLocation, setTHasLocation] = useState<boolean | null>(null);
  const [tIsRegClub, setTIsRegClub] = useState<boolean | null>(null);
  const [tSelectedRegClub, setTSelectedRegClub] = useState<PlayerClub | null>(null);
  const [tCountry, setTCountry] = useState('');
  const [tCity, setTCity] = useState('');
  const [tClubId, setTClubId] = useState('');
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
  const [tDeuce, setTDeuce] = useState<'ventaja' | 'oro'>('oro');

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
    try {
      const u = localStorage.getItem('padelmgt_user');
      if (u) setCurrentUser(JSON.parse(u));
    } catch {}
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setMyTournaments(getAllTournaments().filter(t =>
      t.creatorId === currentUser.id ||
      t.players.some(p => p.id === currentUser.id) ||
      (t.invitedPlayers ?? []).some(p => p.id === currentUser.id)
    ));
  }, [currentUser]);

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
    if (tIsRegClub && tSelectedRegClub) return tSelectedRegClub.name;
    if (tClubId === '__custom__') return tCustomClub.trim() || '';
    const cityClubs = tCity ? (CLUBS_BY_CITY[tCity] || []) : [];
    return cityClubs.find(c => c.id === tClubId)?.name || '';
  }
  function resolvedCity(): string {
    if (tIsRegClub && tSelectedRegClub) return tSelectedRegClub.city;
    return tCity || '';
  }
  function resolvedCountry(): string {
    if (tIsRegClub && tSelectedRegClub) return tSelectedRegClub.country;
    return tCountry || '';
  }

  // ── Validation ───────────────────────────────────────────────────────────────
  const step1Valid = useMemo(() => {
    if (!tName.trim() || !tDate || !tTime) return false;
    if (tHasLocation === null) return true; // location optional
    if (tHasLocation === false) return true;
    if (tIsRegClub === null) return false;
    if (tIsRegClub === true) return tSelectedRegClub !== null;
    if (!tCountry || !tCity || !tClubId) return false;
    if (tClubId === '__custom__' && !tCustomClub.trim()) return false;
    return true;
  }, [tName, tDate, tTime, tHasLocation, tIsRegClub, tSelectedRegClub, tCountry, tCity, tClubId, tCustomClub]);

  const step2Valid = useMemo(() => {
    if (!tFormat) return false;
    return FORMAT_INFO[tFormat].functional;
  }, [tFormat]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  function resetWizard() {
    setStep(1);
    setTName(''); setTDate(''); setTTime('');
    setTHasLocation(null); setTIsRegClub(null); setTSelectedRegClub(null);
    setTCountry(''); setTCity(''); setTClubId(''); setTCustomClub('');
    setTFormat(null); setTModalidad('individual'); setTMixto(false);
    setTMaxPlayers(8); setTCourts(2); setTScoreType('points');
    setTPtTarget(24); setTSets(1); setTGames(6); setTTiebreak(7); setTDeuce('oro');
    setTPlayers([]); setTInvited([]); setTCreatorInGame(true);
    setTPlayerTab('friends'); setTFriendList([]); setTSearchQ(''); setTSearchResults([]);
    setTProvName(''); setTShowProvInput(false); setTShowAddPanel(false);
    setTPairAssignments([]); setTPairsLocked(false);
    setTDragId(null); setTDragSource(null); setTDropOver(null);
    setNewTId(''); setNewTCode(''); setCopied(false);
  }

  // ── Create tournament ────────────────────────────────────────────────────────
  function handleCreateTournament() {
    if (!currentUser) return;
    const scoreConfig = tScoreType === 'points'
      ? { type: 'points' as const, target: tPtTarget }
      : { type: 'traditional' as const, setsPerMatch: tSets, gamesPerSet: tGames, tiebreak: tTiebreak, deuce: tDeuce };

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

    const tournament = createTournament({
      name: tName.trim() || `Torneo ${FORMAT_LABEL[tFormat ?? 'americano']}`,
      date: tDate,
      time: tTime,
      club: resolvedClub() || '–',
      city: resolvedCity() || '–',
      country: resolvedCountry() || '–',
      format: tFormat ?? 'americano',
      pairType: tModalidad as 'individual' | 'parejas',
      mixto: tMixto,
      scoreConfig,
      maxPlayers: tMaxPlayers,
      courts: tCourts,
      players: confirmedPlayers,
      invitedPlayers: allInvited,
      creatorId: currentUser.id,
    });

    if (tPairsLocked && tPairAssignments.length > 0) {
      saveTournament({ ...tournament, fixedPairs: tPairAssignments });
    }

    setNewTId(tournament.id);
    setNewTCode(tournament.code);
    setStep(99);

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
      const cityClubs = tCity ? (CLUBS_BY_CITY[tCity] || []) : [];

      return (
        <div style={{ padding: '40px 40px 80px', maxWidth: 660 }}>
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
                      if (!val) { setTIsRegClub(null); setTSelectedRegClub(null); setTCountry(''); setTCity(''); setTClubId(''); setTCustomClub(''); }
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
                        setTSelectedRegClub(null); setTCountry(''); setTCity(''); setTClubId(''); setTCustomClub('');
                      }}
                        style={{ flex: 1, padding: '12px', border: `2px solid ${active ? 'var(--black)' : 'var(--grey-200)'}`, background: active ? 'var(--black)' : '#fff', color: active ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {tIsRegClub === true && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {CREATOR_CLUBS.map(c => (
                      <button key={c.id} onClick={() => setTSelectedRegClub(c)}
                        style={{ padding: '14px 18px', textAlign: 'left', border: `2px solid ${tSelectedRegClub?.id === c.id ? 'var(--black)' : 'var(--grey-200)'}`, background: tSelectedRegClub?.id === c.id ? 'var(--black)' : '#fff', color: tSelectedRegClub?.id === c.id ? '#fff' : 'var(--black)', cursor: 'pointer' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, textTransform: 'uppercase' }}>{c.name}</div>
                        <div style={{ fontSize: 11, marginTop: 2, color: tSelectedRegClub?.id === c.id ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>{c.city}, {c.country} · {c.courts} canchas</div>
                      </button>
                    ))}
                  </div>
                )}

                {tIsRegClub === false && (
                  <div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={lbl}>País</label>
                      <select value={tCountry} onChange={e => { setTCountry(e.target.value); setTCity(''); setTClubId(''); }} style={sel}>
                        <option value="">Seleccioná un país</option>
                        {COUNTRIES_WITH_CLUBS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    {tCountry && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={lbl}>Ciudad</label>
                        <select value={tCity} onChange={e => { setTCity(e.target.value); setTClubId(''); }} style={sel}>
                          <option value="">Seleccioná una ciudad</option>
                          {(CITIES_WITH_CLUBS[tCountry] || []).map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    )}
                    {tCity && cityClubs.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={lbl}>Club</label>
                        <select value={tClubId} onChange={e => { setTClubId(e.target.value); if (e.target.value !== '__custom__') setTCustomClub(''); }} style={sel}>
                          <option value="">Seleccioná un club</option>
                          {cityClubs.map(c => <option key={c.id} value={c.id}>{c.name} · {c.courts} canchas</option>)}
                          <option value="__custom__">Otros / Pista Privada</option>
                        </select>
                      </div>
                    )}
                    {tClubId === '__custom__' && (
                      <div>
                        <label style={lbl}>Nombre del lugar *</label>
                        <input type="text" value={tCustomClub} onChange={e => setTCustomClub(e.target.value)} placeholder="Ej: Cancha de Lucas, Club privado…" style={inp} />
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
        <div style={{ padding: '40px 40px 80px', maxWidth: 720 }}>
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

          {/* Card 2: Modalidad (only if format is functional) */}
          {tFormat && fmtFunctional && (
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
          {tFormat && fmtFunctional && (tFormat === 'americano' || tFormat === 'mexicano') && (
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

          {/* Card 3: Jugadores y canchas */}
          {tFormat && (
            <div style={card}>
              <div style={secTitle}>Jugadores y canchas</div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Jugadores</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PLAYER_COUNT_OPTIONS.map(n => (
                    <button key={n} onClick={() => setTMaxPlayers(n)}
                      style={{ width: 52, height: 44, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tMaxPlayers === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tMaxPlayers === n ? 'var(--black)' : '#fff', color: tMaxPlayers === n ? '#fff' : 'var(--black)' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
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

          {/* Card 4: Puntuación */}
          {tFormat && (
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
              ) : (
                /* Other formats: show both scoring options */
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
                          {[1, 3].map(n => (
                            <button key={n} onClick={() => setTSets(n)}
                              style={{ width: 52, height: 44, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, cursor: 'pointer', border: `2px solid ${tSets === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tSets === n ? 'var(--black)' : '#fff', color: tSets === n ? '#fff' : 'var(--black)' }}>
                              {n}
                            </button>
                          ))}
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
                        <label style={lbl}>Regla de Deuce</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[{ v: 'ventaja', label: 'Ventaja' }, { v: 'oro', label: 'Punto de Oro' }].map(o => (
                            <button key={o.v} onClick={() => setTDeuce(o.v as 'ventaja' | 'oro')}
                              style={{ padding: '10px 18px', border: `2px solid ${tDeuce === o.v ? 'var(--black)' : 'var(--grey-200)'}`, background: tDeuce === o.v ? 'var(--black)' : '#fff', color: tDeuce === o.v ? '#fff' : 'var(--black)', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {o.label}
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
        <div style={{ padding: '40px 40px 80px', maxWidth: 720 }}>
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
        <div style={{ padding: '40px 40px 80px', maxWidth: 560 }}>
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
                value={typeof window !== 'undefined' ? `${window.location.origin}/tournament/${newTCode}` : `https://padelmgt.com/tournament/${newTCode}`}
                size={140} bgColor="#ffffff" fgColor="#000000" level="M"
              />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Escaneá el QR para acceder al torneo</div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 14px', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', wordBreak: 'break-all' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/tournament/${newTCode}` : `padelmgt.com/tournament/${newTCode}`}
              </div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/tournament/${newTCode}`;
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
    t.status === 'created' || t.status === 'starting_soon' || t.status === 'live'
  );
  const finishedTournaments = myTournaments.filter(t => t.status === 'finished');

  function statusBadge(status: string) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      created:       { label: 'Creado',      bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed'          },
      starting_soon: { label: 'Por Empezar', bg: 'rgba(245,166,35,0.1)', color: '#f5a623'           },
      live:          { label: 'En Vivo',     bg: 'rgba(0,180,0,0.1)',     color: 'var(--turf-green)' },
      finished:      { label: 'Finalizado',  bg: 'var(--grey-100)',       color: 'var(--grey-500)'   },
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
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderTop: 'none', borderBottom: '1px solid var(--grey-100)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{t.name}</div>
          <div style={{ fontSize: 11, color: 'var(--grey-400)', marginBottom: 4 }}>
            {FORMAT_LABEL[t.format] ?? t.format} · {t.date} {t.time && `· ${t.time}`} · {t.club}, {t.city}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {statusBadge(t.status)}
            <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>{t.players.length}/{t.maxPlayers} jugadores</span>
          </div>
        </div>
        <Link href={`/dashboard/player/tournaments/${t.id}`}
          style={{ padding: '7px 16px', background: 'var(--grey-100)', color: 'var(--grey-600)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          {isCreator ? 'Gestionar →' : 'Ver →'}
        </Link>
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
        <button
          onClick={() => { resetWizard(); setView('wizard'); setStep(1); }}
          style={{ padding: '13px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
          + Crear Torneo
        </button>
      </div>

      {/* Torneos Activos */}
      <div style={{ marginBottom: 40 }}>
        <div style={secTitle}>Torneos Activos ({activeTournaments.length})</div>
        {activeTournaments.length === 0 ? (
          <div style={{ padding: '32px', background: '#fff', border: '1px solid var(--grey-200)', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
            No tenés torneos activos. ¡Creá uno!
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
            {activeTournaments.map(t => <TournamentCard key={t.id} t={t} />)}
          </div>
        )}
      </div>

      {/* Historial */}
      <div>
        <div style={secTitle}>Historial ({finishedTournaments.length})</div>
        {finishedTournaments.length === 0 ? (
          <div style={{ padding: '32px', background: '#fff', border: '1px solid var(--grey-200)', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
            No hay torneos finalizados todavía.
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
            {finishedTournaments.map(t => <TournamentCard key={t.id} t={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}
