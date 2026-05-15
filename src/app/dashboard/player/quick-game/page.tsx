'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type GameStatus   = 'draft' | 'created' | 'starting_soon' | 'live' | 'finished';
type Level        = 'all' | 'beginner' | 'intermediate' | 'advanced';
type PairType     = 'fixed' | 'exchange';
type ScoreType    = 'traditional' | 'points';
type DeuceRule    = 'traditional' | 'gold' | 'silver' | 'ipf';
type PlayerLevel  = 'beginner' | 'intermediate' | 'advanced';

type Club = { id: string; name: string; courts: number };
type Player = { id: string; name: string; ranking: number; level: PlayerLevel; registered: boolean; email?: string };

type QuickGame = {
  id: string; code: string; name: string;
  date: string; time: string; club: string; city: string;
  levelLabel: string; players: number; maxPlayers: number;
  pairType: PairType; status: GameStatus;
  result?: string; won?: boolean;
};

// ── Mock data ─────────────────────────────────────────────────────────────────

const COUNTRIES_WITH_CLUBS = ['Argentina', 'Chile', 'Uruguay', 'España'];

const CITIES_WITH_CLUBS: Record<string, string[]> = {
  Argentina: ['Buenos Aires', 'Rosario', 'Córdoba'],
  Chile:     ['Santiago'],
  Uruguay:   ['Montevideo'],
  España:    ['Madrid'],
};

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

const CREATOR: Player = { id: 'me', name: 'Diego García', ranking: 47, level: 'intermediate', registered: true };

const FRIENDS: Player[] = [
  { id: 'f1', name: 'Ana Rodríguez',   ranking: 34,  level: 'intermediate', registered: true },
  { id: 'f2', name: 'Marcos Herrera',  ranking: 12,  level: 'advanced',     registered: true },
  { id: 'f3', name: 'Carlos Vargas',   ranking: 89,  level: 'beginner',     registered: true },
  { id: 'f4', name: 'Sofía López',     ranking: 56,  level: 'intermediate', registered: true },
  { id: 'f5', name: 'Laura Torres',    ranking: 101, level: 'beginner',     registered: true },
  { id: 'f6', name: 'Diego Fernández', ranking: 45,  level: 'intermediate', registered: true },
];

const ALL_PLAYERS: Player[] = [
  ...FRIENDS,
  { id: 'p7',  name: 'Pedro Morales', ranking: 8,  level: 'advanced',     registered: true },
  { id: 'p8',  name: 'Isabel Bravo',  ranking: 23, level: 'advanced',     registered: true },
  { id: 'p9',  name: 'Juan Castro',   ranking: 67, level: 'intermediate', registered: true },
  { id: 'p10', name: 'Elena Vidal',   ranking: 78, level: 'beginner',     registered: true },
  { id: 'p11', name: 'Raúl Ortega',   ranking: 15, level: 'advanced',     registered: true },
  { id: 'p12', name: 'Marta Fuentes', ranking: 92, level: 'beginner',     registered: true },
];

const NEARBY_GAMES = [
  { id: 'n1', name: 'Americano Barrio Norte', host: 'Carlos V.',  level: 'Todos',      players: 6, max: 8,  time: 'Hoy 21:00',    club: 'Padel Arena',        distance: '0.8 km' },
  { id: 'n2', name: 'Rápido Avanzado',        host: 'Isabel B.',  level: 'Avanzado',   players: 2, max: 4,  time: 'Mañana 08:00', club: 'Club Barrio Norte',  distance: '1.2 km' },
  { id: 'n3', name: 'Open Mixto Sábado',      host: 'Pedro M.',   level: 'Intermedio', players: 8, max: 12, time: 'Sábado 10:00', club: 'Club Deportivo Sur', distance: '2.1 km' },
];

const MOCK_GAMES: QuickGame[] = [
  { id: 'g1', code: 'JR-2026-3841', name: 'Express Nocturno',   date: '14 May 2026', time: '20:00', club: 'Padel Arena',       city: 'Buenos Aires', levelLabel: 'Todos',      players: 4, maxPlayers: 4, pairType: 'exchange', status: 'live' },
  { id: 'g2', code: 'JR-2026-5519', name: 'Juego Rápido Tarde', date: '15 May 2026', time: '17:00', club: 'Club Barrio Norte', city: 'Buenos Aires', levelLabel: 'Intermedio', players: 4, maxPlayers: 4, pairType: 'exchange', status: 'starting_soon' },
  { id: 'g3', code: 'JR-2026-4827', name: 'Juego del Sábado',   date: '20 May 2026', time: '11:00', club: 'Club Barrio Norte', city: 'Buenos Aires', levelLabel: 'Intermedio', players: 2, maxPlayers: 4, pairType: 'fixed',    status: 'created' },
  { id: 'g4', code: 'JR-2026-2234', name: 'Americano Viernes',  date: '8 May 2026',  time: '19:00', club: 'Padel Arena',       city: 'Buenos Aires', levelLabel: 'Avanzado',   players: 8, maxPlayers: 8, pairType: 'exchange', status: 'finished', result: '3–1', won: true },
  { id: 'g5', code: 'JR-2026-1198', name: 'Express del Club',   date: '2 May 2026',  time: '10:00', club: 'Club La Cantera',   city: 'Córdoba',      levelLabel: 'Todos',      players: 6, maxPlayers: 6, pairType: 'exchange', status: 'finished', result: '1–2', won: false },
];

