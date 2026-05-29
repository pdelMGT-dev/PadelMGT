'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getAllGames } from '@/lib/game-store';
import type { ActiveGame } from '@/lib/game-engine';
import { updatePlayer } from '@/lib/player-store';
import { getRankingHistoryForGame } from '@/lib/ranking-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'perfil' | 'historial' | 'config';

type UserProfile = {
  id: string; name: string; email: string; role: string;
  level?: string; points?: number; clubName?: string;
  phone?: string; description?: string; nationality?: string;
  sex?: 'masculino' | 'femenino'; birthDate?: string;
  avatarBase64?: string;
};

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

const COUNTRIES: string[] = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
  'Ecuador', 'El Salvador', 'España', 'Guatemala', 'Honduras', 'México',
  'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Portugal', 'Puerto Rico',
  'República Dominicana', 'Uruguay', 'Venezuela', 'Alemania', 'Australia',
  'Bélgica', 'Canadá', 'China', 'Dinamarca', 'Estados Unidos', 'Francia',
  'Grecia', 'Holanda', 'India', 'Italia', 'Japón', 'Noruega', 'Polonia',
  'Reino Unido', 'Rusia', 'Sudáfrica', 'Suecia', 'Suiza', 'Turquía',
  'Ucrania', 'Otro',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAge(birthDate: string): number {
  const b = new Date(birthDate); const n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  if (n.getMonth() - b.getMonth() < 0 || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
  return age;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const inp: React.CSSProperties = {
  display: 'block', width: '100%', border: '1px solid var(--grey-200)',
  padding: '10px 14px', fontSize: 14, background: '#fff', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'var(--font-body)',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 6,
};
const sel: React.CSSProperties = { ...inp, appearance: 'none' as const, cursor: 'pointer' };

// ---------------------------------------------------------------------------
// Format label helper
// ---------------------------------------------------------------------------

function formatLabel(fmt: string): string {
  if (fmt === 'americano' || fmt === 'mexicano') return 'Juego Rápido';
  const map: Record<string, string> = {
    round_robin: 'Round Robin',
    team_league: 'Liga',
    knockout: 'Knockout',
    world_cup: 'World Cup',
  };
  return map[fmt] ?? fmt;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<Tab>('perfil');
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [finishedGames, setFinishedGames] = useState<ActiveGame[]>([]);

  // Settings form state
  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fNat, setFNat] = useState('');
  const [fSex, setFSex] = useState<'masculino' | 'femenino' | ''>('');
  const [fBirth, setFBirth] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Load user from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (raw) {
        const u: UserProfile = JSON.parse(raw);
        setUser(u);
      }
    } catch {}
  }, []);

  // Load games and init form whenever user changes
  useEffect(() => {
    if (!user) return;
    const all = getAllGames();
    const mine = all.filter(g => g.players.some(p => p.id === user.id));
    setActiveGames(mine.filter(g => g.status !== 'finished'));
    setFinishedGames(mine.filter(g => g.status === 'finished'));
    // init form
    setFName(user.name || '');
    setFEmail(user.email || '');
    setFPhone(user.phone || '');
    setFDesc(user.description || '');
    setFNat(user.nationality || '');
    setFSex(user.sex || '');
    setFBirth(user.birthDate || '');
  }, [user?.id]);

  // ---------------------------------------------------------------------------
  // Computed stats
  // ---------------------------------------------------------------------------

  const totalGames = finishedGames.length;
  const wins = finishedGames.filter(g => user && g.standings.findIndex(s => s.playerId === user.id) === 0).length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const totalPts = finishedGames.reduce((acc, g) => {
    const s = user ? g.standings.find(st => st.playerId === user.id) : null;
    return acc + (s?.pts ?? 0);
  }, 0);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      name: fName.trim() || user.name,
      email: fEmail.trim() || user.email,
      phone: fPhone.trim() || undefined,
      description: fDesc.trim() || undefined,
      nationality: fNat || undefined,
      sex: fSex || undefined,
      birthDate: fBirth || undefined,
    };
    try { localStorage.setItem('padelmgt_user', JSON.stringify(updated)); } catch {}
    setUser(updated);
    if (updated.id) updatePlayer(updated.id, updated);
    setSaveMsg('¡Perfil actualizado!');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const updated = { ...user, avatarBase64: base64 };
      try { localStorage.setItem('padelmgt_user', JSON.stringify(updated)); } catch {}
      setUser(updated);
    };
    reader.readAsDataURL(file);
  }

  function handleDeleteAvatar() {
    if (!user) return;
    const updated = { ...user, avatarBase64: undefined };
    try { localStorage.setItem('padelmgt_user', JSON.stringify(updated)); } catch {}
    setUser(updated);
  }

  // ---------------------------------------------------------------------------
  // Not logged in
  // ---------------------------------------------------------------------------

  if (!user) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 16 }}>
          Sin sesión
        </div>
        <Link href="/login" style={{ fontSize: 14, color: 'var(--black)', fontWeight: 600 }}>
          Iniciar sesión →
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Minor check
  // ---------------------------------------------------------------------------

  const isMinor = fBirth ? getAge(fBirth) < 16 : false;

  // ---------------------------------------------------------------------------
  // Evolution chart data
  // ---------------------------------------------------------------------------

  // Use real ranking history from completed games; empty for new users
  const chartData: number[] = (() => {
    const games = typeof window !== 'undefined' ? getAllGames().filter(g => g.status === 'finished') : [];
    if (games.length === 0) return [];
    return games.slice(-10).map(g => {
      const history = getRankingHistoryForGame(g.id);
      const userId = user?.id ?? '';
      const entry = history.find(h => h.playerId === userId);
      return entry?.points ?? 0;
    }).filter(v => v > 0);
  })();
  const chartMin = Math.min(...chartData);
  const chartMax = Math.max(...chartData);
  const chartRange = chartMax - chartMin || 1;
  const chartPoints = chartData.map((v, i) => {
    const x = (i / (chartData.length - 1)) * 500;
    const y = 80 - ((v - chartMin) / chartRange) * 70 + 5;
    return { x, y, v };
  });
  const polylinePoints = chartPoints.map(p => `${p.x},${p.y}`).join(' ');

  // ---------------------------------------------------------------------------
  // Avatar helper
  // ---------------------------------------------------------------------------

  function AvatarCircle({ size, fontSize }: { size: number; fontSize: number }) {
    if (user!.avatarBase64) {
      return (
        <img
          src={user!.avatarBase64}
          alt="avatar"
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      );
    }
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'var(--court-blue)', color: '#fff',
        fontFamily: 'var(--font-display)', fontSize, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {initials(user!.name)}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ padding: '40px 40px 80px' }}>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Profile Header                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        background: 'var(--black)', padding: 32,
        display: 'flex', gap: 24, alignItems: 'flex-start',
        marginBottom: 24, position: 'relative',
      }}>
        {/* Avatar */}
        <AvatarCircle size={64} fontSize={22} />

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
            textTransform: 'uppercase', color: '#fff', lineHeight: 1.1, marginBottom: 6,
          }}>
            {user.name}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-400)', marginBottom: 12 }}>
            {user.level && <span>{user.level}</span>}
            {user.level && user.clubName && <span style={{ margin: '0 6px' }}>·</span>}
            {user.clubName && <span>{user.clubName}</span>}
          </div>
          {/* Chips row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {user.points !== undefined && (
              <span style={{
                background: 'var(--neon)', color: 'var(--black)',
                fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '3px 10px',
              }}>
                {user.points} pts
              </span>
            )}
            {user.level && (
              <span style={{
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                fontFamily: 'var(--font-body)', fontSize: 11,
                padding: '3px 10px',
              }}>
                {user.level}
              </span>
            )}
            {user.clubName && (
              <span style={{
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                fontFamily: 'var(--font-body)', fontSize: 11,
                padding: '3px 10px',
              }}>
                {user.clubName}
              </span>
            )}
            {user.sex && (
              <span style={{
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                fontFamily: 'var(--font-body)', fontSize: 11,
                padding: '3px 10px', textTransform: 'capitalize',
              }}>
                {user.sex}
              </span>
            )}
          </div>
        </div>

        {/* Config button top-right */}
        <button
          onClick={() => setTab('config')}
          style={{
            background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none',
            fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
            padding: '8px 16px',
          }}
        >
          Configuración
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Stats row                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Juegos', value: totalGames },
          { label: 'Victorias', value: wins },
          { label: 'Win Rate', value: `${winRate}%` },
          { label: 'Puntos', value: totalPts },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', padding: '24px 28px', border: '1px solid var(--grey-100)' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700,
              color: 'var(--black)', lineHeight: 1,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--grey-400)', marginTop: 6,
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Tabs                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--grey-200)', marginBottom: 28 }}>
        {(['perfil', 'historial', 'config'] as Tab[]).map(t => {
          const labels: Record<Tab, string> = { perfil: 'Perfil', historial: 'Historial', config: 'Configuración' };
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 14,
                padding: '12px 20px',
                borderBottom: active ? '2px solid var(--black)' : '2px solid transparent',
                color: active ? 'var(--black)' : 'var(--grey-400)',
                fontWeight: active ? 700 : 400,
                marginBottom: -1,
              }}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Tab content                                                      */}
      {/* ------------------------------------------------------------------ */}

      {/* ======================== TAB: PERFIL ============================== */}
      {tab === 'perfil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Evolution chart */}
          <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
            <div style={{ ...lbl, marginBottom: 16 }}>Evolución de Ranking</div>
            {chartData.length >= 2 ? (
              <>
                <svg
                  width="100%"
                  viewBox="0 0 500 80"
                  preserveAspectRatio="none"
                  style={{ display: 'block', height: 80 }}
                >
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="var(--turf-green)"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {chartPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--turf-green)" />
                  ))}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--grey-400)' }}>Últimos {chartData.length} juegos</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--grey-400)' }}>Ahora</span>
                </div>
              </>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--grey-300)', fontSize: 13 }}>
                Jugá partidos para ver tu evolución aquí.
              </div>
            )}
          </div>

          {/* Active games */}
          <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
            <div style={{ ...lbl, marginBottom: 16 }}>Mis Juegos Activos</div>
            {activeGames.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-400)' }}>
                No tenés juegos activos en este momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeGames.map(g => {
                  const isQuick = g.format === 'americano' || g.format === 'mexicano';
                  const href = isQuick
                    ? `/dashboard/player/quick-game/${g.id}`
                    : `/dashboard/player/tournaments/${g.id}`;
                  const statusColors: Record<string, string> = {
                    created: 'var(--grey-200)',
                    starting_soon: '#FDE68A',
                    live: 'var(--neon)',
                  };
                  const statusLabels: Record<string, string> = {
                    created: 'Inscripto',
                    starting_soon: 'Por comenzar',
                    live: 'En juego',
                  };
                  return (
                    <div key={g.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0', borderBottom: '1px solid var(--grey-100)',
                    }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: 2 }}>
                          {g.name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--grey-400)' }}>
                          {g.date} · {g.time} · {g.club}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          background: statusColors[g.status] ?? 'var(--grey-200)',
                          color: 'var(--black)', fontFamily: 'var(--font-body)',
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.08em', padding: '2px 8px',
                        }}>
                          {statusLabels[g.status] ?? g.status}
                        </span>
                        <Link href={href} style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>
                          Ver →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================== TAB: HISTORIAL =========================== */}
      {tab === 'historial' && (
        <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
          <div style={{ ...lbl, marginBottom: 20 }}>Historial Completo</div>
          {finishedGames.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-400)' }}>
              No hay juegos finalizados aún.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--grey-200)' }}>
                    {['Fecha', 'Juego', 'Tipo', 'Posición', 'Pts', 'PJ', '+/−', 'Ranking Δ'].map(h => (
                      <th key={h} style={{
                        ...lbl, textAlign: 'left', padding: '8px 12px',
                        whiteSpace: 'nowrap', borderBottom: 'none',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {finishedGames.map(g => {
                    const standing = g.standings.find(s => s.playerId === user.id);
                    const posIdx = g.standings.findIndex(s => s.playerId === user.id);
                    const pos = posIdx >= 0 ? posIdx + 1 : '—';
                    const total = g.standings.length;
                    const rankEntry = getRankingHistoryForGame(g.id).find(e => e.playerId === user.id);
                    return (
                      <tr key={g.id} style={{ borderBottom: '1px solid var(--grey-100)' }}>
                        <td style={{ padding: '12px 12px', color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>{g.date}</td>
                        <td style={{ padding: '12px 12px', fontWeight: 600, color: 'var(--black)' }}>{g.name}</td>
                        <td style={{ padding: '12px 12px', color: 'var(--grey-500)' }}>{formatLabel(g.format)}</td>
                        <td style={{ padding: '12px 12px' }}>
                          <span style={{ fontWeight: 700, color: posIdx === 0 ? 'var(--turf-green)' : 'var(--black)' }}>
                            {pos}/{total}
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px', color: 'var(--black)' }}>{standing?.pts ?? '—'}</td>
                        <td style={{ padding: '12px 12px', color: 'var(--grey-500)' }}>{standing?.played ?? '—'}</td>
                        <td style={{ padding: '12px 12px', color: 'var(--grey-500)' }}>
                          {standing ? (standing.diff >= 0 ? `+${standing.diff}` : String(standing.diff)) : '—'}
                        </td>
                        <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                          {rankEntry ? (
                            <span style={{ fontWeight: 700, color: rankEntry.delta > 0 ? 'var(--turf-green)' : rankEntry.delta < 0 ? '#ee0005' : '#b45309' }}>
                              {rankEntry.delta > 0 ? '+' : ''}{rankEntry.delta}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================== TAB: CONFIG ============================== */}
      {tab === 'config' && (
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Avatar section */}
          <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
            <div style={{ ...lbl, marginBottom: 16 }}>Foto de Perfil</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <AvatarCircle size={64} fontSize={22} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
                    background: 'var(--black)', color: '#fff', border: 'none',
                    padding: '8px 16px',
                  }}
                >
                  Subir foto
                </button>
                {user.avatarBase64 && (
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    style={{
                      fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
                      background: 'none', color: 'var(--grey-500)',
                      border: '1px solid var(--grey-200)', padding: '8px 16px',
                    }}
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Personal info */}
          <div style={{ background: '#fff', padding: 28, border: '1px solid var(--grey-100)' }}>
            <div style={{ ...lbl, fontSize: 12, marginBottom: 20 }}>Información Personal</div>

            {/* Row 1: Name + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={fName} onChange={e => setFName(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input style={inp} type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="tu@email.com" />
              </div>
            </div>

            {/* Row 2: Phone + Nationality */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Teléfono</label>
                <input style={inp} value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="+34 600 000 000" />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={lbl}>Nacionalidad</label>
                <select
                  style={sel}
                  value={fNat}
                  onChange={e => setFNat(e.target.value)}
                >
                  <option value="">Seleccionar país</option>
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Descripción</label>
              <textarea
                style={{ ...inp, height: 80, resize: 'vertical' }}
                value={fDesc}
                onChange={e => setFDesc(e.target.value)}
                placeholder="Cuéntanos algo sobre vos..."
              />
            </div>

            {/* Row 3: Sex + Birth Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={lbl}>Sexo</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['masculino', 'femenino'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFSex(fSex === s ? '' : s)}
                      style={{
                        flex: 1, padding: '10px 0', fontFamily: 'var(--font-body)',
                        fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
                        border: fSex === s ? '2px solid var(--black)' : '1px solid var(--grey-200)',
                        background: fSex === s ? 'var(--black)' : '#fff',
                        color: fSex === s ? '#fff' : 'var(--grey-600)',
                        fontWeight: fSex === s ? 700 : 400,
                      }}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Fecha de Nacimiento</label>
                <input
                  style={inp}
                  type="date"
                  value={fBirth}
                  onChange={e => setFBirth(e.target.value)}
                />
              </div>
            </div>

            {/* Minor notice */}
            {isMinor && (
              <div style={{
                marginTop: 16, padding: '12px 16px',
                background: '#FEF3C7', border: '1px solid #FDE68A',
                fontFamily: 'var(--font-body)', fontSize: 13, color: '#92400E',
              }}>
                Jugador menor de 16 años. La plataforma permite registrar menores de edad. Se requiere autorización de un tutor para participar en torneos.
              </div>
            )}
          </div>

          {/* Save button */}
          <div>
            <button
              type="submit"
              style={{
                display: 'block', width: '100%',
                background: 'var(--black)', color: '#fff', border: 'none',
                fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '16px', cursor: 'pointer',
              }}
            >
              Guardar cambios
            </button>
            {saveMsg && (
              <div style={{
                marginTop: 12, fontFamily: 'var(--font-body)', fontSize: 13,
                color: 'var(--turf-green)', fontWeight: 600, textAlign: 'center',
              }}>
                {saveMsg}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
