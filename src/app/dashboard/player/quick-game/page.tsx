'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createQuickGame, getAllGames } from '@/lib/game-store';
import { createInvitation, getPendingInvitationsForPlayer, respondToInvitation, getInvitationsForPlayer } from '@/lib/invitation-store';
import type { Invitation } from '@/lib/invitation-store';
import { getFriendsForPlayer, searchPlayers, addFriendship } from '@/lib/player-store';
import { getGame, saveGame } from '@/lib/game-store';
import type { RegisteredPlayer } from '@/lib/player-store';
import type { ActiveGame, GamePlayer as EnginePlayer, InvitedPlayer, ScoreConfig } from '@/lib/game-engine';
import { getRankingHistoryForGame } from '@/lib/ranking-store';
import type { RankingEntry } from '@/lib/ranking-store';

// ── Types ─────────────────────────────────────────────────────────────────────

type GameStatus   = 'created' | 'starting_soon' | 'live' | 'finished';
type Level        = 'all' | 'beginner' | 'intermediate' | 'advanced';
type PairType     = 'fixed' | 'exchange';
type ScoreType    = 'traditional' | 'points';
type DeuceRule    = 'traditional' | 'gold' | 'silver' | 'ipf';

type InvitedLocal = {
  id: string;
  name: string;
  email?: string;
  shortId?: string;
  ranking: number;
  status: 'pending';
};

// ── Mock / static data ────────────────────────────────────────────────────────

const COUNTRIES_WITH_CLUBS = ['Argentina', 'Chile', 'Uruguay', 'España'];

const CITIES_WITH_CLUBS: Record<string, string[]> = {
  Argentina: ['Buenos Aires', 'Rosario', 'Córdoba'],
  Chile:     ['Santiago'],
  Uruguay:   ['Montevideo'],
  España:    ['Madrid'],
};

type Club = { id: string; name: string; courts: number };
type PlayerClub = Club & { city: string; country: string };

const CLUBS: Record<string, Club[]> = {
  'Buenos Aires': [
    { id: 'c1', name: 'Club Barrio Norte',  courts: 6  },
    { id: 'c2', name: 'Padel Arena',        courts: 10 },
    { id: 'c3', name: 'Club Deportivo Sur', courts: 4  },
  ],
  Rosario:    [{ id: 'c4', name: 'Padel Rosario Central', courts: 5  }],
  Córdoba:    [{ id: 'c5', name: 'Club La Cantera',       courts: 8  }],
  Santiago:   [{ id: 'c6', name: 'Padel Santiago',        courts: 6  }],
  Montevideo: [{ id: 'c7', name: 'Club Carrasco',         courts: 4  }],
  Madrid:     [{ id: 'c8', name: 'World Padel Tour',      courts: 12 }],
};

// Clubs the current player belongs to (courts > 0 = physical clubs, excluding leagues)
const CREATOR_REGISTERED_CLUBS: PlayerClub[] = [
  { id: 'c1', name: 'Club Barrio Norte',  city: 'Buenos Aires', country: 'Argentina', courts: 6  },
  { id: 'c2', name: 'Padel Arena',        city: 'Buenos Aires', country: 'Argentina', courts: 10 },
  { id: 'c5', name: 'Club La Cantera',    city: 'Córdoba',      country: 'Argentina', courts: 8  },
];

// ── Label maps ────────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<Level, string> = {
  all: 'Todos los Niveles', beginner: 'Principiante',
  intermediate: 'Intermedio', advanced: 'Avanzado',
};
const DEUCE_LABEL: Record<DeuceRule, string> = {
  traditional: 'Ventaja Tradicional', gold: 'Punto de Oro',
  silver: 'Punto de Plata', ipf: 'IPF (2 ventajas máx.)',
};
const DEUCE_DESC: Record<DeuceRule, string> = {
  traditional: 'D y AD hasta que un equipo gane 2 puntos consecutivos.',
  gold:        'En Deuce, el siguiente punto gana el game. (Sin ventaja)',
  silver:      'Solo se permite un AD. Si vuelven a D, el siguiente punto decide.',
  ipf:         'Máximo 2 AD. Si se llega a un tercer Deuce, el siguiente punto decide.',
};
const STATUS_INFO: Record<GameStatus, { label: string; color: string }> = {
  created:       { label: 'Creado',      color: '#7c3aed'            },
  starting_soon: { label: 'Por Empezar', color: '#f5a623'            },
  live:          { label: 'En Vivo',     color: 'var(--turf-green)'  },
  finished:      { label: 'Finalizado',  color: 'var(--grey-400)'    },
};

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
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const STEP_LABELS = ['Información', 'Nivel', 'Jugadores', 'Pareja', 'Configuración'];

