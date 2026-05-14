'use client';

import { useState, useMemo } from 'react';

// ── Mock data ─────────────────────────────────────────────────────────────────

// Only countries/cities where clubs exist
const COUNTRIES_WITH_CLUBS = ['Argentina', 'Chile', 'Uruguay', 'España'];

const CITIES_WITH_CLUBS: Record<string, string[]> = {
  Argentina: ['Buenos Aires', 'Rosario', 'Córdoba'],
  Chile:     ['Santiago'],
  Uruguay:   ['Montevideo'],
  España:    ['Madrid'],
};

type Club = { id: string; name: string; courts: number };
const CLUBS: Record<string, Club[]> = {
  'Buenos Aires': [
    { id: 'c1', name: 'Club Barrio Norte',   courts: 6  },
    { id: 'c2', name: 'Padel Arena',         courts: 10 },
    { id: 'c3', name: 'Club Deportivo Sur',  courts: 4  },
  ],
  Rosario:    [{ id: 'c4', name: 'Padel Rosario Central', courts: 5 }],
  Córdoba:    [{ id: 'c5', name: 'Club La Cantera',       courts: 8 }],
  Santiago:   [{ id: 'c6', name: 'Padel Santiago',        courts: 6 }],
  Montevideo: [{ id: 'c7', name: 'Club Carrasco',         courts: 4 }],
  Madrid:     [{ id: 'c8', name: 'World Padel Tour',      courts: 12 }],
};

type PlayerLevel = 'beginner' | 'intermediate' | 'advanced';
type Player = {
  id: string; name: string; ranking: number;
  level: PlayerLevel; registered: boolean; email?: string;
};

// The logged-in creator is pre-filled in slot 1
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
  { id: 'p7', name: 'Pedro Morales',  ranking: 8,  level: 'advanced',     registered: true },
  { id: 'p8', name: 'Isabel Bravo',   ranking: 23, level: 'advanced',     registered: true },
  { id: 'p9', name: 'Juan Castro',    ranking: 67, level: 'intermediate', registered: true },
  { id: 'p10',name: 'Elena Vidal',    ranking: 78, level: 'beginner',     registered: true },
  { id: 'p11',name: 'Raúl Ortega',    ranking: 15, level: 'advanced',     registered: true },
  { id: 'p12',name: 'Marta Fuentes',  ranking: 92, level: 'beginner',     registered: true },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type Level      = 'all' | 'beginner' | 'intermediate' | 'advanced';
type PairType   = 'fixed' | 'exchange';
type ScoreType  = 'traditional' | 'points';
type DeuceRule  = 'traditional' | 'gold' | 'silver' | 'ipf';

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

function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

// ── Main component ────────────────────────────────────────────────────────────