// ── Label maps ────────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<Level, string> = {
  all: 'Todos los Niveles', beginner: 'Principiante',
  intermediate: 'Intermedio', advanced: 'Avanzado',
};
const LEVEL_SHORT: Record<PlayerLevel, string> = {
  beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
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
  draft:         { label: 'En Creación', color: 'var(--grey-400)'    },
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

// ── Sub-components ────────────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const labels = ['Nivel', 'Jugadores', 'Pareja', 'Configuración'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
      {labels.map((label, i) => {
        const num = i + 1;
        const done = current > num;
        const active = current === num;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'var(--turf-green)' : active ? 'var(--black)' : 'var(--grey-100)', color: done || active ? '#fff' : 'var(--grey-400)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700 }}>
                {done ? '✓' : num}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? 'var(--black)' : done ? 'var(--turf-green)' : 'var(--grey-300)' }}>{label}</span>
            </div>
            {i < labels.length - 1 && <div style={{ width: 48, height: 2, background: done ? 'var(--turf-green)' : 'var(--grey-200)', margin: '0 4px', marginBottom: 18 }} />}
          </div>
        );
      })}
    </div>
  );
}

function NavBtns({ onBack, onNext, nextLabel = 'Siguiente →', disabled = false }: { onBack?: () => void; onNext: () => void; nextLabel?: string; disabled?: boolean }) {
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

function WizardHeader({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid var(--grey-100)' }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 4 }}>Nuevo Juego</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>CREAR JUEGO RÁPIDO</h1>
      </div>
      <button onClick={onBack} style={{ padding: '9px 18px', border: '1px solid var(--grey-200)', fontSize: 11, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        ← Dashboard
      </button>
    </div>
  );
}

function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

// ── Main component ────────────────────────────────────────────────────────────

export default function QuickGamePage() {

  // ── View + game list ──────────────────────────────────────────────────────
  const [view, setView]         = useState<'dashboard' | 'wizard'>('dashboard');
  const [games, setGames]       = useState<QuickGame[]>(() => {
    if (typeof window === 'undefined') return MOCK_GAMES;
    try { const s = localStorage.getItem('qg_games'); return s ? JSON.parse(s) : MOCK_GAMES; } catch { return MOCK_GAMES; }
  });
  const [newGameCode, setNewGameCode] = useState('');
  const [qrGame, setQrGame]     = useState<QuickGame | null>(null);
  const [copied, setCopied]     = useState(false);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);
  const [joinedToast, setJoinedToast]   = useState<string | null>(null);

  // Sync games to localStorage whenever they change
  useEffect(() => { try { localStorage.setItem('qg_games', JSON.stringify(games)); } catch {} }, [games]);

  // Read notification + cancelled game from localStorage on mount
  useEffect(() => {
    try {
      const n = localStorage.getItem('qg_notification');
      if (n) { setNotification(JSON.parse(n)); localStorage.removeItem('qg_notification'); }
      const cancelledId = localStorage.getItem('qg_cancelled');
      if (cancelledId) { setGames(prev => prev.filter(g => g.id !== cancelledId)); localStorage.removeItem('qg_cancelled'); }
    } catch {}
  }, []);

  // ── Wizard step ───────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  // INICIO
  const [gameName, setGameName] = useState('');
  const [date, setDate]       = useState('');
  const [time, setTime]       = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity]       = useState('');
  const [clubId, setClubId]   = useState('');

  // Step 1
  const [level, setLevel] = useState<Level | null>(null);

  // Step 2
  const [slots, setSlots]             = useState<(Player | null)[]>([CREATOR, null, null, null]);
  const [searchMode, setSearchMode]   = useState<'friends' | 'platform' | 'new' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendSel, setFriendSel]     = useState<Set<string>>(new Set());
  const [newFirst, setNewFirst]       = useState('');
  const [newLast, setNewLast]         = useState('');
  const [newEmail, setNewEmail]       = useState('');

  // Step 3
  const [pairType, setPairType]   = useState<PairType | null>(null);
  const [teams, setTeams]         = useState<(Player | null)[][]>([]);
  const [dragOver, setDragOver]   = useState<{ ti: number; si: number } | null>(null);

  // Step 4
  const [setsPerRound, setSetsPerRound] = useState(1);
  const [scoreType, setScoreType]       = useState<ScoreType>('traditional');
  const [gamesPerSet, setGamesPerSet]   = useState(6);
  const [tiebreak, setTiebreak]         = useState(7);
  const [deuceRule, setDeuceRule]       = useState<DeuceRule>('gold');
  const [pointTarget, setPointTarget]   = useState(16);

  const wizNext = () => setStep(s => s + 1);
  const wizBack = () => setStep(s => s - 1);

  const clubs        = city ? (CLUBS[city] || []) : [];
  const selectedClub = clubs.find(c => c.id === clubId) ?? null;
  const filledSlots  = slots.filter((s): s is Player => s !== null);
  const emptyCount   = slots.filter(s => s === null).length;
  const hasQR        = emptyCount > 0;
  const levelFilter  = (p: Player) => !level || level === 'all' || p.level === level;

  // ── Slot helpers ──────────────────────────────────────────────────────────

  function compact(arr: (Player | null)[]) { return [...arr.filter(Boolean), ...arr.filter(s => !s)]; }

  function addToSlot(p: Player) {
    if (slots.some(s => s?.id === p.id)) return;
    const next = [...slots];
    const idx = next.indexOf(null);
    if (idx === -1) return;
    next[idx] = p;
    setSlots(compact(next));
    setSearchQuery('');
    setSearchMode(null);
  }

  function addSelectedFriends() {
    const toAdd = FRIENDS.filter(f => friendSel.has(f.id) && !slots.some(s => s?.id === f.id));
    const next = [...slots];
    for (const p of toAdd) {
      const idx = next.indexOf(null);
      if (idx === -1) break;
      next[idx] = p;
    }
    setSlots(compact(next));
    setFriendSel(new Set());
    setSearchMode(null);
  }

  function toggleFriend(id: string) {
    if (slots.some(s => s?.id === id)) return;
    setFriendSel(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function removeSlot(i: number) {
    const next = [...slots]; next[i] = null; setSlots(compact(next));
  }

  function setSlotCount(n: number) {
    if (n < filledSlots.length) return;
    const filled = slots.filter(Boolean);
    const result: (Player | null)[] = [...filled];
    while (result.length < n) result.push(null);
    setSlots(result.slice(0, n));
  }

  function addNewPlayer() {
    if (!newFirst.trim() && !newLast.trim()) return;
    addToSlot({ id: `inv-${Date.now()}`, name: `${newFirst.trim()} ${newLast.trim()}`.trim(), ranking: 9999, level: level && level !== 'all' ? level : 'intermediate', registered: false, email: newEmail.trim() || undefined });
    setNewFirst(''); setNewLast(''); setNewEmail('');
  }

  // ── Team helpers (with DnD) ───────────────────────────────────────────────

  function initTeams() {
    const n = slots.length / 2;
    const t: (Player | null)[][] = Array.from({ length: n }, () => [null, null]);
    filledSlots.forEach((p, i) => { const ti = Math.floor(i / 2), si = i % 2; if (ti < t.length) t[ti][si] = p; });
    setTeams(t);
  }

  function assignToTeam(playerId: string, ti: number, si: number) {
    const player = filledSlots.find(p => p.id === playerId);
    if (!player) return;
    const next = teams.map(t => [...t]);
    // Remove from any current slot
    for (let a = 0; a < next.length; a++) for (let b = 0; b < 2; b++) if (next[a][b]?.id === playerId) next[a][b] = null;
    // Swap if target slot is occupied
    const displaced = next[ti][si];
    next[ti][si] = player;
    // If there was someone there, put them in the vacated spot (or leave unassigned)
    if (displaced) {
      outer: for (let a = 0; a < next.length; a++) for (let b = 0; b < 2; b++) if (!next[a][b]) { next[a][b] = displaced; break outer; }
    }
    setTeams(next);
  }

  function removeFromTeam(ti: number, si: number) {
    const next = teams.map(t => [...t]);
    next[ti][si] = null;
    setTeams(next);
  }

  // ── Search results ────────────────────────────────────────────────────────

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const source = searchMode === 'friends' ? FRIENDS : ALL_PLAYERS;
    return source.filter(p => p.name.toLowerCase().includes(q)).filter(p => !slots.some(s => s?.id === p.id)).slice(0, 6);
  }, [searchQuery, searchMode, slots]);

  // ── Wizard lifecycle ──────────────────────────────────────────────────────

  function createGame() {
    const code = `JR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setNewGameCode(code);
    const newGame: QuickGame = {
      id: `g-${Date.now()}`,
      code,
      name: gameName.trim() || (selectedClub ? `Juego en ${selectedClub.name}` : 'Juego Rápido'),
      date: date || '–',
      time: time || '–',
      club: selectedClub?.name || '–',
      city: city || '–',
      levelLabel: level ? LEVEL_LABEL[level] : 'Todos',
      players: filledSlots.length,
      maxPlayers: slots.length,
      pairType: pairType || 'exchange',
      status: 'created',
    };
    setGames(prev => [newGame, ...prev]);
    setStep(99);
  }

  function resetWizard() {
    setStep(0); setGameName(''); setDate(''); setTime(''); setCountry(''); setCity(''); setClubId('');
    setLevel(null); setSlots([CREATOR, null, null, null]); setSearchMode(null);
    setPairType(null); setTeams([]); setSetsPerRound(1);
    setScoreType('traditional'); setGamesPerSet(6); setTiebreak(7);
    setDeuceRule('gold'); setPointTarget(16);
    setFriendSel(new Set()); setSearchQuery('');
    setNewFirst(''); setNewLast(''); setNewEmail('');
  }

  function goToDashboard() { resetWizard(); setView('dashboard'); }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  if (view === 'dashboard') {
    const activeGames   = games.filter(g => ['draft', 'created', 'starting_soon', 'live'].includes(g.status));
    const finishedGames = games.filter(g => g.status === 'finished');
    const pendingQR     = activeGames.filter(g => g.players < g.maxPlayers);
    const wins          = finishedGames.filter(g => g.won).length;

    function copyCode(code: string) {
      navigator.clipboard.writeText(code).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    return (
      <div style={{ padding: '40px 40px 80px' }}>

        {/* Notification Banner */}
        {notification && (
          <div style={{ marginBottom: 24, padding: '14px 20px', background: notification.type === 'cancelled' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${notification.type === 'cancelled' ? '#fecaca' : '#bbf7d0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>{notification.type === 'cancelled' ? '🔕' : '✓'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: notification.type === 'cancelled' ? '#dc2626' : 'var(--turf-green)' }}>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-400)', padding: 0 }}>×</button>
          </div>
        )}

        {/* Joined toast */}
        {joinedToast && (
          <div style={{ marginBottom: 24, padding: '14px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>🎾</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--turf-green)' }}>{joinedToast}</span>
            </div>
            <button onClick={() => setJoinedToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-400)', padding: 0 }}>×</button>
          </div>
        )}

        {/* QR Share Modal */}
        {qrGame && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => setQrGame(null)}>
            <div style={{ background: '#fff', width: '100%', maxWidth: 420, padding: '32px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>Invitar jugadores</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase' }}>{qrGame.name}</div>
                </div>
                <button onClick={() => setQrGame(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--grey-400)', padding: 0, lineHeight: 1 }}>×</button>
              </div>

              {/* QR visual */}
              <div style={{ background: 'var(--grey-900)', padding: '24px', textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 120, height: 120, background: 'var(--grey-700)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--grey-400)', fontWeight: 600 }}>QR Code</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.12em' }}>{qrGame.code}</div>
              </div>

              {/* Share options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>Compartir con</div>

                {/* Friends */}
                <button style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <span style={{ fontSize: 18 }}>👥</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>Enviar a Mis Amistades</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Seleccioná amigos registrados para notificarles</div>
                  </div>
                </button>

                {/* Search players */}
                <button style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <span style={{ fontSize: 18 }}>🔍</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>Buscar y enviar a jugadores</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Buscá jugadores en la plataforma por nombre</div>
                  </div>
                </button>

                {/* Copy code/link */}
                <button onClick={() => copyCode(qrGame.code)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${copied ? 'var(--turf-green)' : 'var(--grey-200)'}`, background: copied ? 'rgba(0,200,100,0.05)' : '#fff', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <span style={{ fontSize: 18 }}>{copied ? '✓' : '📋'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: copied ? 'var(--turf-green)' : 'var(--black)' }}>{copied ? '¡Copiado!' : 'Copiar código / link'}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>Pegalo en WhatsApp, Instagram o cualquier medio</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Jugador</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>JUEGOS RÁPIDOS</h1>
          </div>
          <button
            onClick={() => setView('wizard')}
            style={{ padding: '13px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}
          >
            + Crear Nuevo Juego Rápido
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 40 }}>
          {[
            { label: 'Juegos creados', value: String(games.length) },
            { label: 'Activos',        value: String(activeGames.length),   color: '#7c3aed' },
            { label: 'Finalizados',    value: String(finishedGames.length) },
            { label: 'Victorias',      value: String(wins),                 color: 'var(--turf-green)' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, lineHeight: 1, color: s.color || 'var(--black)' }}>{s.value}</div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pending QR invitations */}
        {pendingQR.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7c3aed', fontWeight: 700, marginBottom: 14 }}>
              Invitaciones Pendientes — Slots Vacíos ({pendingQR.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
              {pendingQR.map(g => {
                const si = STATUS_INFO[g.status];
                const empty = g.maxPlayers - g.players;
                return (
                  <div key={g.id} style={{ background: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                    <button onClick={() => setQrGame(g)} style={{ width: 48, height: 48, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, cursor: 'pointer', title: 'Ver QR e invitar' } as React.CSSProperties}>⬛</button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 2 }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{g.date} · {g.time} · {g.club}, {g.city}</div>
                      <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginTop: 3 }}>
                        {g.players}/{g.maxPlayers} jugadores · {empty} slot{empty > 1 ? 's' : ''} vacío{empty > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#7c3aed', marginBottom: 6 }}>{g.code}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: si.color }}>{si.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active games */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 700, marginBottom: 14 }}>
            Mis Juegos Activos ({activeGames.length})
          </div>
          {activeGames.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 8 }}>Sin juegos activos</div>
              <p style={{ fontSize: 13, color: 'var(--grey-400)', margin: '0 0 18px' }}>Creá un Juego Rápido o unite a uno cercano.</p>
              <button onClick={() => setView('wizard')} style={{ padding: '10px 22px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                + Crear Juego Rápido
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 1, background: 'var(--grey-200)' }}>
              {activeGames.map(g => {
                const si = STATUS_INFO[g.status];
                const isLive = g.status === 'live';
                return (
                  <div key={g.id} style={{ background: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.2, flex: 1, marginRight: 10 }}>{g.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        {isLive && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
                        <span style={{ fontSize: 11, fontWeight: 700, color: si.color }}>{si.label}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--grey-400)', lineHeight: 1.7 }}>
                      {g.date} · {g.time}<br />
                      {g.club}, {g.city}<br />
                      {g.levelLabel} · {g.pairType === 'fixed' ? 'Pareja Fija' : 'Intercambio'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                          {g.players}<span style={{ fontSize: 13, color: 'var(--grey-400)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>/{g.maxPlayers}</span>
                        </div>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-400)', fontWeight: 600 }}>jugadores</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', letterSpacing: '0.08em' }}>{g.code}</span>
                        <Link
                          href={isLive ? `/dashboard/player/quick-game/${g.id}` : `/dashboard/player/quick-game/${g.id}/edit`}
                          style={{ padding: '7px 16px', background: isLive ? 'var(--turf-green)' : 'var(--grey-100)', color: isLive ? '#fff' : 'var(--grey-600)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-block' }}
                        >
                          {isLive ? 'Ver Partido' : 'Gestionar'}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nearby games */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 700, marginBottom: 14 }}>Juegos Cercanos — Unirse</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
            {NEARBY_GAMES.map(g => (
              <div key={g.id} style={{ background: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <span className="chip" style={{ fontSize: 9 }}>{g.level}</span>
                    <span className="chip" style={{ fontSize: 9, background: 'var(--grey-50)' }}>{g.distance}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>Por {g.host} · {g.club} · {g.time}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                    {g.players}<span style={{ fontSize: 13, color: 'var(--grey-400)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>/{g.max}</span>
                  </div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 8 }}>jugadores</div>
                  <button
                    onClick={() => {
                      const alreadyJoined = games.some(existingGame => existingGame.id === `n-${g.id}`);
                      if (alreadyJoined) { setJoinedToast(`Ya estás en "${g.name}". Lo encontrarás en Mis Juegos Activos.`); setTimeout(() => setJoinedToast(null), 4000); return; }
                      const code = `JR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                      const joined: QuickGame = { id: `n-${g.id}`, code, name: g.name, date: g.time.includes('Hoy') ? '15 May 2026' : g.time.includes('Mañana') ? '16 May 2026' : '20 May 2026', time: g.time.replace(/^(Hoy|Mañana|Sábado)\s/, ''), club: g.club, city: '', levelLabel: g.level, players: g.players + 1, maxPlayers: g.max, pairType: 'exchange', status: 'created' };
                      setGames(prev => [joined, ...prev]);
                      setJoinedToast(`¡Te uniste a "${g.name}"! Aparece en Mis Juegos Activos.`);
                      setTimeout(() => setJoinedToast(null), 4000);
                    }}
                    style={{ padding: '7px 16px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unirse</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        {finishedGames.length > 0 && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 700, marginBottom: 14 }}>
              Historial ({finishedGames.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--grey-50)', borderBottom: '2px solid var(--grey-200)' }}>
                  {['Juego', 'Fecha', 'Club', 'Jugadores', 'Resultado', 'Código'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {finishedGames.map((g, i) => (
                  <tr key={g.id} style={{ borderBottom: '1px solid var(--grey-100)', background: i % 2 === 0 ? '#fff' : 'var(--grey-50)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{g.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey-400)' }}>{g.date}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey-400)' }}>{g.club}, {g.city}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey-400)', textAlign: 'center' }}>{g.players}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {g.result && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: g.won ? 'var(--turf-green)' : 'var(--grey-400)' }}>
                          {g.won ? '▲ ' : '▼ '}{g.result}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/dashboard/player/quick-game/${g.id}`} style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.08em', textDecoration: 'none', cursor: 'pointer' }}>{g.code}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WIZARD — STEP 0: INICIO
  // ══════════════════════════════════════════════════════════════════════════

  if (step === 0) {
    const ok = date && time && country && city && clubId;
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <WizardHeader onBack={goToDashboard} />

        <div style={card}>
          <div style={secTitle}>Nombre del juego</div>
          <label style={lbl}>Nombre</label>
          <input
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            placeholder={selectedClub ? `Juego en ${selectedClub.name}` : 'Ej: Express del Martes, Open Mixto…'}
            style={inp}
          />
        </div>

        <div style={card}>
          <div style={secTitle}>Fecha y hora</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label style={lbl}>Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Hora</label><input type="time" value={time} onChange={e => setTime(e.target.value)} style={inp} /></div>
          </div>
        </div>

        <div style={card}>
          <div style={secTitle}>Club / Ubicación</div>
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
            <div>
              <label style={lbl}>Club</label>
              <select value={clubId} onChange={e => setClubId(e.target.value)} style={sel}>
                <option value="">Seleccioná un club</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name} · {c.courts} canchas</option>)}
              </select>
            </div>
          )}
        </div>

        <NavBtns onNext={wizNext} nextLabel="Paso 1: Nivel →" disabled={!ok} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WIZARD — STEP 1: LEVEL
  // ══════════════════════════════════════════════════════════════════════════

  if (step === 1) {
    const options: { key: Level; desc: string }[] = [
      { key: 'all',          desc: 'Cualquier jugador puede participar. En Intercambio, equipos balanceados por ranking.' },
      { key: 'beginner',     desc: 'Para quienes están empezando. Selección aleatoria en Intercambio.' },
      { key: 'intermediate', desc: 'Jugadores con experiencia. Selección aleatoria en Intercambio.' },
      { key: 'advanced',     desc: 'Alto nivel competitivo. Selección aleatoria en Intercambio.' },
    ];
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <WizardHeader onBack={goToDashboard} />
        <Steps current={1} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Nivel del Juego</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>Define el nivel requerido para participar.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map(({ key, desc }) => (
            <button key={key} onClick={() => setLevel(key)} style={{ padding: '18px 22px', textAlign: 'left', cursor: 'pointer', border: `2px solid ${level === key ? 'var(--black)' : 'var(--grey-200)'}`, background: level === key ? 'var(--black)' : '#fff', color: level === key ? '#fff' : 'var(--black)', transition: 'all 0.12s' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{LEVEL_LABEL[key]}</div>
              <div style={{ fontSize: 12, color: level === key ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>{desc}</div>
            </button>
          ))}
        </div>
        <NavBtns onBack={wizBack} onNext={wizNext} disabled={!level} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WIZARD — STEP 2: PLAYERS
  // ══════════════════════════════════════════════════════════════════════════

  if (step === 2) {
    const canContinue     = filledSlots.length >= 2;
    const availableFriends = FRIENDS.filter(f => !slots.some(s => s?.id === f.id)).filter(levelFilter);
    const canAddMore      = slots.some(s => s === null);
    const freeSlots       = slots.filter(s => s === null).length;
    const friendsCanAdd   = Math.min(friendSel.size, freeSlots);

    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <WizardHeader onBack={goToDashboard} />
        <Steps current={2} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Jugadores</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>Mínimo 4, máximo 12. Slots vacíos generan QR de invitación.</p>

        {/* Slot count */}
        <div style={card}>
          <label style={lbl}>Total de jugadores (siempre en pares)</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {[4, 6, 8, 10, 12].map(n => {
              const tooFew = n < filledSlots.length;
              return (
                <button key={n} onClick={() => !tooFew && setSlotCount(n)} disabled={tooFew}
                  style={{ width: 52, height: 44, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, cursor: tooFew ? 'not-allowed' : 'pointer', border: `2px solid ${slots.length === n ? 'var(--black)' : 'var(--grey-200)'}`, background: slots.length === n ? 'var(--black)' : tooFew ? 'var(--grey-50)' : '#fff', color: slots.length === n ? '#fff' : tooFew ? 'var(--grey-300)' : 'var(--black)' }}>
                  {n}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>
            {slots.length} jugadores · {slots.length / 2} parejas
            {hasQR && ` · ${emptyCount} slot${emptyCount > 1 ? 's' : ''} vacío → QR`}
          </div>
        </div>

        {/* Slot grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {slots.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1px solid ${p ? (p.id === 'me' ? 'var(--neon)' : 'var(--grey-200)') : 'var(--grey-100)'}`, background: p?.id === 'me' ? 'rgba(214,255,0,0.06)' : p ? '#fff' : 'var(--grey-50)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', background: p?.id === 'me' ? 'var(--black)' : p ? (p.registered ? 'var(--court-blue)' : 'var(--grey-400)') : 'var(--grey-200)' }}>
                {p ? initials(p.name) : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {p
                  ? <>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                      {p.id === 'me' && <span style={{ marginLeft: 6, fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '1px 5px', fontWeight: 700 }}>TÚ</span>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.registered ? `#${p.ranking} · ${LEVEL_SHORT[p.level]}` : 'Invitado'}</div>
                  </>
                  : <div style={{ fontSize: 12, color: 'var(--grey-300)', fontStyle: 'italic' }}>Slot vacío (QR)</div>
                }
              </div>
              {p && p.id !== 'me' && <button onClick={() => removeSlot(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--grey-300)', padding: 0 }}>×</button>}
              {p?.id === 'me' && <button onClick={() => removeSlot(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--grey-300)', padding: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quitar</button>}
            </div>
          ))}
        </div>

        {/* Add player panel */}
        {canAddMore && (
          <div style={card}>
            <div style={secTitle}>Agregar jugador</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {(['friends', 'platform', 'new'] as const).map((mode) => {
                const labels = { friends: 'Mis Amistades', platform: 'Buscar jugador', new: 'Nuevo jugador' };
                return (
                  <button key={mode} onClick={() => { setSearchMode(searchMode === mode ? null : mode); setSearchQuery(''); setFriendSel(new Set()); }}
                    style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', border: `1px solid ${searchMode === mode ? 'var(--black)' : 'var(--grey-200)'}`, background: searchMode === mode ? 'var(--black)' : '#fff', color: searchMode === mode ? '#fff' : 'var(--grey-500)', cursor: 'pointer' }}>
                    {labels[mode]}
                  </button>
                );
              })}
            </div>

            {searchMode === 'friends' && (
              <div>
                {availableFriends.length === 0 && <div style={{ fontSize: 12, color: 'var(--grey-400)', padding: '8px 0' }}>No hay amistades disponibles para este nivel.</div>}
                {availableFriends.map(f => {
                  const checked = friendSel.has(f.id);
                  return (
                    <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderBottom: '1px solid var(--grey-100)', cursor: 'pointer', background: checked ? 'rgba(214,255,0,0.04)' : 'transparent' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleFriend(f.id)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--black)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{initials(f.name)}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>#{f.ranking} · {LEVEL_SHORT[f.level]}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
                {availableFriends.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                      {friendSel.size > 0 ? `${friendSel.size} seleccionado${friendSel.size > 1 ? 's' : ''}` : 'Seleccioná uno o más amigos'}
                    </span>
                    <button onClick={addSelectedFriends} disabled={friendSel.size === 0}
                      style={{ padding: '8px 18px', background: friendSel.size > 0 ? 'var(--black)' : 'var(--grey-200)', color: friendSel.size > 0 ? '#fff' : 'var(--grey-400)', border: 'none', cursor: friendSel.size > 0 ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {friendsCanAdd > 0 ? `Agregar ${friendsCanAdd} →` : 'Agregar →'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {searchMode === 'platform' && (
              <div>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por nombre…" style={inp} />
                <div style={{ border: '1px solid var(--grey-200)', borderTop: 'none' }}>
                  {(searchQuery.trim() ? searchResults.filter(levelFilter) : []).map(p => (
                    <button key={p.id} onClick={() => addToSlot(p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 12px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--grey-100)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{initials(p.name)}</div>
                        <div><div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 10, color: 'var(--grey-400)' }}>#{p.ranking}</div></div>
                      </div>
                      <span className="chip" style={{ fontSize: 9 }}>{LEVEL_SHORT[p.level]}</span>
                    </button>
                  ))}
                  {searchQuery.trim() && searchResults.filter(levelFilter).length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey-400)' }}>No se encontraron jugadores.</div>}
                </div>
              </div>
            )}

            {searchMode === 'new' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div><label style={lbl}>Nombre</label><input type="text" value={newFirst} onChange={e => setNewFirst(e.target.value)} placeholder="Nombre" style={inp} /></div>
                  <div><label style={lbl}>Apellido</label><input type="text" value={newLast} onChange={e => setNewLast(e.target.value)} placeholder="Apellido" style={inp} /></div>
                </div>
                <div style={{ marginBottom: 12 }}><label style={lbl}>Email (para invitación)</label><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@ejemplo.com" style={inp} /></div>
                <button onClick={addNewPlayer} disabled={!newFirst.trim() && !newLast.trim()}
                  style={{ padding: '9px 20px', background: (newFirst.trim() || newLast.trim()) ? 'var(--black)' : 'var(--grey-200)', color: (newFirst.trim() || newLast.trim()) ? '#fff' : 'var(--grey-400)', border: 'none', cursor: (newFirst.trim() || newLast.trim()) ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Agregar jugador
                </button>
              </div>
            )}
          </div>
        )}

        {hasQR && (
          <div style={{ padding: '11px 16px', background: 'rgba(214,255,0,0.06)', border: '1px solid rgba(214,255,0,0.3)', fontSize: 12, color: 'var(--grey-500)', marginBottom: 8 }}>
            <strong style={{ color: 'var(--black)' }}>QR automático:</strong> {emptyCount} slot{emptyCount > 1 ? 's' : ''} vacío{emptyCount > 1 ? 's' : ''} → se generará QR al crear el juego.
          </div>
        )}

        <NavBtns onBack={wizBack} onNext={() => { initTeams(); wizNext(); }} disabled={!canContinue} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WIZARD — STEP 3: PAIR TYPE (with drag & drop)
  // ══════════════════════════════════════════════════════════════════════════

  if (step === 3) {
    const assignedIds = new Set(teams.flat().filter(Boolean).map(p => p!.id));
    const unassigned  = filledSlots.filter(p => !assignedIds.has(p.id));
    const allAssigned = unassigned.length === 0 && filledSlots.length > 0;

    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <WizardHeader onBack={goToDashboard} />
        <Steps current={3} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Tipo de Pareja</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>¿Las parejas son fijas o rotan durante el juego?</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {([
            { key: 'fixed'    as PairType, title: 'Pareja Fija',           desc: 'Vos armás las parejas arrastrando los jugadores. Los equipos se mantienen todo el juego.' },
            { key: 'exchange' as PairType, title: 'Intercambio de Pareja', desc: 'El sistema rota los compañeros automáticamente en cada ronda.' },
          ]).map(({ key, title, desc }) => (
            <button key={key} onClick={() => setPairType(key)} style={{ padding: '20px', textAlign: 'left', cursor: 'pointer', border: `2px solid ${pairType === key ? 'var(--black)' : 'var(--grey-200)'}`, background: pairType === key ? 'var(--black)' : '#fff', color: pairType === key ? '#fff' : 'var(--black)', transition: 'all 0.12s' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 12, color: pairType === key ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)', lineHeight: 1.5 }}>{desc}</div>
            </button>
          ))}
        </div>

        {pairType === 'fixed' && (
          <div style={card}>
            <div style={secTitle}>Armar equipos — arrastrá los jugadores a cada pareja</div>

            {/* Team slots (drop targets) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10, marginBottom: 20 }}>
              {teams.map((team, ti) => (
                <div key={ti} style={{ border: '1px solid var(--grey-200)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>Pareja {ti + 1}</div>
                  {[0, 1].map(si => {
                    const p    = team[si];
                    const over = dragOver?.ti === ti && dragOver?.si === si;
                    return (
                      <div key={si}
                        onDragOver={e => { e.preventDefault(); setDragOver({ ti, si }); }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={e => { e.preventDefault(); setDragOver(null); assignToTeam(e.dataTransfer.getData('playerId'), ti, si); }}
                        style={{ padding: '8px 10px', marginBottom: 5, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: over ? '2px dashed #7c3aed' : '1px dashed var(--grey-200)', background: over ? 'rgba(124,58,237,0.06)' : p ? 'var(--grey-50)' : 'transparent', transition: 'all 0.1s', cursor: 'default' }}>
                        {p ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: p.id === 'me' ? 'var(--black)' : 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(p.name)}</div>
                              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--black)' }}>{p.name.split(' ')[0]}</span>
                            </div>
                            <button onClick={() => removeFromTeam(ti, si)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--grey-300)', padding: 0 }}>×</button>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, color: over ? '#7c3aed' : 'var(--grey-300)', fontStyle: 'italic' }}>
                            {over ? 'Soltar aquí' : 'Arrastrá jugador'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Unassigned players (draggable) */}
            {unassigned.length > 0 && (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>
                  Sin asignar — arrastrá a una pareja
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {unassigned.map(p => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={e => { e.dataTransfer.setData('playerId', p.id); e.dataTransfer.effectAllowed = 'move'; }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: p.id === 'me' ? 'rgba(214,255,0,0.08)' : 'var(--grey-50)', border: `1px solid ${p.id === 'me' ? 'var(--neon)' : 'var(--grey-200)'}`, fontSize: 12, cursor: 'grab', userSelect: 'none' }}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: p.id === 'me' ? 'var(--black)' : 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(p.name)}</div>
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                      {p.id === 'me' && <span style={{ fontSize: 8, background: 'var(--neon)', color: 'var(--black)', padding: '1px 4px', fontWeight: 700 }}>TÚ</span>}
                      <span style={{ fontSize: 10, color: 'var(--grey-300)' }}>⠿</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Also allow dragging assigned players */}
            {filledSlots.length > 0 && unassigned.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--grey-400)', fontStyle: 'italic' }}>
                Podés seguir arrastrando jugadores entre parejas para reorganizarlos.
              </div>
            )}

            {allAssigned && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--turf-green)', fontWeight: 600 }}>✓ Todos los jugadores asignados.</div>
            )}
          </div>
        )}

        {pairType === 'exchange' && (
          <div style={{ padding: '18px 20px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)' }}>
            <div style={{ fontSize: 13, color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 10 }}>
              {level === 'all'
                ? '🎯 Nivel mixto: se empareja el jugador con mejor ranking con el de peor ranking para equilibrar cada pareja.'
                : '🎲 Nivel homogéneo: el sistema asigna las parejas aleatoriamente en cada ronda.'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>Al finalizar cada ronda, el sistema preguntará "¿Continúa el Juego?" y armará la nueva rotación automáticamente.</div>
          </div>
        )}

        <NavBtns onBack={wizBack} onNext={wizNext} disabled={!pairType} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WIZARD — STEP 4: CONFIG
  // ══════════════════════════════════════════════════════════════════════════

  if (step === 4) {
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <WizardHeader onBack={goToDashboard} />
        <Steps current={4} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Configuración del Juego</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>¿Cómo se jugarán los sets y cómo se lleva el marcador?</p>

        {/* Sets per round */}
        <div style={card}>
          <label style={lbl}>Sets por ronda (antes de rotar equipos)</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setSetsPerRound(n)} style={{ flex: 1, padding: '18px', border: `2px solid ${setsPerRound === n ? 'var(--black)' : 'var(--grey-200)'}`, background: setsPerRound === n ? 'var(--black)' : '#fff', color: setsPerRound === n ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, color: setsPerRound === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>Set{n > 1 ? 's' : ''}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey-400)', lineHeight: 1.5 }}>
            Después de {setsPerRound} set{setsPerRound > 1 ? 's' : ''} por ronda, el sistema registra los scores y pregunta si continúa el juego.
          </div>
        </div>

        {/* Score type */}
        <div style={card}>
          <label style={lbl}>Tipo de Score</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {([
              { key: 'traditional' as ScoreType, title: 'Tradicional', desc: '0, 15, 30, 40 — conteo clásico de pádel/tenis con games y sets.' },
              { key: 'points'      as ScoreType, title: 'Por Puntos',  desc: 'Puntos simples hasta un objetivo. Estilo Americano.' },
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
                <label style={lbl}>Games por Set</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[2, 4, 6].map(n => (
                    <button key={n} onClick={() => setGamesPerSet(n)} style={{ flex: 1, padding: '14px', border: `2px solid ${gamesPerSet === n ? 'var(--black)' : 'var(--grey-200)'}`, background: gamesPerSet === n ? 'var(--black)' : '#fff', color: gamesPerSet === n ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, color: gamesPerSet === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>games</div>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--grey-400)', lineHeight: 1.5 }}>
                  Gana el set el primer equipo en llegar a {gamesPerSet} games con 2 de ventaja. En {gamesPerSet}-{gamesPerSet}: tie-break.
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Tie-break (puntos para ganar)</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[7, 10].map(n => (
                    <button key={n} onClick={() => setTiebreak(n)} style={{ flex: 1, padding: '14px', border: `2px solid ${tiebreak === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tiebreak === n ? 'var(--black)' : '#fff', color: tiebreak === n ? '#fff' : 'var(--black)', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, color: tiebreak === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>puntos</div>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--grey-400)' }}>
                  Si el set llega a {gamesPerSet}-{gamesPerSet}, se juega un tie-break a {tiebreak} puntos (con 2 de ventaja).
                </div>
              </div>

              <div>
                <label style={lbl}>Regla de Deuce / Ventaja (dentro del game)</label>
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
                {[4, 8, 12, 16, 20, 24, 28, 32].map(n => (
                  <button key={n} onClick={() => setPointTarget(n)} style={{ width: 58, height: 48, border: `2px solid ${pointTarget === n ? 'var(--black)' : 'var(--grey-200)'}`, background: pointTarget === n ? 'var(--black)' : '#fff', color: pointTarget === n ? '#fff' : 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}>
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>El primer equipo en llegar a {pointTarget} puntos gana el set.</div>
            </div>
          )}
        </div>

        <NavBtns onBack={wizBack} onNext={wizNext} nextLabel="Ver resumen →" />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WIZARD — STEP 5: SUMMARY
  // ══════════════════════════════════════════════════════════════════════════

  if (step === 5) {
    const scoreDesc = scoreType === 'traditional'
      ? `Tradicional · ${gamesPerSet} games/set · Tie-break ${tiebreak} · ${DEUCE_LABEL[deuceRule]}`
      : `Por Puntos · objetivo ${pointTarget} pts`;

    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <WizardHeader onBack={goToDashboard} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 28px' }}>Resumen del Juego</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)', marginBottom: 20 }}>
          {[
            { label: 'Fecha y hora',   value: `${date} · ${time}` },
            { label: 'Club',           value: `${selectedClub?.name}, ${city}, ${country}` },
            { label: 'Nivel',          value: level ? LEVEL_LABEL[level] : '–' },
            { label: 'Jugadores',      value: `${slots.length} total · ${filledSlots.length} confirmados · ${emptyCount} por confirmar` },
            { label: 'Tipo de pareja', value: pairType === 'fixed' ? 'Pareja Fija' : 'Intercambio de Pareja' },
            { label: 'Sets por ronda', value: `${setsPerRound} set${setsPerRound > 1 ? 's' : ''}` },
            { label: 'Score',          value: scoreDesc },
          ].map(row => (
            <div key={row.label} style={{ background: '#fff', padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ ...card, marginBottom: 20 }}>
          <div style={secTitle}>Jugadores ({filledSlots.length}/{slots.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {slots.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--grey-50)' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', background: p?.id === 'me' ? 'var(--black)' : p ? (p.registered ? 'var(--court-blue)' : 'var(--grey-400)') : 'var(--grey-200)' }}>
                  {p ? initials(p.name) : '?'}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: p ? 'var(--black)' : 'var(--grey-300)' }}>
                    {p ? p.name : 'Por confirmar (QR)'}
                    {p?.id === 'me' && <span style={{ marginLeft: 6, fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '1px 5px', fontWeight: 700 }}>TÚ</span>}
                  </div>
                  {p?.email && <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.email}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {hasQR && (
          <div style={{ background: 'var(--grey-900)', color: '#fff', padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 60, height: 60, background: 'rgba(214,255,0,0.1)', border: '1px solid rgba(214,255,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>⬛</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 4 }}>QR del Juego</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                {emptyCount} slot{emptyCount > 1 ? 's' : ''} vacío{emptyCount > 1 ? 's' : ''}. Se generará el código para que más jugadores se sumen.
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={wizBack} style={{ padding: '11px 24px', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>← Atrás</button>
          <button onClick={createGame} style={{ padding: '11px 32px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>✓ Crear Juego Rápido</button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SUCCESS
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 480, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--turf-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 28, color: '#fff', marginBottom: 20 }}>✓</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 10px' }}>¡Juego Creado!</h2>
      <p style={{ color: 'var(--grey-500)', marginBottom: 8, maxWidth: 400, fontSize: 14, lineHeight: 1.6 }}>
        {hasQR ? 'Compartí el QR para que los jugadores faltantes se unan.' : 'Todos los jugadores están confirmados. ¡A jugar!'}
      </p>
      {newGameCode && <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#7c3aed', marginBottom: 24 }}>{newGameCode}</div>}
      {hasQR && (
        <div style={{ background: 'var(--grey-900)', padding: '24px', marginBottom: 28, display: 'inline-block' }}>
          <div style={{ width: 120, height: 120, background: 'var(--grey-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--grey-400)', fontWeight: 600, letterSpacing: '0.08em' }}>QR Code</div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.12em' }}>{newGameCode}</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={goToDashboard} style={{ padding: '11px 28px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Ver en Dashboard →
        </button>
        <button onClick={() => { resetWizard(); setView('wizard'); }} style={{ padding: '11px 20px', border: '1px solid var(--grey-200)', fontSize: 11, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Nuevo Juego
        </button>
      </div>
    </div>
  );
}