function Steps({ current }: { current: number }) {
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

function WizardHeader({ onCancel }: { onCancel: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid var(--grey-100)' }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 4 }}>Nuevo Juego</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>CREAR JUEGO RÁPIDO</h1>
      </div>
      <button onClick={onCancel} style={{ padding: '9px 18px', border: '1px solid var(--grey-200)', fontSize: 11, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Cancelar
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuickGamePage() {
  type View = 'dashboard' | 'wizard';
  const [view, setView] = useState<View>('dashboard');
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; shortId: string } | null>(null);
  const [qrGame, setQrGame]     = useState<ActiveGame | null>(null);
  const [copied, setCopied]     = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'icons' | 'list'>('icons');
  const [invView, setInvView]       = useState<'icons' | 'list'>('icons');
  const [myInvitations, setMyInvitations] = useState<Invitation[]>([]);
  const [invToast, setInvToast]     = useState<string | null>(null);

  const reloadGames = useCallback(() => {
    setGames(getAllGames());
  }, []);

  useEffect(() => {
    reloadGames();
    try {
      const u = localStorage.getItem('padelmgt_user');
      if (u) {
        const parsed = JSON.parse(u);
        setCurrentUser(parsed);
        // load invitations for this player
        const invs = getInvitationsForPlayer(parsed.id).filter(i => i.status === 'pending');
        setMyInvitations(invs);
      }
    } catch {}
  }, [reloadGames]);

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // Step I — Información básica
  const [gameName, setGameName]         = useState('');
  const [date, setDate]                 = useState('');
  const [time, setTime]                 = useState('');
  const [hasLocation, setHasLocation]   = useState<boolean | null>(null);
  const [isRegisteredClub, setIsRegisteredClub] = useState<boolean | null>(null);
  const [selectedRegClub, setSelectedRegClub]   = useState<PlayerClub | null>(null);
  const [country, setCountry]           = useState('');
  const [city, setCity]                 = useState('');
  const [clubId, setClubId]             = useState('');
  const [customClub, setCustomClub]     = useState('');

  // Step II — Nivel
  const [level, setLevel] = useState<Level | null>(null);

  // Step III — Jugadores
  const [maxPlayers, setMaxPlayers]     = useState(4);
  const [invitedList, setInvitedList]   = useState<InvitedLocal[]>([]);
  const [playerTab, setPlayerTab]       = useState<'friends' | 'search'>('friends');
  const [friendList, setFriendList]     = useState<RegisteredPlayer[]>([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<RegisteredPlayer[]>([]);

  // Step IV — Tipo de pareja
  const [pairType, setPairType] = useState<PairType | null>(null);

  // Step V — Configuración
  const [courts, setCourts]             = useState(1);
  const [scoreType, setScoreType]       = useState<ScoreType>('traditional');
  const [setsPerMatch, setSetsPerMatch] = useState(1);
  const [gamesPerSet, setGamesPerSet]   = useState(6);
  const [tiebreak, setTiebreak]         = useState(7);
  const [deuceRule, setDeuceRule]       = useState<DeuceRule>('gold');
  const [pointTarget, setPointTarget]   = useState(16);

  // Load friends on step 3
  useEffect(() => {
    if (step === 3 && currentUser) {
      setFriendList(getFriendsForPlayer(currentUser.id));
    }
  }, [step, currentUser]);

  // Search players
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setSearchResults(searchPlayers(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // ── Derived values ────────────────────────────────────────────────────────
  const clubs = city ? (CLUBS[city] || []) : [];
  const isCustomLoc = clubId === '__custom__';
  const selectedClub = isCustomLoc ? null : (clubs.find(c => c.id === clubId) ?? null);

  function resolvedClubName(): string {
    if (hasLocation === false) return '–';
    if (isRegisteredClub && selectedRegClub) return selectedRegClub.name;
    if (isCustomLoc && customClub.trim()) return customClub.trim();
    if (selectedClub) return selectedClub.name;
    return '–';
  }

  function resolvedCity(): string {
    if (isRegisteredClub && selectedRegClub) return selectedRegClub.city;
    return city || '–';
  }

  function resolvedCountry(): string {
    if (isRegisteredClub && selectedRegClub) return selectedRegClub.country;
    return country || '–';
  }

  const step1Valid = useMemo(() => {
    if (!gameName.trim() || !date || !time) return false;
    if (date < today()) return false;
    if (hasLocation === null) return false;
    if (hasLocation === false) return true;
    // has location
    if (isRegisteredClub === null) return false;
    if (isRegisteredClub === true) return selectedRegClub !== null;
    // not registered club → dropdown
    if (!country || !city || !clubId) return false;
    if (isCustomLoc && !customClub.trim()) return false;
    return true;
  }, [gameName, date, time, hasLocation, isRegisteredClub, selectedRegClub, country, city, clubId, isCustomLoc, customClub]);

  function isAlreadyInvited(id: string) {
    return invitedList.some(p => p.id === id);
  }

  function addInvited(p: RegisteredPlayer) {
    if (isAlreadyInvited(p.id)) return;
    if (invitedList.length >= maxPlayers - 1) return; // -1 for creator
    setInvitedList(prev => [...prev, {
      id: p.id, name: p.name, email: p.email,
      shortId: p.shortId, ranking: p.ranking, status: 'pending',
    }]);
  }

  function removeInvited(id: string) {
    setInvitedList(prev => prev.filter(p => p.id !== id));
  }

  function isFriend(id: string) {
    return friendList.some(f => f.id === id);
  }

  function resetWizard() {
    setStep(1);
    setGameName(''); setDate(''); setTime('');
    setHasLocation(null); setIsRegisteredClub(null); setSelectedRegClub(null);
    setCountry(''); setCity(''); setClubId(''); setCustomClub('');
    setLevel(null);
    setMaxPlayers(4); setInvitedList([]); setPlayerTab('friends');
    setSearchQuery(''); setSearchResults([]); setFriendList([]);
    setPairType(null);
    setCourts(1); setScoreType('traditional'); setSetsPerMatch(1);
    setGamesPerSet(6); setTiebreak(7); setDeuceRule('gold'); setPointTarget(16);
  }

  function goToDashboard() { resetWizard(); setView('dashboard'); }

  function handleSubmit() {
    if (!currentUser) return;

    const creatorPlayer: EnginePlayer = {
      id: currentUser.id,
      name: currentUser.name,
      ranking: 100,
      isCreator: true,
    };

    const invitedPlayers: InvitedPlayer[] = invitedList.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      shortId: p.shortId,
      ranking: p.ranking,
      status: 'pending',
      invitedAt: new Date().toISOString(),
      isFriend: isFriend(p.id),
    }));

    const scoreConfig: ScoreConfig = scoreType === 'points'
      ? { type: 'points', target: pointTarget }
      : { type: 'traditional', setsPerMatch, gamesPerSet, tiebreak, deuce: deuceRule === 'traditional' ? 'ventaja' : 'oro' };

    const enginePairType = pairType === 'fixed' ? 'parejas' : 'individual';
    const derivedFormat: 'americano' | 'mexicano' = 'americano'; // JR always uses americano rotation internally
    const clubName = resolvedClubName();
    const cityName = resolvedCity();
    const countryName = resolvedCountry();

    const newGame = createQuickGame({
      name: gameName.trim(),
      date,
      time,
      club: clubName,
      city: cityName,
      country: countryName,
      format: derivedFormat,
      pairType: enginePairType,
      mixto: false,
      scoreConfig,
      maxPlayers,
      courts,
      players: [creatorPlayer],
      invitedPlayers,
      levelLabel: level ? LEVEL_LABEL[level] : 'Todos',
      creatorId: currentUser.id,
    });

    // Send invitations
    for (const p of invitedList) {
      createInvitation({
        gameId: newGame.id,
        gameName: newGame.name,
        gameDate: newGame.date,
        gameTime: newGame.time,
        gameClub: newGame.club,
        gameCity: newGame.city,
        fromPlayerId: currentUser.id,
        fromPlayerName: currentUser.name,
        toPlayerId: p.id,
        toPlayerName: p.name,
        toPlayerEmail: p.email,
      });
    }

    const msg = invitedList.length > 0
      ? `¡Juego Rápido creado! Se enviaron ${invitedList.length} invitaciones.`
      : '¡Juego Rápido creado!';
    setNotification(msg);
    reloadGames();
    goToDashboard();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD VIEW
  // ══════════════════════════════════════════════════════════════════════════

  function handleAcceptInvitation(inv: Invitation) {
    if (!currentUser) return;
    respondToInvitation(inv.id, 'accepted');
    const game = getGame(inv.gameId);
    if (game) {
      const updatedInvited = (game.invitedPlayers ?? []).map(p =>
        p.id === currentUser.id ? { ...p, status: 'accepted' as const } : p
      );
      const alreadyPlayer = game.players.some(p => p.id === currentUser.id);
      const updatedPlayers = alreadyPlayer ? game.players : [
        ...game.players,
        { id: currentUser.id, name: currentUser.name, ranking: 1000, isCreator: false, email: currentUser.email, shortId: currentUser.shortId },
      ];
      saveGame({ ...game, invitedPlayers: updatedInvited, players: updatedPlayers });
      if (game.creatorId) addFriendship(currentUser.id, game.creatorId);
    }
    setMyInvitations(prev => prev.filter(i => i.id !== inv.id));
    setInvToast(`Aceptaste la invitación a "${inv.gameName}"`);
    reloadGames();
    setTimeout(() => setInvToast(null), 3500);
  }

  function handleRejectInvitation(inv: Invitation) {
    if (!currentUser) return;
    respondToInvitation(inv.id, 'rejected');
    const game = getGame(inv.gameId);
    if (game) {
      const updatedInvited = (game.invitedPlayers ?? []).map(p =>
        p.id === currentUser.id ? { ...p, status: 'rejected' as const } : p
      );
      saveGame({ ...game, invitedPlayers: updatedInvited });
    }
    setMyInvitations(prev => prev.filter(i => i.id !== inv.id));
    setInvToast(`Rechazaste la invitación a "${inv.gameName}"`);
    setTimeout(() => setInvToast(null), 3500);
  }

  if (view === 'dashboard') {
    const uid = currentUser?.id;
    const activeGames = games.filter(g =>
      g.status !== 'finished' && !g.cancelledAt && (
        g.creatorId === uid ||
        (uid && g.players.some(p => p.id === uid)) ||
        (uid && g.invitedPlayers?.some(p => p.id === uid && p.status === 'accepted'))
      )
    );
    const finishedGames = games.filter(g => g.status === 'finished');

    function gameShareUrl(code: string) {
      return `${window.location.origin}/quick-game/${code}`;
    }
    function copyCode(code: string) {
      navigator.clipboard.writeText(gameShareUrl(code)).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    return (
      <div style={{ padding: '40px 40px 80px' }}>

        {/* Notification */}
        {notification && (
          <div style={{ marginBottom: 24, padding: '14px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--turf-green)' }}>{notification}</span>
            <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-400)', padding: 0 }}>×</button>
          </div>
        )}

        {/* QR Share Modal */}
        {qrGame && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => setQrGame(null)}
          >
            <div style={{ background: '#fff', width: '100%', maxWidth: 420, padding: '32px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>Invitar jugadores</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase' }}>{qrGame.name}</div>
                </div>
                <button onClick={() => setQrGame(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', padding: 0, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ background: 'var(--grey-900)', padding: '24px', textAlign: 'center', marginBottom: 20 }}>
                <div style={{ background: '#fff', display: 'inline-block', padding: 8, marginBottom: 12 }}>
                  <QRCodeSVG value={gameShareUrl(qrGame.code)} size={120} bgColor="#ffffff" fgColor="#000000" level="M" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.12em' }}>{qrGame.code}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, wordBreak: 'break-all' }}>{gameShareUrl(qrGame.code)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => copyCode(qrGame.code)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${copied ? 'var(--turf-green)' : 'var(--grey-200)'}`, background: copied ? 'rgba(0,200,100,0.05)' : '#fff', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <span style={{ fontSize: 18 }}>{copied ? '✓' : '📋'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: copied ? 'var(--turf-green)' : 'var(--black)' }}>{copied ? '¡Link copiado!' : 'Copiar link de invitación'}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Pegalo en WhatsApp, Instagram o cualquier medio</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invitation toast */}
        {invToast && (
          <div style={{ marginBottom: 16, padding: '12px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, fontWeight: 600, color: 'var(--turf-green)' }}>
            {invToast}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Jugador</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MIS JUEGOS RÁPIDOS</h1>
          </div>
          <button
            onClick={() => setView('wizard')}
            style={{ padding: '13px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}
          >
            + Crear Nuevo Juego Rápido
          </button>
        </div>

        {/* ── MIS JUEGOS ACTIVOS ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={secTitle}>Mis Juegos Activos ({activeGames.length})</div>
            <div style={{ display: 'flex', gap: 2 }}>
              {(['icons', 'list'] as const).map(mode => (
                <button key={mode} onClick={() => setActiveView(mode)}
                  style={{ padding: '5px 10px', fontSize: 11, border: '1px solid var(--grey-200)', background: activeView === mode ? 'var(--black)' : '#fff', color: activeView === mode ? '#fff' : 'var(--grey-400)', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {mode === 'icons' ? '⊞ Íconos' : '☰ Lista'}
                </button>
              ))}
            </div>
          </div>

          {activeGames.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 8 }}>Sin juegos activos</div>
              <p style={{ fontSize: 13, color: 'var(--grey-400)', margin: '0 0 18px' }}>Creá un Juego Rápido para empezar.</p>
              <button onClick={() => setView('wizard')} style={{ padding: '10px 22px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                + Crear Juego Rápido
              </button>
            </div>
          ) : activeView === 'icons' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 1, background: 'var(--grey-200)' }}>
              {activeGames.map(g => {
                const si = STATUS_INFO[g.status as GameStatus] ?? { label: g.status, color: 'var(--grey-400)' };
                const isCreator = g.creatorId === uid || (uid && g.players.some(p => p.id === uid && p.isCreator));
                const confirmedCount = g.players.length;
                return (
                  <div key={g.id} style={{ background: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.2, flex: 1, marginRight: 10 }}>{g.name}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: si.color, flexShrink: 0 }}>{si.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--grey-400)', lineHeight: 1.7 }}>
                      {g.date} · {g.time}<br />
                      {g.club}, {g.city}<br />
                      {g.levelLabel ?? 'Todos'} · {g.pairType === 'parejas' ? 'Pareja Fija' : 'Intercambio'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                          {confirmedCount}<span style={{ fontSize: 13, color: 'var(--grey-400)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>/{g.maxPlayers}</span>
                        </div>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-400)', fontWeight: 600 }}>confirmados</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <button onClick={() => setQrGame(g)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', letterSpacing: '0.08em', border: 'none', cursor: 'pointer' }}>
                          {g.code} QR
                        </button>
                        <Link href={`/dashboard/player/quick-game/${g.id}`}
                          style={{ padding: '7px 16px', background: 'var(--black)', color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-block' }}>
                          {isCreator ? 'Gestionar' : 'Ver Juego'}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Lista view for active games */
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
              {activeGames.map((g, idx) => {
                const si = STATUS_INFO[g.status as GameStatus] ?? { label: g.status, color: 'var(--grey-400)' };
                const isCreator = g.creatorId === uid || (uid && g.players.some(p => p.id === uid && p.isCreator));
                return (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderTop: idx === 0 ? 'none' : '1px solid var(--grey-100)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{g.date} · {g.time} · {g.club}, {g.city}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: si.color, whiteSpace: 'nowrap' }}>{si.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--grey-400)', whiteSpace: 'nowrap' }}>{g.players.length}/{g.maxPlayers}</span>
                    <Link href={`/dashboard/player/quick-game/${g.id}`}
                      style={{ padding: '6px 14px', background: 'var(--black)', color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      {isCreator ? 'Gestionar' : 'Ver'}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── INVITACIONES A JUEGOS RÁPIDOS ────────────────────────────────── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={secTitle}>
              Invitaciones a Juegos Rápidos
              {myInvitations.length > 0 && (
                <span style={{ marginLeft: 8, background: '#f59e0b', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {myInvitations.length}
                </span>
              )}
            </div>
            {myInvitations.length > 0 && (
              <div style={{ display: 'flex', gap: 2 }}>
                {(['icons', 'list'] as const).map(mode => (
                  <button key={mode} onClick={() => setInvView(mode)}
                    style={{ padding: '5px 10px', fontSize: 11, border: '1px solid var(--grey-200)', background: invView === mode ? 'var(--black)' : '#fff', color: invView === mode ? '#fff' : 'var(--grey-400)', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {mode === 'icons' ? '⊞ Íconos' : '☰ Lista'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {myInvitations.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '28px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
              No tenés invitaciones pendientes.
            </div>
          ) : invView === 'icons' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 1, background: 'var(--grey-200)' }}>
              {myInvitations.map(inv => (
                <div key={inv.id} style={{ background: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', flex: 1, marginRight: 8 }}>{inv.gameName}</div>
                    <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '3px 8px', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>INVITACIÓN</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', lineHeight: 1.7 }}>
                    {inv.gameDate} · {inv.gameTime}<br />
                    {inv.gameClub}, {inv.gameCity}<br />
                    <span style={{ color: 'var(--grey-500)' }}>Invitado por <strong>{inv.fromPlayerName}</strong></span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleAcceptInvitation(inv)}
                      style={{ flex: 1, padding: '9px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      ✓ Aceptar
                    </button>
                    <button onClick={() => handleRejectInvitation(inv)}
                      style={{ flex: 1, padding: '9px', background: '#fff', color: '#ee0005', border: '1px solid #ee0005', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      ✗ Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
              {myInvitations.map((inv, idx) => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderTop: idx === 0 ? 'none' : '1px solid var(--grey-100)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{inv.gameName}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{inv.gameDate} · {inv.gameTime} · {inv.gameClub} · Por: {inv.fromPlayerName}</div>
                  </div>
                  <button onClick={() => handleAcceptInvitation(inv)}
                    style={{ padding: '6px 12px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    ✓ Aceptar
                  </button>
                  <button onClick={() => handleRejectInvitation(inv)}
                    style={{ padding: '6px 12px', background: '#fff', color: '#ee0005', border: '1px solid #ee0005', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    ✗ Rechazar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── HISTORIAL ────────────────────────────────────────────────────── */}
        {finishedGames.length > 0 && (
          <div>
            <div style={secTitle}>Historial ({finishedGames.length})</div>
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
              {finishedGames.map((g, idx) => {
                const isCreator = g.creatorId === uid || (uid && g.players.some(p => p.id === uid && p.isCreator));
                const myRankingEntry = uid ? getRankingHistoryForGame(g.id).find(e => e.playerId === uid) : null;
                const standing = uid ? g.standings.find(s => s.playerId === uid) : null;
                const posIdx = uid ? g.standings.findIndex(s => s.playerId === uid) : -1;
                return (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderTop: idx === 0 ? 'none' : '1px solid var(--grey-100)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{g.date} · {g.time} · {g.club}, {g.city}</div>
                      {standing && (
                        <div style={{ fontSize: 11, color: 'var(--grey-500)', marginTop: 2 }}>
                          Posición {posIdx + 1}/{g.standings.length} · {standing.pts} pts · {standing.wins}W
                        </div>
                      )}
                    </div>
                    {myRankingEntry && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '6px 10px',
                        background: myRankingEntry.delta > 0 ? '#dcfce7' : myRankingEntry.delta < 0 ? '#fee2e2' : '#fef3c7',
                        flexShrink: 0,
                      }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: myRankingEntry.delta > 0 ? '#166534' : myRankingEntry.delta < 0 ? '#ee0005' : '#b45309' }}>
                          {myRankingEntry.delta > 0 ? '+' : ''}{myRankingEntry.delta}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: myRankingEntry.delta > 0 ? '#166534' : myRankingEntry.delta < 0 ? '#ee0005' : '#b45309' }}>pts ranking</span>
                      </div>
                    )}
                    <Link href={`/dashboard/player/quick-game/${g.id}`}
                      style={{ padding: '6px 14px', background: 'var(--grey-100)', color: 'var(--grey-500)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      {isCreator ? 'Ver' : 'Resultados'}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WIZARD
  // ══════════════════════════════════════════════════════════════════════════

  // ── STEP I: Información básica ──────────────────────────────────────────

  if (step === 1) {
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <WizardHeader onCancel={goToDashboard} />
        <Steps current={1} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 24px' }}>Información Básica</h2>

        {/* Name */}
        <div style={card}>
          <div style={secTitle}>Nombre del juego</div>
          <label style={lbl}>Nombre *</label>
          <input
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            placeholder="Ej: Express del Martes, Open Mixto…"
            style={inp}
          />
        </div>

        {/* Date & time */}
        <div style={card}>
          <div style={secTitle}>Fecha y hora</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>Fecha *</label>
              <input type="date" value={date} min={today()} onChange={e => setDate(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Hora *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inp} />
            </div>
          </div>
          {date && date < today() && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>La fecha debe ser hoy o en el futuro.</div>
          )}
        </div>

        {/* Location */}
        <div style={card}>
          <div style={secTitle}>Ubicación</div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>¿Tenés la ubicación para el Juego Rápido?</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['SÍ', 'NO'] as const).map((opt) => {
                const val = opt === 'SÍ';
                const active = hasLocation === val;
                return (
                  <button key={opt} onClick={() => { setHasLocation(val); if (!val) { setIsRegisteredClub(null); setSelectedRegClub(null); setCountry(''); setCity(''); setClubId(''); setCustomClub(''); } }}
                    style={{ flex: 1, padding: '14px', border: `2px solid ${active ? 'var(--black)' : 'var(--grey-200)'}`, background: active ? 'var(--black)' : '#fff', color: active ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {hasLocation === true && (
            <div>
              <label style={lbl}>¿Es uno de tus Clubes Registrados?</label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                {(['SÍ', 'NO'] as const).map((opt) => {
                  const val = opt === 'SÍ';
                  const active = isRegisteredClub === val;
                  return (
                    <button key={opt} onClick={() => { setIsRegisteredClub(val); setSelectedRegClub(null); setCountry(''); setCity(''); setClubId(''); setCustomClub(''); }}
                      style={{ flex: 1, padding: '12px', border: `2px solid ${active ? 'var(--black)' : 'var(--grey-200)'}`, background: active ? 'var(--black)' : '#fff', color: active ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {isRegisteredClub === true && (
                <div>
                  {CREATOR_REGISTERED_CLUBS.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 10 }}>No tenés clubes registrados. Seleccioná una ubicación desde el mapa.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {CREATOR_REGISTERED_CLUBS.map(c => (
                        <button key={c.id} onClick={() => setSelectedRegClub(c)}
                          style={{ padding: '14px 18px', textAlign: 'left', border: `2px solid ${selectedRegClub?.id === c.id ? 'var(--black)' : 'var(--grey-200)'}`, background: selectedRegClub?.id === c.id ? 'var(--black)' : '#fff', color: selectedRegClub?.id === c.id ? '#fff' : 'var(--black)', cursor: 'pointer' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, textTransform: 'uppercase' }}>{c.name}</div>
                          <div style={{ fontSize: 11, marginTop: 2, color: selectedRegClub?.id === c.id ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>{c.city}, {c.country} · {c.courts} canchas</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isRegisteredClub === false && (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>País</label>
                    <select value={country} onChange={e => { setCountry(e.target.value); setCity(''); setClubId(''); }} style={sel}>
                      <option value="">Seleccioná un país</option>
                      {COUNTRIES_WITH_CLUBS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  {country && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={lbl}>Ciudad</label>
                      <select value={city} onChange={e => { setCity(e.target.value); setClubId(''); }} style={sel}>
                        <option value="">Seleccioná una ciudad</option>
                        {(CITIES_WITH_CLUBS[country] || []).map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                  {city && clubs.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={lbl}>Club</label>
                      <select value={clubId} onChange={e => { setClubId(e.target.value); if (e.target.value !== '__custom__') setCustomClub(''); }} style={sel}>
                        <option value="">Seleccioná un club</option>
                        {clubs.map(c => <option key={c.id} value={c.id}>{c.name} · {c.courts} canchas</option>)}
                        <option value="__custom__">Otros / Pista Privada</option>
                      </select>
                    </div>
                  )}
                  {isCustomLoc && (
                    <div>
                      <label style={lbl}>Nombre del lugar *</label>
                      <input type="text" value={customClub} onChange={e => setCustomClub(e.target.value)} placeholder="Ej: Cancha de Lucas, Club privado…" style={inp} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {hasLocation === false && (
            <div style={{ padding: '12px 16px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', fontSize: 12, color: 'var(--grey-500)' }}>
              Podés agregar la ubicación desde la gestión del juego más adelante.
            </div>
          )}
        </div>

        <NavBtns onNext={() => setStep(2)} nextLabel="Paso 2: Nivel →" disabled={!step1Valid} />
      </div>
    );
  }

  // ── STEP II: Nivel ──────────────────────────────────────────────────────

  if (step === 2) {
    const options: { key: Level; desc: string }[] = [
      { key: 'all',          desc: 'Cualquier jugador puede participar. En Intercambio, equipos balanceados por ranking.' },
      { key: 'beginner',     desc: 'Para quienes están empezando. Selección aleatoria en Intercambio.' },
      { key: 'intermediate', desc: 'Jugadores con experiencia. Selección aleatoria en Intercambio.' },
      { key: 'advanced',     desc: 'Alto nivel competitivo. Selección aleatoria en Intercambio.' },
    ];
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <WizardHeader onCancel={goToDashboard} />
        <Steps current={2} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Nivel de Juego</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>Define el nivel requerido para participar.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map(({ key, desc }) => (
            <button key={key} onClick={() => setLevel(key)} style={{ padding: '18px 22px', textAlign: 'left', cursor: 'pointer', border: `2px solid ${level === key ? 'var(--black)' : 'var(--grey-200)'}`, background: level === key ? 'var(--black)' : '#fff', color: level === key ? '#fff' : 'var(--black)', transition: 'all 0.12s' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{LEVEL_LABEL[key]}</div>
              <div style={{ fontSize: 12, color: level === key ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>{desc}</div>
            </button>
          ))}
        </div>
        <NavBtns onBack={() => setStep(1)} onNext={() => setStep(3)} disabled={!level} />
      </div>
    );
  }

  // ── STEP III: Jugadores ─────────────────────────────────────────────────

  if (step === 3) {
    const maxInvitable = maxPlayers - 1; // creator fills one slot
    const canAddMore = invitedList.length < maxInvitable;

    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 680 }}>
        <WizardHeader onCancel={goToDashboard} />
        <Steps current={3} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Jugadores</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>Invitá jugadores al Juego Rápido. Podés continuar sin invitar nadie.</p>

        {/* Max players selector */}
        <div style={card}>
          <div style={secTitle}>Cantidad máxima de jugadores</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[4, 6, 8, 10, 12].map(n => {
              const tooFew = n < invitedList.length + 1;
              return (
                <button key={n} onClick={() => !tooFew && setMaxPlayers(n)} disabled={tooFew}
                  style={{ width: 52, height: 48, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, cursor: tooFew ? 'not-allowed' : 'pointer', border: `2px solid ${maxPlayers === n ? 'var(--black)' : 'var(--grey-200)'}`, background: maxPlayers === n ? 'var(--black)' : tooFew ? 'var(--grey-50)' : '#fff', color: maxPlayers === n ? '#fff' : tooFew ? 'var(--grey-300)' : 'var(--black)' }}>
                  {n}
                </button>
              );
            })}
            <button disabled style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 48, border: '2px solid var(--grey-100)', background: 'var(--grey-50)', color: 'var(--grey-300)', cursor: 'not-allowed', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <span style={{ fontSize: 14 }}>🔒</span> Más + <span style={{ fontSize: 9 }}>Próximamente</span>
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--grey-400)' }}>
            {maxPlayers} jugadores · {maxPlayers / 2} parejas
          </div>
        </div>

        {/* Provisional player list */}
        <div style={card}>
          <div style={secTitle}>Lista Provisional de Jugadores</div>
          {/* Creator row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, background: 'rgba(214,255,0,0.06)', border: '1px solid rgba(214,255,0,0.3)' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {currentUser ? initials(currentUser.name) : 'YO'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser?.name ?? 'Tú'}</div>
              <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{currentUser?.shortId ?? ''}</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: 'var(--turf-green)', color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Confirmado (Creador)</span>
          </div>

          {/* Invited players */}
          {invitedList.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, border: '1px solid var(--grey-200)' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {initials(p.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.shortId ?? p.email ?? ''}</div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: 'var(--grey-100)', color: 'var(--grey-500)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pendiente</span>
              <button onClick={() => removeInvited(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-300)', padding: 0, lineHeight: 1 }}>×</button>
            </div>
          ))}

          {invitedList.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--grey-300)', fontStyle: 'italic', padding: '8px 0' }}>
              Aún no invitaste a nadie. Podés agregar jugadores abajo.
            </div>
          )}

          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--grey-50)', border: '1px solid var(--grey-100)', fontSize: 11, color: 'var(--grey-500)', lineHeight: 1.6 }}>
            Los jugadores invitados recibirán una notificación. Al aceptar la invitación, se creará automáticamente la relación de amistad.
          </div>
        </div>

        {/* Add player panel */}
        {canAddMore && (
          <div style={card}>
            <div style={secTitle}>Agregar Jugador</div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--grey-200)' }}>
              {(['friends', 'search'] as const).map(tab => {
                const labels = { friends: 'Mis Amistades', search: 'Buscar Jugador' };
                return (
                  <button key={tab} onClick={() => { setPlayerTab(tab); setSearchQuery(''); setSearchResults([]); }}
                    style={{ padding: '10px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', borderBottom: `2px solid ${playerTab === tab ? 'var(--black)' : 'transparent'}`, background: 'transparent', color: playerTab === tab ? 'var(--black)' : 'var(--grey-400)', cursor: 'pointer', marginBottom: -2 }}>
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Friends tab */}
            {playerTab === 'friends' && (
              <div>
                {friendList.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', padding: '16px 0' }}>No tenés amigos registrados aún.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                    {friendList.map(f => {
                      const already = isAlreadyInvited(f.id);
                      return (
                        <button key={f.id} onClick={() => addInvited(f)} disabled={already || !canAddMore}
                          style={{ padding: '12px', border: `1px solid ${already ? 'var(--grey-100)' : 'var(--grey-200)'}`, background: already ? 'var(--grey-50)' : '#fff', cursor: already ? 'default' : 'pointer', textAlign: 'left', position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: already ? 'var(--grey-300)' : 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {initials(f.name)}
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>#{f.ranking}</span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: already ? 'var(--grey-400)' : 'var(--black)', lineHeight: 1.3 }}>{f.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 2 }}>{f.shortId}</div>
                          {already && (
                            <div style={{ marginTop: 6, fontSize: 9, fontWeight: 700, color: 'var(--turf-green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ya invitado</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Search tab */}
            {playerTab === 'search' && (
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, email o #ID…"
                  style={{ ...inp, marginBottom: 0 }}
                />
                {searchQuery.trim().length >= 2 && (
                  <div style={{ border: '1px solid var(--grey-200)', borderTop: 'none', maxHeight: 280, overflowY: 'auto' }}>
                    {searchResults.length === 0 ? (
                      <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey-400)' }}>No se encontraron jugadores.</div>
                    ) : searchResults.map(p => {
                      const already = isAlreadyInvited(p.id);
                      const friend = isFriend(p.id);
                      return (
                        <button key={p.id} onClick={() => addInvited(p)} disabled={already || !canAddMore}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--grey-100)', cursor: already ? 'default' : 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: already ? 'var(--grey-300)' : 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {initials(p.name)}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: already ? 'var(--grey-400)' : 'var(--black)' }}>{p.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.shortId} · #{p.ranking}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            {already && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--turf-green)', textTransform: 'uppercase' }}>Ya invitado</span>}
                            {!friend && !already && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--grey-400)', textTransform: 'uppercase', padding: '1px 5px', background: 'var(--grey-100)' }}>No eres amigo</span>}
                            {friend && !already && <span style={{ fontSize: 9, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', padding: '1px 5px', background: 'rgba(124,58,237,0.08)' }}>Amigo</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--grey-400)' }}>Escribí al menos 2 caracteres para buscar.</div>
                )}
              </div>
            )}
          </div>
        )}

        {!canAddMore && (
          <div style={{ padding: '11px 16px', background: 'rgba(214,255,0,0.06)', border: '1px solid rgba(214,255,0,0.3)', fontSize: 12, color: 'var(--grey-500)', marginBottom: 8 }}>
            Alcanzaste el máximo de jugadores invitados ({maxPlayers - 1}). Aumentá el máximo para agregar más.
          </div>
        )}

        <NavBtns onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="Paso 4: Pareja →" />
      </div>
    );
  }

  // ── STEP IV: Tipo de pareja ─────────────────────────────────────────────

  if (step === 4) {
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <WizardHeader onCancel={goToDashboard} />
        <Steps current={4} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Tipo de Pareja</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>¿Las parejas son fijas o rotan durante el juego?</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {([
            { key: 'exchange' as PairType, title: 'Intercambio de Pareja', desc: 'El sistema rota los compañeros automáticamente en cada ronda según el ranking.' },
            { key: 'fixed'    as PairType, title: 'Pareja Fija',           desc: 'El creador asigna las parejas manualmente desde la gestión del juego. Los equipos se mantienen todo el juego.' },
          ]).map(({ key, title, desc }) => (
            <button key={key} onClick={() => setPairType(key)} style={{ padding: '24px 20px', textAlign: 'left', cursor: 'pointer', border: `2px solid ${pairType === key ? 'var(--black)' : 'var(--grey-200)'}`, background: pairType === key ? 'var(--black)' : '#fff', color: pairType === key ? '#fff' : 'var(--black)', transition: 'all 0.12s' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
              <div style={{ fontSize: 12, color: pairType === key ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)', lineHeight: 1.5 }}>{desc}</div>
            </button>
          ))}
        </div>

        {pairType === 'exchange' && (
          <div style={{ padding: '16px 20px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', fontSize: 12, color: 'var(--grey-600)', lineHeight: 1.6 }}>
            {level === 'all'
              ? 'Nivel mixto: se empareja el jugador con mejor ranking con el de peor ranking para equilibrar cada pareja.'
              : 'Nivel homogéneo: el sistema asigna las parejas aleatoriamente en cada ronda.'}
          </div>
        )}

        {pairType === 'fixed' && (
          <div style={{ padding: '16px 20px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', fontSize: 12, color: 'var(--grey-600)', lineHeight: 1.6 }}>
            Podrás armar las parejas desde la gestión del juego una vez que todos los jugadores hayan confirmado.
          </div>
        )}

        <NavBtns onBack={() => setStep(3)} onNext={() => setStep(5)} disabled={!pairType} nextLabel="Paso 5: Config →" />
      </div>
    );
  }

  // ── STEP V: Configuración ───────────────────────────────────────────────

  if (step === 5) {
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <WizardHeader onCancel={goToDashboard} />
        <Steps current={5} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Configuración del Juego</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>Definí las canchas disponibles y el sistema de puntaje.</p>

        {/* Courts */}
        <div style={card}>
          <div style={secTitle}>Canchas disponibles</div>
          <label style={lbl}>¿Cuántas canchas disponibles?</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setCourts(n)}
                style={{ width: 52, height: 48, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, cursor: 'pointer', border: `2px solid ${courts === n ? 'var(--black)' : 'var(--grey-200)'}`, background: courts === n ? 'var(--black)' : '#fff', color: courts === n ? '#fff' : 'var(--black)' }}>
                {n}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Se jugarán {courts} partido{courts > 1 ? 's' : ''} simultáneo{courts > 1 ? 's' : ''} por ronda.</div>
        </div>

        {/* Score type */}
        <div style={card}>
          <div style={secTitle}>Tipo de score</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {([
              { key: 'traditional' as ScoreType, title: 'Tradicional', desc: '0, 15, 30, 40 — conteo clásico de pádel/tenis con games y sets.' },
              { key: 'points'      as ScoreType, title: 'Por Puntos',  desc: 'Puntos simples hasta un objetivo definido.' },
            ]).map(({ key, title, desc }) => (
              <button key={key} onClick={() => setScoreType(key)} style={{ padding: '16px', textAlign: 'left', cursor: 'pointer', border: `2px solid ${scoreType === key ? 'var(--black)' : 'var(--grey-200)'}`, background: scoreType === key ? 'var(--black)' : '#fff', color: scoreType === key ? '#fff' : 'var(--black)', transition: 'all 0.12s' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, textTransform: 'uppercase', marginBottom: 5 }}>{title}</div>
                <div style={{ fontSize: 11, color: scoreType === key ? 'rgba(255,255,255,0.5)' : 'var(--grey-400)', lineHeight: 1.4 }}>{desc}</div>
              </button>
            ))}
          </div>

          {scoreType === 'traditional' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Sets por partido</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setSetsPerMatch(n)} style={{ flex: 1, padding: '16px', border: `2px solid ${setsPerMatch === n ? 'var(--black)' : 'var(--grey-200)'}`, background: setsPerMatch === n ? 'var(--black)' : '#fff', color: setsPerMatch === n ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, color: setsPerMatch === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>Set{n > 1 ? 's' : ''}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Games por set</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[4, 5, 6].map(n => (
                    <button key={n} onClick={() => setGamesPerSet(n)} style={{ flex: 1, padding: '14px', border: `2px solid ${gamesPerSet === n ? 'var(--black)' : 'var(--grey-200)'}`, background: gamesPerSet === n ? 'var(--black)' : '#fff', color: gamesPerSet === n ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, color: gamesPerSet === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>games</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Tiebreak (puntos para ganar)</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[7, 10].map(n => (
                    <button key={n} onClick={() => setTiebreak(n)} style={{ flex: 1, padding: '14px', border: `2px solid ${tiebreak === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tiebreak === n ? 'var(--black)' : '#fff', color: tiebreak === n ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, color: tiebreak === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>puntos</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Regla de Deuce / Ventaja</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(['traditional', 'gold', 'silver', 'ipf'] as DeuceRule[]).map(rule => (
                    <button key={rule} onClick={() => setDeuceRule(rule)} style={{ padding: '12px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12, border: `1px solid ${deuceRule === rule ? 'var(--black)' : 'var(--grey-200)'}`, background: deuceRule === rule ? 'var(--grey-900)' : '#fff', color: deuceRule === rule ? '#fff' : 'var(--black)' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${deuceRule === rule ? 'var(--neon)' : 'var(--grey-300)'}`, background: deuceRule === rule ? 'var(--neon)' : 'transparent', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{DEUCE_LABEL[rule]}</div>
                        <div style={{ fontSize: 11, color: deuceRule === rule ? 'rgba(255,255,255,0.5)' : 'var(--grey-400)', lineHeight: 1.5 }}>{DEUCE_DESC[rule]}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {scoreType === 'points' && (
            <div>
              <label style={lbl}>Puntaje objetivo</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {[16, 18, 20, 22, 24].map(n => (
                  <button key={n} onClick={() => setPointTarget(n)} style={{ width: 58, height: 48, border: `2px solid ${pointTarget === n ? 'var(--black)' : 'var(--grey-200)'}`, background: pointTarget === n ? 'var(--black)' : '#fff', color: pointTarget === n ? '#fff' : 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>El primer equipo en llegar a {pointTarget} puntos gana el set.</div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
          <button onClick={() => setStep(4)} style={{ padding: '11px 24px', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>← Atrás</button>
          <button
            onClick={handleSubmit}
            style={{ padding: '13px 36px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            CREAR JUEGO RÁPIDO
          </button>
        </div>
      </div>
    );
  }

  return null;
}
