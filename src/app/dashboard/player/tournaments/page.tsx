'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type FormatKey = 'americano' | 'mexicano' | 'round_robin' | 'team_league' | 'knockout' | 'world_cup';
type Modalidad = 'individual' | 'parejas';

// ── Data ─────────────────────────────────────────────────────────────────────

const TOURNAMENT_DETAIL_ID = 'da05effb-cada-4351-8946-b27ecf0c4961';

const MY_CLUBS = [
  { id: 'c1', name: 'Club Barrio Norte', city: 'Buenos Aires', courts: 6  },
  { id: 'c2', name: 'Padel Arena',       city: 'Buenos Aires', courts: 10 },
  { id: 'c3', name: 'Club La Cantera',   city: 'Córdoba',      courts: 8  },
];

const FORMAT_INFO: Record<FormatKey, { label: string; icon: string; desc: string; hasVariants: boolean; scoreType: 'points' | 'sets' }> = {
  americano:    { label: 'Americano',   icon: '🔄', desc: 'Rotación de parejas, puntos acumulados individuales.',       hasVariants: true,  scoreType: 'points' },
  mexicano:     { label: 'Mexicano',    icon: '⚡', desc: 'Rotación dinámica según posición en el ranking del torneo.', hasVariants: true,  scoreType: 'points' },
  round_robin:  { label: 'Round Robin', icon: '🔁', desc: 'Todos contra todos en un mismo grupo.',                      hasVariants: false, scoreType: 'sets'   },
  team_league:  { label: 'Team League', icon: '🏆', desc: 'Liga por equipos con jornadas semanales.',                   hasVariants: false, scoreType: 'sets'   },
  knockout:     { label: 'Knockout',    icon: '⚔️', desc: 'Eliminación directa, un perdedor queda afuera.',             hasVariants: false, scoreType: 'sets'   },
  world_cup:    { label: 'World Cup',   icon: '🌍', desc: 'Fase de grupos seguida de eliminatorias directas.',          hasVariants: false, scoreType: 'sets'   },
};

const FRIENDS = [
  { id: 'f1', name: 'Ana Rodríguez',   ranking: 34 },
  { id: 'f2', name: 'Carlos Vega',     ranking: 38 },
  { id: 'f3', name: 'Marcos Herrera',  ranking: 61 },
  { id: 'f4', name: 'Sofía López',     ranking: 29 },
  { id: 'f5', name: 'Lucía Torres',    ranking: 74 },
  { id: 'f6', name: 'Diego Fernández', ranking: 45 },
];
type Friend = typeof FRIENDS[0];

const initialTournaments = [
  { name: 'Americano Barrio Norte', format: 'Americano',   date: '11 May 2026', club: 'Club Barrio Norte', city: 'Buenos Aires', partner: 'Ana R.',    pos: 2,    total: 8,  pts: 120, status: 'completed', href: `/tournaments/detail/${TOURNAMENT_DETAIL_ID}` },
  { name: 'Liga Premier LATAM – J8', format: 'Round Robin', date: '08 May 2026', club: 'Sede Central',     city: 'Buenos Aires', partner: 'Ana R.',    pos: 3,    total: 12, pts: 90,  status: 'completed', href: `/tournaments/detail/${TOURNAMENT_DETAIL_ID}` },
  { name: 'Open Knockout Mayo',      format: 'Knockout',    date: '04 May 2026', club: 'Padel Arena',      city: 'Rosario',      partner: 'Marcos H.', pos: 1,    total: 16, pts: 200, status: 'completed', href: `/tournaments/detail/${TOURNAMENT_DETAIL_ID}` },
  { name: 'Mexicano del Club',       format: 'Mexicano',    date: '17 May 2026', club: 'Club La Cantera',  city: 'Córdoba',      partner: '–',         pos: null, total: 8,  pts: null, status: 'upcoming',  href: '/tournaments' },
  { name: 'Swiss Open Santiago',     format: 'Swiss',       date: '25 May 2026', club: 'Padel Santiago',   city: 'Santiago',     partner: '–',         pos: null, total: 32, pts: null, status: 'upcoming',  href: '/tournaments' },
  { name: 'Copa Federación',         format: 'Knockout',    date: '28 May 2026', club: 'Arena Nacional',   city: 'Buenos Aires', partner: '–',         pos: null, total: 64, pts: null, status: 'upcoming',  href: '/tournaments' },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  padding: '7px 32px 7px 12px', fontSize: 12, fontWeight: 600,
  border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', color: 'var(--black)',
};