export default function QuickGamePage() {
  const [step, setStep] = useState(0);

  // INICIO
  const [date, setDate]       = useState('');
  const [time, setTime]       = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity]       = useState('');
  const [clubId, setClubId]   = useState('');

  // Step 1
  const [level, setLevel] = useState<Level | null>(null);

  // Step 2 — players (creator pre-filled in slot 1)
  const [slots, setSlots]              = useState<(Player | null)[]>([CREATOR, null, null, null]);
  const [searchMode, setSearchMode]    = useState<'friends' | 'platform' | 'new' | null>(null);
  const [searchQuery, setSearchQuery]  = useState('');
  const [friendSel, setFriendSel]      = useState<Set<string>>(new Set());
  const [newFirst, setNewFirst]        = useState('');
  const [newLast, setNewLast]          = useState('');
  const [newEmail, setNewEmail]        = useState('');

  // Step 3
  const [pairType, setPairType] = useState<PairType | null>(null);
  const [teams, setTeams]       = useState<(Player | null)[][]>([]);

  // Step 4
  const [setsPerRound, setSetsPerRound] = useState(1);
  const [scoreType, setScoreType]       = useState<ScoreType>('traditional');
  const [gamesPerSet, setGamesPerSet]   = useState(6);
  const [tiebreak, setTiebreak]         = useState(7);
  const [deuceRule, setDeuceRule]       = useState<DeuceRule>('gold');
  const [pointTarget, setPointTarget]   = useState(16);

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const clubs         = city ? (CLUBS[city] || []) : [];
  const selectedClub  = clubs.find(c => c.id === clubId) ?? null;
  const filledSlots   = slots.filter((s): s is Player => s !== null);
  const emptyCount    = slots.filter(s => s === null).length;
  const hasQR         = emptyCount > 0;
  const levelFilter   = (p: Player) => !level || level === 'all' || p.level === level;

  // ── Slot helpers ────────────────────────────────────────────────────────────

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
    const alreadyInSlot = slots.some(s => s?.id === id);
    if (alreadyInSlot) return;
    setFriendSel(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function removeSlot(i: number) {
    const next = [...slots];
    next[i] = null;
    setSlots(compact(next));
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

  // ── Team helpers ────────────────────────────────────────────────────────────

  function initTeams() {
    const n = slots.length / 2;
    const t: (Player | null)[][] = Array.from({ length: n }, () => [null, null]);
    filledSlots.forEach((p, i) => { const ti = Math.floor(i / 2), si = i % 2; if (ti < t.length) t[ti][si] = p; });
    setTeams(t);
  }

  function assignToTeam(player: Player, ti: number, si: number) {
    const next = teams.map(t => [...t]);
    for (let a = 0; a < next.length; a++) for (let b = 0; b < 2; b++) if (next[a][b]?.id === player.id) next[a][b] = null;
    next[ti][si] = player;
    setTeams(next);
  }

  // ── Search results ──────────────────────────────────────────────────────────

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const source = searchMode === 'friends' ? FRIENDS : ALL_PLAYERS;
    return source.filter(p => p.name.toLowerCase().includes(q)).filter(p => !slots.some(s => s?.id === p.id)).slice(0, 6);
  }, [searchQuery, searchMode, slots]);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 0 — INICIO
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 0) {
    const ok = date && time && country && city && clubId;
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Jugadores</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>CREAR JUEGO RÁPIDO</h1>
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

        <NavBtns onNext={next} nextLabel="Paso 1: Nivel →" disabled={!ok} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — LEVEL
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 1) {
    const options: { key: Level; desc: string }[] = [
      { key: 'all',          desc: 'Cualquier jugador puede participar. En Intercambio de Pareja, equipos balanceados por ranking.' },
      { key: 'beginner',     desc: 'Para quienes están empezando. Selección aleatoria en Intercambio.' },
      { key: 'intermediate', desc: 'Jugadores con experiencia. Selección aleatoria en Intercambio.' },
      { key: 'advanced',     desc: 'Alto nivel competitivo. Selección aleatoria en Intercambio.' },
    ];
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
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
        <NavBtns onBack={back} onNext={next} disabled={!level} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — PLAYERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 2) {
    const canContinue = filledSlots.length >= 2;
    const availableFriends = FRIENDS.filter(f => !slots.some(s => s?.id === f.id)).filter(levelFilter);
    const canAddMore = slots.some(s => s === null);
    const freeSlots = slots.filter(s => s === null).length;
    const friendsCanAdd = Math.min(friendSel.size, freeSlots);

    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
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
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}{p.id === 'me' && <span style={{ marginLeft: 6, fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '1px 5px', fontWeight: 700 }}>TÚ</span>}</div>
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
              {([['friends', 'Mis Amistades'], ['platform', 'Buscar jugador'], ['new', 'Nuevo jugador']] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => { setSearchMode(searchMode === mode ? null : mode); setSearchQuery(''); setFriendSel(new Set()); }}
                  style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', border: `1px solid ${searchMode === mode ? 'var(--black)' : 'var(--grey-200)'}`, background: searchMode === mode ? 'var(--black)' : '#fff', color: searchMode === mode ? '#fff' : 'var(--grey-500)', cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Friends — multi-select with checkboxes */}
            {searchMode === 'friends' && (
              <div>
                {availableFriends.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', padding: '8px 0' }}>No hay amistades disponibles para este nivel.</div>
                )}
                {availableFriends.map(f => {
                  const checked = friendSel.has(f.id);
                  return (
                    <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderBottom: '1px solid var(--grey-100)', cursor: 'pointer', background: checked ? 'rgba(214,255,0,0.04)' : 'transparent' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleFriend(f.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--black)' }} />
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
                      {friendsCanAdd > 0 ? `Agregar ${friendsCanAdd} →` : 'Agregar seleccionados →'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Platform search */}
            {searchMode === 'platform' && (
              <div>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por nombre…" style={inp} />
                <div style={{ border: '1px solid var(--grey-200)', borderTop: 'none' }}>
                  {(searchQuery.trim() ? searchResults.filter(levelFilter) : []).map(p => (
                    <button key={p.id} onClick={() => addToSlot(p)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 12px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--grey-100)', cursor: 'pointer' }}>
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

            {/* New player */}
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

        {hasQR && <div style={{ padding: '11px 16px', background: 'rgba(214,255,0,0.06)', border: '1px solid rgba(214,255,0,0.3)', fontSize: 12, color: 'var(--grey-500)', marginBottom: 8 }}><strong style={{ color: 'var(--black)' }}>QR automático:</strong> {emptyCount} slot{emptyCount > 1 ? 's' : ''} vacío{emptyCount > 1 ? 's' : ''} → se generará QR al crear el juego.</div>}

        <NavBtns onBack={back} onNext={() => { initTeams(); next(); }} disabled={!canContinue} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — PAIR TYPE
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 3) {
    const assignedIds = new Set(teams.flat().filter(Boolean).map(p => p!.id));
    const unassigned  = filledSlots.filter(p => !assignedIds.has(p.id));

    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        <Steps current={3} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Tipo de Pareja</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>¿Las parejas son fijas o rotan durante el juego?</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {([
            { key: 'fixed'    as PairType, title: 'Pareja Fija',           desc: 'Vos armás las parejas. Los equipos se mantienen todo el juego.' },
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
            <div style={secTitle}>Armar equipos — {teams.length} parejas</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
              {teams.map((team, ti) => (
                <div key={ti} style={{ border: '1px solid var(--grey-200)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>Pareja {ti + 1}</div>
                  {[0, 1].map(si => (
                    <div key={si} style={{ padding: '7px 10px', marginBottom: 5, background: team[si] ? 'var(--grey-50)' : 'var(--grey-100)', border: '1px dashed var(--grey-200)', fontSize: 12, color: team[si] ? 'var(--black)' : 'var(--grey-400)', minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{team[si] ? team[si]!.name : `Jugador ${si + 1}`}</span>
                      {team[si] && <button onClick={() => assignToTeam(team[si]!, ti, si)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--grey-300)', padding: 0 }}>×</button>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {unassigned.length > 0 && (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>Sin asignar — clic en P# para asignar a esa pareja</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {unassigned.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', fontSize: 12 }}>
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                      {teams.map((team, ti) => team.some(s => s === null) && (
                        <button key={ti} onClick={() => assignToTeam(p, ti, team[0] === null ? 0 : 1)}
                          style={{ padding: '1px 7px', fontSize: 10, fontWeight: 700, border: '1px solid var(--grey-300)', background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)' }}>
                          P{ti + 1}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
            {unassigned.length === 0 && filledSlots.length > 0 && <div style={{ fontSize: 12, color: 'var(--turf-green)', fontWeight: 600 }}>✓ Todos los jugadores asignados.</div>}
          </div>
        )}

        {pairType === 'exchange' && (
          <div style={{ padding: '18px 20px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)' }}>
            <div style={{ fontSize: 13, color: 'var(--grey-600)', lineHeight: 1.6, marginBottom: 10 }}>
              {level === 'all'
                ? '🎯 Nivel mixto: se empareja el jugador con mejor ranking con el de peor ranking para equilibrar cada pareja.'
                : '🎲 Nivel homogéneo: el sistema asigna las parejas aleatoriamente en cada ronda.'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>Al finalizar cada ronda de sets, el sistema preguntará "¿Continúa el Juego Rápido?" y armará la nueva rotación automáticamente.</div>
          </div>
        )}

        <NavBtns onBack={back} onNext={next} disabled={!pairType} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4 — GAME CONFIG
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 4) {
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
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
            Después de cada ronda de {setsPerRound} set{setsPerRound > 1 ? 's' : ''}, el sistema registra los scores y pregunta si continúa el juego.
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

          {/* TRADITIONAL options */}
          {scoreType === 'traditional' && (
            <>
              {/* Games per Set */}
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
                  Gana el set el primer equipo en llegar a {gamesPerSet} games con 2 de ventaja. Si empatan {gamesPerSet}-{gamesPerSet}, se juega un tie-break.
                </div>
              </div>

              {/* Tie-break */}
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

              {/* Deuce rule */}
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

          {/* POINTS options */}
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

        <NavBtns onBack={back} onNext={next} nextLabel="Ver resumen →" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5 — CONFIRMATION
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 5) {
    const scoreDesc = scoreType === 'traditional'
      ? `Tradicional · ${gamesPerSet} games/set · Tie-break ${tiebreak} · ${DEUCE_LABEL[deuceRule]}`
      : `Por Puntos · objetivo ${pointTarget} pts`;

    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
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
            <div style={{ width: 64, height: 64, background: 'rgba(214,255,0,0.1)', border: '1px solid rgba(214,255,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 24 }}>⬛</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 5 }}>QR del Juego</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{emptyCount} slot{emptyCount > 1 ? 's' : ''} vacío{emptyCount > 1 ? 's' : ''}. Se generará el código al crear el juego para que más jugadores se sumen.</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={back} style={{ padding: '11px 24px', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>← Atrás</button>
          <button onClick={() => setStep(99)} style={{ padding: '11px 32px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>✓ Crear Juego Rápido</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUCCESS
  // ═══════════════════════════════════════════════════════════════════════════

  function reset() {
    setStep(0); setDate(''); setTime(''); setCountry(''); setCity(''); setClubId('');
    setLevel(null); setSlots([CREATOR, null, null, null]); setSearchMode(null);
    setPairType(null); setTeams([]); setSetsPerRound(1);
    setScoreType('traditional'); setGamesPerSet(6); setTiebreak(7);
    setDeuceRule('gold'); setPointTarget(16);
  }

  const code = `JR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return (
    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 480, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--turf-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 28, color: '#fff', marginBottom: 20 }}>✓</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 10px' }}>¡Juego Creado!</h2>
      <p style={{ color: 'var(--grey-500)', marginBottom: 28, maxWidth: 400, fontSize: 14, lineHeight: 1.6 }}>
        {hasQR ? 'Compartí el QR para que los jugadores faltantes se unan.' : 'Todos los jugadores están confirmados. ¡A jugar!'}
      </p>
      {hasQR && (
        <div style={{ background: 'var(--grey-900)', padding: '24px', marginBottom: 24, display: 'inline-block' }}>
          <div style={{ width: 120, height: 120, background: 'var(--grey-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--grey-400)', fontWeight: 600 }}>QR Code</div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.12em' }}>{code}</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={reset} style={{ padding: '10px 20px', border: '1px solid var(--grey-200)', fontSize: 11, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nuevo juego</button>
        <a href="/dashboard/player" style={{ padding: '10px 24px', background: 'var(--black)', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ir al inicio</a>
      </div>
    </div>
  );
}
