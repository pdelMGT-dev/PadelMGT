'use client';

import { use, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getGame, saveGame } from '@/lib/game-store';
import type { ActiveGame, ScoreConfig } from '@/lib/game-engine';

// ── Types ─────────────────────────────────────────────────────────────────────

type Level     = 'all' | 'beginner' | 'intermediate' | 'advanced';
type PairType  = 'fixed' | 'exchange';
type ScoreType = 'traditional' | 'points';
type DeuceRule = 'traditional' | 'gold' | 'silver' | 'ipf';

// ── Mock / static data ────────────────────────────────────────────────────────

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

const CREATOR_REGISTERED_CLUBS: (Club & { city: string; country: string })[] = [
  { id: 'c1', name: 'Club Barrio Norte',  city: 'Buenos Aires', country: 'Argentina', courts: 6  },
  { id: 'c2', name: 'Padel Arena',        city: 'Buenos Aires', country: 'Argentina', courts: 10 },
  { id: 'c5', name: 'Club La Cantera',    city: 'Córdoba',      country: 'Argentina', courts: 8  },
];

// ── Label maps ────────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<Level, string> = {
  all: 'Todos los Niveles', beginner: 'Principiante',
  intermediate: 'Intermedio', advanced: 'Avanzado',
};

const LABEL_TO_LEVEL: Record<string, Level> = {
  'Todos los Niveles': 'all',
  'Principiante': 'beginner',
  'Intermedio': 'intermediate',
  'Avanzado': 'advanced',
  'Todos': 'all',
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
    <div className="bs-actions-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
      {onBack
        ? <button onClick={onBack} style={{ padding: '11px 24px', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>← Atrás</button>
        : <div />}
      <button onClick={onNext} disabled={disabled} style={{ padding: '11px 28px', background: disabled ? 'var(--grey-200)' : 'var(--black)', color: disabled ? 'var(--grey-400)' : '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {nextLabel}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EditQuickGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [game, setGame] = useState<ActiveGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const [step, setStep] = useState(1);

  // Step I — Información básica
  const [gameName, setGameName]         = useState('');
  const [date, setDate]                 = useState('');
  const [time, setTime]                 = useState('');
  const [hasLocation, setHasLocation]   = useState<boolean | null>(null);
  const [isRegisteredClub, setIsRegisteredClub] = useState<boolean | null>(null);
  const [selectedRegClub, setSelectedRegClub]   = useState<(Club & { city: string; country: string }) | null>(null);
  const [country, setCountry]           = useState('');
  const [city, setCity]                 = useState('');
  const [clubId, setClubId]             = useState('');
  const [customClub, setCustomClub]     = useState('');

  // Step II — Nivel
  const [level, setLevel] = useState<Level | null>(null);

  // Step III — Jugadores (max players only in edit)
  const [maxPlayers, setMaxPlayers] = useState(4);

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

  // Load game and pre-fill wizard state
  useEffect(() => {
    const g = getGame(id);
    if (!g) {
      setLoading(false);
      return;
    }

    // Block editing live/finished games
    if (g.status === 'live' || g.status === 'finished') {
      setBlocked(true);
      setGame(g);
      setLoading(false);
      return;
    }

    setGame(g);

    // Pre-fill Step I
    setGameName(g.name);
    setDate(g.date);
    setTime(g.time);

    // Location pre-fill logic
    if (!g.club || g.club === '–') {
      setHasLocation(false);
    } else if (g.locationName) {
      // Pista privada / custom location
      setHasLocation(true);
      setIsRegisteredClub(false);
      if (g.country) setCountry(g.country);
      if (g.city) setCity(g.city);
      setClubId('__custom__');
      setCustomClub(g.locationName);
    } else {
      // Try to match against registered clubs first
      let foundRegClub = false;
      for (const rc of CREATOR_REGISTERED_CLUBS) {
        if (rc.name === g.club) {
          setHasLocation(true);
          setIsRegisteredClub(true);
          setSelectedRegClub(rc);
          foundRegClub = true;
          break;
        }
      }
      if (!foundRegClub) {
        setHasLocation(true);
        setIsRegisteredClub(false);
        // Try to match club in CLUBS by name
        let foundClubId = '';
        let foundCity = g.city || '';
        let foundCountry = g.country || '';
        outer: for (const [cityKey, cityClubs] of Object.entries(CLUBS)) {
          for (const club of cityClubs) {
            if (club.name === g.club) {
              foundClubId = club.id;
              foundCity = cityKey;
              for (const [countryKey, cities] of Object.entries(CITIES_WITH_CLUBS)) {
                if (cities.includes(cityKey)) {
                  foundCountry = countryKey;
                  break;
                }
              }
              break outer;
            }
          }
        }
        setCountry(foundCountry);
        setCity(foundCity);
        setClubId(foundClubId || '');
      }
    }

    // Pre-fill Step II
    const lvl = LABEL_TO_LEVEL[g.levelLabel ?? ''] ?? 'all';
    setLevel(lvl);

    // Pre-fill Step III
    setMaxPlayers(g.maxPlayers);

    // Pre-fill Step IV
    setPairType(g.pairType === 'parejas' ? 'fixed' : 'exchange');

    // Pre-fill Step V
    setCourts(g.courts);
    if (g.scoreConfig.type === 'points') {
      setScoreType('points');
      setPointTarget(g.scoreConfig.target ?? 16);
    } else {
      setScoreType('traditional');
      setSetsPerMatch(g.scoreConfig.setsPerMatch ?? 1);
      setGamesPerSet(g.scoreConfig.gamesPerSet ?? 6);
      setTiebreak(g.scoreConfig.tiebreak ?? 7);
      const deuce = g.scoreConfig.deuce;
      setDeuceRule(deuce === 'ventaja' ? 'traditional' : 'gold');
    }

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Derived values ────────────────────────────────────────────────────────

  const clubs = city ? (CLUBS[city] || []) : [];
  const isCustomLoc = clubId === '__custom__';
  const selectedClub = isCustomLoc ? null : (clubs.find(c => c.id === clubId) ?? null);

  const confirmedPlayersCount = game?.players?.length ?? 0;

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

  function resolvedLocationName(): string | undefined {
    if (isCustomLoc && customClub.trim()) return customClub.trim();
    return undefined;
  }

  const step1Valid = useMemo(() => {
    if (!gameName.trim() || !date || !time) return false;
    if (date < today()) return false;
    if (hasLocation === null) return false;
    if (hasLocation === false) return true;
    if (isRegisteredClub === null) return false;
    if (isRegisteredClub === true) return selectedRegClub !== null;
    if (!country || !city || !clubId) return false;
    if (isCustomLoc && !customClub.trim()) return false;
    return true;
  }, [gameName, date, time, hasLocation, isRegisteredClub, selectedRegClub, country, city, clubId, isCustomLoc, customClub]);

  function handleSubmit() {
    if (!game) return;

    const scoreConfig: ScoreConfig = scoreType === 'points'
      ? { type: 'points', target: pointTarget }
      : { type: 'traditional', setsPerMatch, gamesPerSet, tiebreak, deuce: deuceRule === 'traditional' ? 'ventaja' : 'oro' };

    const enginePairType = pairType === 'fixed' ? 'parejas' : 'individual';

    saveGame({
      ...game,
      name: gameName.trim(),
      date,
      time,
      club: resolvedClubName(),
      city: resolvedCity(),
      country: resolvedCountry(),
      locationName: resolvedLocationName(),
      maxPlayers,
      courts,
      pairType: enginePairType,
      scoreConfig,
      levelLabel: level ? LEVEL_LABEL[level] : 'Todos los Niveles',
    });

    router.push(`/dashboard/player/quick-game/${id}`);
  }

  // ── Loading / blocked / not-found states ──────────────────────────────────

  if (loading) {
    return (
      <div className="bs-page" style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--grey-400)', textTransform: 'uppercase' }}>Cargando...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="bs-page" style={{ padding: '80px 40px', maxWidth: 640 }}>
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>Juego no encontrado</div>
          <p style={{ fontSize: 13, color: 'var(--grey-400)', margin: '0 0 20px' }}>No se encontró el juego con ID: {id}</p>
          <Link href="/dashboard/player/quick-game" style={{ padding: '10px 22px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Volver a Mis Juegos
          </Link>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="bs-page" style={{ padding: '80px 40px', maxWidth: 640 }}>
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', color: '#dc2626', marginBottom: 12 }}>
            Edición no disponible
          </div>
          <p style={{ fontSize: 13, color: 'var(--grey-500)', margin: '0 0 20px', lineHeight: 1.6 }}>
            No se pueden editar parámetros de un juego en curso o finalizado.
          </p>
          <Link href={`/dashboard/player/quick-game/${id}`} style={{ padding: '10px 22px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            ← Volver al juego
          </Link>
        </div>
      </div>
    );
  }

  // ── Shared header (defined inline as JSX, not as nested component to avoid hook issues) ──

  const editHeader = (
    <div className="bs-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid var(--grey-100)' }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 4 }}>Editar Juego</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px' }}>EDITAR JUEGO RÁPIDO</h1>
        <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>
          <span style={{ fontWeight: 600 }}>{game.name}</span>
          <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#7c3aed', background: 'rgba(124,58,237,0.08)', padding: '2px 7px' }}>{game.code}</span>
        </div>
      </div>
      <Link
        href={`/dashboard/player/quick-game/${id}`}
        style={{ padding: '9px 18px', border: '1px solid var(--grey-200)', fontSize: 11, fontWeight: 600, background: 'transparent', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block' }}
      >
        ← Volver sin guardar
      </Link>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP I: Información básica
  // ══════════════════════════════════════════════════════════════════════════

  if (step === 1) {
    return (
      <div className="bs-page" style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        {editHeader}
        <Steps current={1} />
        <h2 className="bs-h2" style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 24px' }}>Información Básica</h2>

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
          <div className="bs-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                    <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 10 }}>No tenés clubes registrados.</div>
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

  // ══════════════════════════════════════════════════════════════════════════
  // STEP II: Nivel
  // ══════════════════════════════════════════════════════════════════════════

  if (step === 2) {
    const options: { key: Level; desc: string }[] = [
      { key: 'all',          desc: 'Cualquier jugador puede participar. En Intercambio, equipos balanceados por ranking.' },
      { key: 'beginner',     desc: 'Para quienes están empezando. Selección aleatoria en Intercambio.' },
      { key: 'intermediate', desc: 'Jugadores con experiencia. Selección aleatoria en Intercambio.' },
      { key: 'advanced',     desc: 'Alto nivel competitivo. Selección aleatoria en Intercambio.' },
    ];
    return (
      <div className="bs-page" style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        {editHeader}
        <Steps current={2} />
        <h2 className="bs-h2" style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Nivel de Juego</h2>
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

  // ══════════════════════════════════════════════════════════════════════════
  // STEP III: Jugadores (max count only — no invite in edit mode)
  // ══════════════════════════════════════════════════════════════════════════

  if (step === 3) {
    return (
      <div className="bs-page" style={{ padding: '40px 40px 80px', maxWidth: 680 }}>
        {editHeader}
        <Steps current={3} />
        <h2 className="bs-h2" style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Jugadores</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>Ajustá la cantidad máxima de jugadores.</p>

        {/* Confirmed players info */}
        {confirmedPlayersCount > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(26,78,216,0.1)', border: '1px solid rgba(111,163,255,0.35)', fontSize: 12, color: 'var(--grey-500)', lineHeight: 1.6 }}>
            <strong>{confirmedPlayersCount}</strong> jugador{confirmedPlayersCount !== 1 ? 'es' : ''} ya confirmado{confirmedPlayersCount !== 1 ? 's' : ''}. No podés reducir el máximo por debajo de este número.
          </div>
        )}

        {/* Max players selector */}
        <div style={card}>
          <div style={secTitle}>Cantidad máxima de jugadores</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[4, 6, 8, 10, 12].map(n => {
              const tooFew = n < confirmedPlayersCount;
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

        <NavBtns onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="Paso 4: Pareja →" />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP IV: Tipo de pareja
  // ══════════════════════════════════════════════════════════════════════════

  if (step === 4) {
    return (
      <div className="bs-page" style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        {editHeader}
        <Steps current={4} />
        <h2 className="bs-h2" style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Tipo de Pareja</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>¿Las parejas son fijas o rotan durante el juego?</p>

        <div className="bs-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
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

  // ══════════════════════════════════════════════════════════════════════════
  // STEP V: Configuración
  // ══════════════════════════════════════════════════════════════════════════

  if (step === 5) {
    return (
      <div className="bs-page" style={{ padding: '40px 40px 80px', maxWidth: 640 }}>
        {editHeader}
        <Steps current={5} />
        <h2 className="bs-h2" style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Configuración del Juego</h2>
        <p style={{ color: 'var(--grey-400)', fontSize: 13, margin: '0 0 24px' }}>Definí las canchas disponibles y el sistema de puntaje.</p>

        {/* Courts */}
        <div style={card}>
          <div style={secTitle}>Canchas disponibles</div>
          <label style={lbl}>¿Cuántas canchas disponibles?</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
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
          <div className="bs-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
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
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${deuceRule === rule ? 'var(--court-blue)' : 'var(--grey-300)'}`, background: deuceRule === rule ? 'var(--bs-light)' : 'transparent', flexShrink: 0, marginTop: 2 }} />
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
        <div className="bs-actions-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
          <button onClick={() => setStep(4)} style={{ padding: '11px 24px', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>← Atrás</button>
          <button
            onClick={handleSubmit}
            style={{ padding: '13px 36px', background: 'var(--black)', color: 'var(--bs-light)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            GUARDAR CAMBIOS
          </button>
        </div>
      </div>
    );
  }

  return null;
}