const card: React.CSSProperties  = { background: '#fff', border: '1px solid var(--grey-200)', padding: '24px', marginBottom: 16 };
const secTitle: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'var(--grey-400)', marginBottom: 16 };
const lbl: React.CSSProperties   = { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--grey-500)', marginBottom: 8 };
const inp: React.CSSProperties   = { display: 'block', width: '100%', border: '1px solid var(--grey-200)', padding: '10px 14px', fontSize: 14, background: '#fff', outline: 'none', boxSizing: 'border-box' as const };
const sel: React.CSSProperties   = { display: 'block', width: '100%', border: '1px solid var(--grey-200)', padding: '10px 40px 10px 14px', fontSize: 14, background: '#fff', cursor: 'pointer', appearance: 'none' as const, outline: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' };

function Steps({ current }: { current: number }) {
  const steps = ['Info básica', 'Formato y config', 'Jugadores'];
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 32, background: 'var(--grey-100)', padding: '12px 0' }}>
      {steps.map((s, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
            {i > 0 && <div style={{ position: 'absolute', left: 0, top: 16, width: '50%', height: 2, background: done || active ? 'var(--black)' : 'var(--grey-300)' }} />}
            {i < steps.length - 1 && <div style={{ position: 'absolute', right: 0, top: 16, width: '50%', height: 2, background: done ? 'var(--black)' : 'var(--grey-300)' }} />}
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: done ? 'var(--turf-green)' : active ? 'var(--black)' : 'var(--grey-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#fff', zIndex: 1 }}>
              {done ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: active ? 'var(--black)' : done ? 'var(--turf-green)' : 'var(--grey-400)' }}>{s}</div>
          </div>
        );
      })}
    </div>
  );
}

function NavBtns({ onNext, onBack, nextLabel, disabled, nextVariant }: { onNext: () => void; onBack?: () => void; nextLabel?: string; disabled?: boolean; nextVariant?: 'primary' | 'create' }) {
  const variant = nextVariant ?? 'primary';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
      {onBack ? (
        <button onClick={onBack} style={{ padding: '12px 24px', background: 'none', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grey-500)' }}>← Atrás</button>
      ) : <div />}
      <button onClick={onNext} disabled={disabled} style={{ padding: '12px 28px', background: disabled ? 'var(--grey-200)' : variant === 'create' ? 'var(--neon)' : 'var(--black)', border: 'none', cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: disabled ? 'var(--grey-400)' : variant === 'create' ? 'var(--black)' : '#fff' }}>
        {nextLabel ?? 'Siguiente →'}
      </button>
    </div>
  );
}

function ToggleBtn({ value, options, onChange }: { value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 1, background: 'var(--grey-200)' }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{ padding: '8px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', cursor: 'pointer', background: value === o.v ? 'var(--black)' : '#fff', color: value === o.v ? '#fff' : 'var(--grey-500)' }}>{o.label}</button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function PlayerTournamentsPage() {
  // Dashboard filters
  const [estado,  setEstado]  = useState('Todos');
  const [formato, setFormato] = useState('Todos los formatos');
  const [ciudad,  setCiudad]  = useState('Todas las ciudades');

  // Tournament list (can grow when user creates)
  const [tournaments, setTournaments] = useState(initialTournaments);

  // View mode
  const [view, setView] = useState<'dashboard' | 'wizard'>('dashboard');

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [newTCode, setNewTCode] = useState('');

  // Step 0
  const [tName,  setTName]  = useState('');
  const [tDate,  setTDate]  = useState('');
  const [tTime,  setTTime]  = useState('');
  const [tClubId, setTClubId] = useState('');

  // Step 1
  const [tFormat,    setTFormat]    = useState<FormatKey | null>(null);
  const [tModalidad, setTModalidad] = useState<Modalidad>('individual');
  const [tMixto,     setTMixto]     = useState(false);
  const [tPlayers,   setTPlayers]   = useState(8);
  const [tCourts,    setTCourts]    = useState(2);
  const [tPtTarget,  setTPtTarget]  = useState(16);
  const [tSets,      setTSets]      = useState(1);
  const [tGames,     setTGames]     = useState(6);
  const [tTiebreak,  setTTiebreak]  = useState(7);
  const [tDeuce,     setTDeuce]     = useState<'ventaja' | 'oro'>('oro');

  // Step 2
  const [slots,       setSlots]       = useState<(Friend | null)[]>([null, null, null, null]);
  const [searchMode,  setSearchMode]  = useState<'friends' | 'platform' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendSel,   setFriendSel]   = useState<Set<string>>(new Set());

  // ── Wizard helpers ────────────────────────────────────────────────────────

  const selectedClub = MY_CLUBS.find(c => c.id === tClubId) ?? null;
  const fmtInfo      = tFormat ? FORMAT_INFO[tFormat] : null;
  const filledSlots  = slots.filter((s): s is Friend => s !== null);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return FRIENDS.filter(f => f.name.toLowerCase().includes(q) && !slots.some(s => s?.id === f.id)).slice(0, 5);
  }, [searchQuery, slots]);

  function compact(arr: (Friend | null)[]) { return [...arr.filter(Boolean), ...arr.filter(s => !s)]; }

  function addToSlot(f: Friend) {
    if (slots.some(s => s?.id === f.id)) return;
    const next = [...slots];
    const idx = next.indexOf(null);
    if (idx !== -1) { next[idx] = f; setSlots(compact(next)); }
    setSearchQuery(''); setSearchMode(null);
  }

  function addSelectedFriends() {
    const toAdd = FRIENDS.filter(f => friendSel.has(f.id) && !slots.some(s => s?.id === f.id));
    const next = [...slots];
    for (const f of toAdd) { const idx = next.indexOf(null); if (idx === -1) break; next[idx] = f; }
    setSlots(compact(next)); setFriendSel(new Set()); setSearchMode(null);
  }

  function toggleFriend(id: string) {
    setFriendSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function removeSlot(i: number) { const n = [...slots]; n[i] = null; setSlots(compact(n)); }

  function setSlotCount(n: number) {
    const filled = slots.filter(Boolean);
    if (n < filled.length) return;
    const res: (Friend | null)[] = [...filled];
    while (res.length < n) res.push(null);
    setSlots(res.slice(0, n));
  }

  function createTournament() {
    const code = `T-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setNewTCode(code);
    const fmtLabel = tFormat ? FORMAT_INFO[tFormat].label + (FORMAT_INFO[tFormat].hasVariants ? ` ${tModalidad === 'parejas' ? 'Parejas' : 'Individual'}${tMixto ? ' Mixto' : ''}` : '') : '–';
    setTournaments(prev => [{
      name: tName || `Torneo ${fmtLabel}`,
      format: fmtLabel,
      date: tDate ? new Date(tDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '–',
      club: selectedClub?.name || '–',
      city: selectedClub?.city || '–',
      partner: '–',
      pos: null,
      total: tPlayers,
      pts: null,
      status: 'upcoming',
      href: '/tournaments',
    }, ...prev]);
    setStep(99);
  }

  function resetWizard() {
    setStep(0); setTName(''); setTDate(''); setTTime(''); setTClubId('');
    setTFormat(null); setTModalidad('individual'); setTMixto(false);
    setTPlayers(8); setTCourts(2); setTPtTarget(16); setTSets(1); setTGames(6); setTTiebreak(7); setTDeuce('oro');
    setSlots([null, null, null, null]); setSearchMode(null); setSearchQuery(''); setFriendSel(new Set());
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WIZARD RENDER
  // ══════════════════════════════════════════════════════════════════════════

  if (view === 'wizard') {

    // ── STEP 0: INFO BÁSICA ────────────────────────────────────────────────
    if (step === 0) {
      const ok = tDate && tTime && tClubId;
      return (
        <div style={{ padding: '40px 40px 80px', maxWidth: 660 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <button onClick={() => { resetWizard(); setView('dashboard'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--grey-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0 }}>← Mis Torneos</button>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: 8 }}>CREAR TORNEO</div>
          <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 32 }}>Completá los datos básicos del torneo.</div>

          <Steps current={0} />

          <div style={card}>
            <div style={secTitle}>Nombre del torneo</div>
            <label style={lbl}>Nombre</label>
            <input type="text" value={tName} onChange={e => setTName(e.target.value)} placeholder="Ej: Americano de Primavera, Copa Club…" style={inp} />
          </div>

          <div style={card}>
            <div style={secTitle}>Fecha y hora</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={lbl}>Fecha</label><input type="date" value={tDate} onChange={e => setTDate(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Hora de inicio</label><input type="time" value={tTime} onChange={e => setTTime(e.target.value)} style={inp} /></div>
            </div>
          </div>

          <div style={card}>
            <div style={secTitle}>Club / Sede</div>
            <label style={lbl}>Seleccioná tu club</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MY_CLUBS.map(c => (
                <button key={c.id} onClick={() => setTClubId(c.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', border: `2px solid ${tClubId === c.id ? 'var(--black)' : 'var(--grey-200)'}`, background: tClubId === c.id ? 'var(--black)' : '#fff', cursor: 'pointer' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', color: tClubId === c.id ? '#fff' : 'var(--black)' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: tClubId === c.id ? 'rgba(255,255,255,0.5)' : 'var(--grey-400)', marginTop: 2 }}>{c.city} · {c.courts} canchas</div>
                  </div>
                  {tClubId === c.id && <span style={{ color: 'var(--neon)', fontSize: 18, fontWeight: 700 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          <NavBtns onNext={() => setStep(1)} nextLabel="Paso 2: Formato →" disabled={!ok} />
        </div>
      );
    }

    // ── STEP 1: FORMATO + CONFIG ───────────────────────────────────────────
    if (step === 1) {
      const ok = !!tFormat;
      const fmt = tFormat ? FORMAT_INFO[tFormat] : null;
      return (
        <div style={{ padding: '40px 40px 80px', maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <button onClick={() => { resetWizard(); setView('dashboard'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--grey-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0 }}>← Mis Torneos</button>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: 8 }}>CREAR TORNEO</div>
          <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 32 }}>Elegí el formato y configurá los parámetros del torneo.</div>

          <Steps current={1} />

          {/* Format cards */}
          <div style={card}>
            <div style={secTitle}>Formato del torneo</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(Object.keys(FORMAT_INFO) as FormatKey[]).map(fk => {
                const f    = FORMAT_INFO[fk];
                const active = tFormat === fk;
                return (
                  <button key={fk} onClick={() => setTFormat(fk)} style={{ padding: '16px', border: `2px solid ${active ? 'var(--black)' : 'var(--grey-200)'}`, background: active ? 'var(--black)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', color: active ? '#fff' : 'var(--black)', marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)', lineHeight: 1.4 }}>{f.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Sub-options for Americano / Mexicano */}
            {fmt?.hasVariants && (
              <div style={{ marginTop: 20, padding: '16px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 14 }}>Variantes</div>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <div style={lbl}>Modalidad</div>
                    <ToggleBtn value={tModalidad} options={[{ v: 'individual', label: 'Individual' }, { v: 'parejas', label: 'Parejas' }]} onChange={v => setTModalidad(v as Modalidad)} />
                  </div>
                  <div>
                    <div style={lbl}>Mixto</div>
                    <ToggleBtn value={tMixto ? 'si' : 'no'} options={[{ v: 'no', label: 'No' }, { v: 'si', label: 'Sí' }]} onChange={v => setTMixto(v === 'si')} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Config section — appears after format is selected */}
          {tFormat && (
            <div style={card}>
              <div style={secTitle}>Configuración</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Nº de participantes</label>
                  <input type="number" min={4} max={128} step={2} value={tPlayers} onChange={e => setTPlayers(Number(e.target.value))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Canchas disponibles</label>
                  <input type="number" min={1} max={20} value={tCourts} onChange={e => setTCourts(Number(e.target.value))} style={inp} />
                </div>
              </div>

              {/* Points-based config (Americano / Mexicano) */}
              {fmt?.scoreType === 'points' && (
                <div>
                  <label style={lbl}>Puntos por juego (objetivo)</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[8, 12, 16, 24, 32].map(n => (
                      <button key={n} onClick={() => setTPtTarget(n)} style={{ padding: '8px 18px', border: `2px solid ${tPtTarget === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tPtTarget === n ? 'var(--black)' : '#fff', color: tPtTarget === n ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>{n}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sets-based config */}
              {fmt?.scoreType === 'sets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <div style={lbl}>Sets por partido</div>
                      <ToggleBtn value={String(tSets)} options={[{ v: '1', label: '1' }, { v: '3', label: '3' }, { v: '5', label: '5' }]} onChange={v => setTSets(Number(v))} />
                    </div>
                    <div>
                      <div style={lbl}>Games por set</div>
                      <ToggleBtn value={String(tGames)} options={[{ v: '4', label: '4' }, { v: '6', label: '6' }]} onChange={v => setTGames(Number(v))} />
                    </div>
                    <div>
                      <div style={lbl}>Tiebreak a</div>
                      <ToggleBtn value={String(tTiebreak)} options={[{ v: '7', label: '7' }, { v: '10', label: '10' }]} onChange={v => setTTiebreak(Number(v))} />
                    </div>
                  </div>
                  <div>
                    <div style={lbl}>Regla de Deuce</div>
                    <ToggleBtn value={tDeuce} options={[{ v: 'ventaja', label: 'Ventaja' }, { v: 'oro', label: 'Punto de Oro' }]} onChange={v => setTDeuce(v as 'ventaja' | 'oro')} />
                  </div>
                </div>
              )}
            </div>
          )}

          <NavBtns onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="Paso 3: Jugadores →" disabled={!ok} />
        </div>
      );
    }

    // ── STEP 2: INVITE PLAYERS ─────────────────────────────────────────────
    if (step === 2) {
      const emptyCount = slots.filter(s => !s).length;
      return (
        <div style={{ padding: '40px 40px 80px', maxWidth: 660 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <button onClick={() => { resetWizard(); setView('dashboard'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--grey-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0 }}>← Mis Torneos</button>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: 8 }}>CREAR TORNEO</div>
          <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 32 }}>Invitá jugadores o dejá slots abiertos para compartir el código.</div>

          <Steps current={2} />

          {/* Slot count */}
          <div style={card}>
            <div style={secTitle}>Capacidad</div>
            <label style={lbl}>Cupos totales</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[4, 6, 8, 10, 12, 16, 24, 32].map(n => (
                <button key={n} onClick={() => setSlotCount(n)} style={{ padding: '7px 14px', border: `2px solid ${slots.length === n ? 'var(--black)' : 'var(--grey-200)'}`, background: slots.length === n ? 'var(--black)' : '#fff', color: slots.length === n ? '#fff' : 'var(--black)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>{n}</button>
              ))}
            </div>
          </div>

          {/* Player slots */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={secTitle}>Jugadores ({filledSlots.length}/{slots.length})</div>
              {emptyCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7c3aed', background: 'rgba(124,58,237,0.08)', padding: '3px 10px' }}>
                  {emptyCount} slot{emptyCount > 1 ? 's' : ''} vacío{emptyCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {slots.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `1px solid ${s ? 'var(--grey-200)' : 'var(--grey-100)'}`, background: s ? '#fff' : 'var(--grey-50)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: s ? 'var(--court-blue)' : 'var(--grey-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {s ? s.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) : '?'}
                  </div>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    {s ? <><span style={{ fontWeight: 600 }}>{s.name}</span><span style={{ fontSize: 11, color: 'var(--grey-400)', marginLeft: 8 }}>#{s.ranking}</span></> : <span style={{ color: 'var(--grey-400)' }}>Slot vacío — compartir código</span>}
                  </div>
                  {s && <button onClick={() => removeSlot(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-400)', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}>×</button>}
                </div>
              ))}
            </div>

            {/* Add player triggers */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setSearchMode(searchMode === 'friends' ? null : 'friends')} className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>
                👥 Mis Amistades
              </button>
              <button onClick={() => setSearchMode(searchMode === 'platform' ? null : 'platform')} className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>
                🔍 Buscar jugador
              </button>
            </div>

            {/* Friends panel */}
            {searchMode === 'friends' && (
              <div style={{ marginTop: 14, padding: '16px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>Mis Amistades</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {FRIENDS.filter(f => !slots.some(s => s?.id === f.id)).map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', border: `1px solid ${friendSel.has(f.id) ? 'var(--black)' : 'var(--grey-200)'}`, cursor: 'pointer' }} onClick={() => toggleFriend(f.id)}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--court-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                        {f.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{f.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>#{f.ranking}</span>
                      {friendSel.has(f.id) && <span style={{ color: 'var(--turf-green)', fontWeight: 700, fontSize: 14 }}>✓</span>}
                    </div>
                  ))}
                </div>
                {friendSel.size > 0 && (
                  <button onClick={addSelectedFriends} style={{ marginTop: 12, width: '100%', padding: '10px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Agregar {friendSel.size} jugador{friendSel.size > 1 ? 'es' : ''} →
                  </button>
                )}
              </div>
            )}

            {/* Search platform panel */}
            {searchMode === 'platform' && (
              <div style={{ marginTop: 14, padding: '16px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)' }}>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Nombre del jugador…" style={{ ...inp, marginBottom: 10 }} autoFocus />
                {searchResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {searchResults.map(f => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', border: '1px solid var(--grey-200)' }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{f.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>#{f.ranking}</span>
                        <button onClick={() => addToSlot(f)} style={{ padding: '4px 12px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Agregar</button>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.trim() && searchResults.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', padding: '8px 0' }}>Sin resultados para "{searchQuery}".</div>
                )}
              </div>
            )}
          </div>

          <NavBtns onBack={() => setStep(1)} onNext={createTournament} nextLabel="Crear Torneo" nextVariant="create" />
        </div>
      );
    }

    // ── STEP 99: SUCCESS ───────────────────────────────────────────────────
    if (step === 99) {
      const fmtInfo2 = tFormat ? FORMAT_INFO[tFormat] : null;
      const fmtLabel = fmtInfo2 ? fmtInfo2.label + (fmtInfo2.hasVariants ? ` ${tModalidad === 'parejas' ? 'Parejas' : 'Individual'}${tMixto ? ' Mixto' : ''}` : '') : '–';
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
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Compartí este código con los jugadores para que se inscriban</div>
          </div>

          <div style={{ border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 24 }}>
            {[
              { label: 'Torneo',   value: tName || `Torneo ${fmtLabel}` },
              { label: 'Formato',  value: fmtLabel },
              { label: 'Fecha',    value: tDate || '–' },
              { label: 'Hora',     value: tTime || '–' },
              { label: 'Club',     value: selectedClub?.name ?? '–' },
              { label: 'Cupos',    value: `${tPlayers} jugadores` },
              { label: 'Canchas',  value: String(tCourts) },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--grey-100)' }}>
                <span style={{ fontSize: 11, color: 'var(--grey-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => { resetWizard(); setView('dashboard'); }} className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>
              Ver Mis Torneos
            </button>
            <button onClick={() => { resetWizard(); setStep(0); }} className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>
              Crear otro torneo
            </button>
          </div>
        </div>
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  const filtered = tournaments.filter((t) => {
    const estadoOk  = estado  === 'Todos'              || (estado  === 'Próximos' ? t.status === 'upcoming' : t.status === 'completed');
    const formatoOk = formato === 'Todos los formatos' || t.format === formato;
    const ciudadOk  = ciudad  === 'Todas las ciudades' || t.city   === ciudad;
    return estadoOk && formatoOk && ciudadOk;
  });
  const hasFilters = estado !== 'Todos' || formato !== 'Todos los formatos' || ciudad !== 'Todas las ciudades';

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Mi historial</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>MIS TORNEOS</h1>
        </div>
        <button
          onClick={() => { resetWizard(); setView('wizard'); }}
          style={{ padding: '13px 28px', background: 'var(--black)', color: 'var(--neon)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}
        >
          + Crear Torneo
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Jugados',         value: '24' },
          { label: 'Victorias',       value: '16' },
          { label: 'Puntos totales',  value: '1,840' },
          { label: 'Mejor posición',  value: '#1' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Dropdown filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={estado} onChange={e => setEstado(e.target.value)} style={selectStyle}>
          <option>Todos</option>
          <option>Próximos</option>
          <option>Finalizados</option>
        </select>
        <select value={formato} onChange={e => setFormato(e.target.value)} style={selectStyle}>
          <option>Todos los formatos</option>
          <option>Americano</option>
          <option>Mexicano</option>
          <option>Round Robin</option>
          <option>Knockout</option>
          <option>Swiss</option>
        </select>
        <select value={ciudad} onChange={e => setCiudad(e.target.value)} style={selectStyle}>
          <option>Todas las ciudades</option>
          <option>Buenos Aires</option>
          <option>Rosario</option>
          <option>Córdoba</option>
          <option>Santiago</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setEstado('Todos'); setFormato('Todos los formatos'); setCiudad('Todas las ciudades'); }}
            style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, border: '1px solid var(--grey-200)', background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Limpiar ×
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--grey-200)' }}>
        <table className="rank-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>Torneo</th>
              <th>Formato</th>
              <th>Fecha</th>
              <th>Club</th>
              <th>Pareja</th>
              <th style={{ textAlign: 'center' }}>Posición</th>
              <th style={{ textAlign: 'center' }}>Puntos</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => { window.location.href = t.href; }}>
                <td style={{ paddingLeft: 24, fontWeight: 600, fontSize: 14 }}>{t.name}</td>
                <td><span className="chip" style={{ fontSize: 10 }}>{t.format}</span></td>
                <td style={{ fontSize: 12, color: 'var(--grey-500)' }}>{t.date}</td>
                <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{t.club}, {t.city}</td>
                <td style={{ fontSize: 13 }}>{t.partner}</td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: t.pos === 1 ? '#f5a623' : 'var(--black)' }}>
                  {t.pos ? `#${t.pos}` : '–'}
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: t.pts ? 'var(--turf-green)' : 'var(--grey-300)' }}>
                  {t.pts ?? '–'}
                </td>
                <td>
                  {t.status === 'completed'
                    ? <span className="badge" style={{ background: 'var(--grey-100)', color: 'var(--grey-500)' }}>Finalizado</span>
                    : <span className="badge badge-soon">Próximo</span>
                  }
                </td>
                <td>
                  <Link href={t.href} className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }} onClick={e => e.stopPropagation()}>Ver →</Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--grey-400)', fontSize: 13 }}>
                  No hay torneos con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link href="/tournaments" className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Buscar más torneos →</Link>
      </div>
    </div>
  );
}
