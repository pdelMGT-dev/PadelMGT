'use client';

import { useState } from 'react';

type ScoreType = 'sets' | 'points';
type Visibility = 'public' | 'private';
type Player = { id: string; name: string; level: string; registered: boolean };

const POINT_OPTIONS = [8, 12, 16, 20, 24, 28, 32] as const;
const SET_OPTIONS = [1, 2, 3] as const;
const TIEBREAK_OPTIONS = [7, 10] as const;

const MOCK_PLAYERS: Player[] = [
  { id: '1', name: 'Ana Rodríguez', level: 'Intermedio', registered: true },
  { id: '2', name: 'Marcos Herrera', level: 'Avanzado', registered: true },
  { id: '3', name: 'Carlos Vargas', level: 'Principiante', registered: true },
  { id: '4', name: 'Sofía López', level: 'Intermedio', registered: true },
  { id: '5', name: 'Pedro Morales', level: 'Avanzado', registered: true },
  { id: '6', name: 'Laura Torres', level: 'Principiante', registered: true },
  { id: '7', name: 'Diego Fernández', level: 'Intermedio', registered: true },
  { id: '8', name: 'Isabel Bravo', level: 'Avanzado', registered: true },
];

const MOCK_CLUBS = [
  { id: '1', name: 'Club Barrio Norte', city: 'Buenos Aires', country: 'Argentina' },
  { id: '2', name: 'Padel Arena', city: 'Buenos Aires', country: 'Argentina' },
  { id: '3', name: 'Club La Cantera', city: 'Córdoba', country: 'Argentina' },
  { id: '4', name: 'Padel Santiago', city: 'Santiago', country: 'Chile' },
  { id: '5', name: 'Club Deportivo Sur', city: 'Buenos Aires', country: 'Argentina' },
];

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 6, display: 'block',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: '1px solid var(--grey-200)', background: '#fff',
  color: 'var(--black)', outline: 'none',
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const, cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239E9EA0'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--grey-200)' }}>
      {children}
    </div>
  );
}

export default function QuickGamePage() {
  // Basic info
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [clubSearch, setClubSearch] = useState('');
  const [selectedClub, setSelectedClub] = useState<typeof MOCK_CLUBS[0] | null>(null);
  const [level, setLevel] = useState('Todos');
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');

  // Players
  const [playerSearch, setPlayerSearch] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<(Player & { team: number })[]>([]);
  const [numTeams, setNumTeams] = useState(2);

  // Game type
  const [scoreType, setScoreType] = useState<ScoreType>('sets');
  const [numSets, setNumSets] = useState(2);
  const [pointTarget, setPointTarget] = useState(16);
  const [tiebreak, setTiebreak] = useState(7);

  // UI state
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const filteredClubs = MOCK_CLUBS.filter(c =>
    c.name.toLowerCase().includes(clubSearch.toLowerCase()) ||
    c.city.toLowerCase().includes(clubSearch.toLowerCase())
  );

  const filteredPlayers = MOCK_PLAYERS.filter(p =>
    p.name.toLowerCase().includes(playerSearch.toLowerCase()) &&
    !selectedPlayers.find(s => s.id === p.id)
  );

  const maxPlayers = numTeams * 2;
  const canAddPlayer = selectedPlayers.length < maxPlayers;

  function addPlayer(p: Player, team: number) {
    setSelectedPlayers(prev => [...prev, { ...p, team }]);
    setPlayerSearch('');
    setShowPlayerDropdown(false);
  }

  function removePlayer(id: string) {
    setSelectedPlayers(prev => prev.filter(p => p.id !== id));
  }

  function addInvite() {
    if (!inviteName.trim()) return;
    const newPlayer: Player & { team: number } = {
      id: `invite-${Date.now()}`,
      name: inviteName.trim(),
      level: 'Por confirmar',
      registered: false,
      team: 1,
    };
    setSelectedPlayers(prev => [...prev, newPlayer]);
    setInviteName('');
    setInviteEmail('');
  }

  if (submitted) {
    return (
      <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700, color: 'var(--turf-green)', marginBottom: 8 }}>✓</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 12px' }}>¡Juego Creado!</h2>
        <p style={{ color: 'var(--grey-500)', marginBottom: 32, maxWidth: 360 }}>
          Tu juego rápido fue creado exitosamente.
          {visibility === 'public' && ' Compartí el código QR para que otros jugadores se unan.'}
        </p>
        {visibility === 'public' && (
          <div style={{ background: 'var(--grey-100)', padding: 24, marginBottom: 24, display: 'inline-block' }}>
            <div style={{ width: 120, height: 120, background: 'var(--grey-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--grey-500)', fontWeight: 600 }}>
              QR Code
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--grey-500)', fontWeight: 600, letterSpacing: '0.1em' }}>CÓDIGO: JR-2026-4827</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setSubmitted(false)} className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Editar juego</button>
          <a href="/dashboard/player" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Ir al inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 40px 80px', maxWidth: 820 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Jugadores</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>CREAR JUEGO RÁPIDO</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── INFORMACIÓN BÁSICA ── */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
          <SectionTitle>Información básica</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Hora</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* ── CLUB ── */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
          <SectionTitle>Club</SectionTitle>
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Buscar club por ciudad o nombre</label>
            {selectedClub ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--neon)', background: 'rgba(214,255,0,0.04)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedClub.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{selectedClub.city}, {selectedClub.country}</div>
                </div>
                <button onClick={() => { setSelectedClub(null); setClubSearch(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--grey-400)', lineHeight: 1 }}>×</button>
              </div>
            ) : (
              <>
                <input
                  type="text" value={clubSearch}
                  onChange={e => { setClubSearch(e.target.value); setShowClubDropdown(true); }}
                  onFocus={() => setShowClubDropdown(true)}
                  placeholder="Ej: Buenos Aires, Club Barrio Norte…"
                  style={inputStyle}
                />
                {showClubDropdown && clubSearch.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid var(--grey-200)', borderTop: 'none', maxHeight: 200, overflowY: 'auto' }}>
                    {filteredClubs.length > 0 ? filteredClubs.map(c => (
                      <button key={c.id} onClick={() => { setSelectedClub(c); setShowClubDropdown(false); setClubSearch(''); }}
                        style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--grey-100)' }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{c.city}, {c.country}</div>
                      </button>
                    )) : (
                      <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--grey-400)' }}>No se encontraron clubes.</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── EQUIPOS Y JUGADORES ── */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
          <SectionTitle>Equipos y jugadores</SectionTitle>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Número de equipos (máx. 6)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[2, 3, 4, 5, 6].map(n => (
                <button key={n} onClick={() => setNumTeams(n)}
                  style={{
                    width: 44, height: 44, border: `1px solid ${numTeams === n ? 'var(--black)' : 'var(--grey-200)'}`,
                    background: numTeams === n ? 'var(--black)' : '#fff',
                    color: numTeams === n ? '#fff' : 'var(--black)',
                    fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, cursor: 'pointer',
                  }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--grey-400)' }}>
              {numTeams} equipos × 2 jugadores = {maxPlayers} jugadores en total
            </div>
          </div>

          {/* Player search */}
          <label style={labelStyle}>Agregar jugadores ({selectedPlayers.length}/{maxPlayers})</label>
          {canAddPlayer && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                type="text" value={playerSearch}
                onChange={e => { setPlayerSearch(e.target.value); setShowPlayerDropdown(true); }}
                onFocus={() => setShowPlayerDropdown(true)}
                placeholder="Buscar jugador registrado…"
                style={inputStyle}
              />
              {showPlayerDropdown && playerSearch.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid var(--grey-200)', borderTop: 'none', maxHeight: 200, overflowY: 'auto' }}>
                  {filteredPlayers.length > 0 ? filteredPlayers.map(p => (
                    <button key={p.id} onClick={() => addPlayer(p, 1)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--grey-100)' }}>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</span>
                      <span className="chip" style={{ fontSize: 9 }}>{p.level}</span>
                    </button>
                  )) : (
                    <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--grey-400)' }}>No se encontraron jugadores.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected players */}
          {selectedPlayers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {selectedPlayers.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: p.registered ? 'var(--court-blue)' : 'var(--grey-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.registered ? p.level : 'Invitado – pendiente confirmación'}</div>
                    </div>
                  </div>
                  <button onClick={() => removePlayer(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--grey-400)', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Invite new player */}
          <div style={{ padding: '16px', background: 'var(--grey-50)', border: '1px dashed var(--grey-300)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>
              Invitar jugador no registrado
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: 4 }}>Nombre</label>
                <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Nombre completo" style={{ ...inputStyle, padding: '8px 10px' }} />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 4 }}>Email (opcional)</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@ejemplo.com" style={{ ...inputStyle, padding: '8px 10px' }} />
              </div>
              <button onClick={addInvite} disabled={!inviteName.trim() || !canAddPlayer}
                style={{ padding: '9px 16px', background: inviteName.trim() && canAddPlayer ? 'var(--black)' : 'var(--grey-200)', color: inviteName.trim() && canAddPlayer ? '#fff' : 'var(--grey-400)', border: 'none', cursor: inviteName.trim() && canAddPlayer ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                Invitar
              </button>
            </div>
          </div>
        </div>

        {/* ── TIPO DE JUEGO ── */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
          <SectionTitle>Tipo de juego y puntuación</SectionTitle>

          <div style={{ marginBottom: 20, border: '1px solid var(--grey-200)', display: 'inline-flex' }}>
            {(['sets', 'points'] as ScoreType[]).map(st => (
              <button key={st} onClick={() => setScoreType(st)}
                style={{ padding: '9px 20px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: scoreType === st ? 'var(--black)' : '#fff', color: scoreType === st ? '#fff' : 'var(--grey-500)', transition: 'all 0.12s' }}>
                {st === 'sets' ? 'Sets' : 'Puntaje'}
              </button>
            ))}
          </div>

          {scoreType === 'sets' ? (
            <div>
              <label style={labelStyle}>Cantidad de sets</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {SET_OPTIONS.map(n => (
                  <button key={n} onClick={() => setNumSets(n)}
                    style={{ width: 56, height: 44, border: `1px solid ${numSets === n ? 'var(--black)' : 'var(--grey-200)'}`, background: numSets === n ? 'var(--black)' : '#fff', color: numSets === n ? '#fff' : 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, cursor: 'pointer' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Puntaje objetivo</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {POINT_OPTIONS.map(n => (
                  <button key={n} onClick={() => setPointTarget(n)}
                    style={{ width: 56, height: 44, border: `1px solid ${pointTarget === n ? 'var(--black)' : 'var(--grey-200)'}`, background: pointTarget === n ? 'var(--black)' : '#fff', color: pointTarget === n ? '#fff' : 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Tie-break (puntos)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {TIEBREAK_OPTIONS.map(n => (
                <button key={n} onClick={() => setTiebreak(n)}
                  style={{ width: 56, height: 44, border: `1px solid ${tiebreak === n ? 'var(--black)' : 'var(--grey-200)'}`, background: tiebreak === n ? 'var(--black)' : '#fff', color: tiebreak === n ? '#fff' : 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, cursor: 'pointer' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── NIVEL Y NOTAS ── */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
          <SectionTitle>Nivel y configuración</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nivel</label>
              <select value={level} onChange={e => setLevel(e.target.value)} style={selectStyle}>
                <option>Todos</option>
                <option>Principiante</option>
                <option>Intermedio</option>
                <option>Avanzado</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Visibilidad</label>
              <div style={{ display: 'flex', border: '1px solid var(--grey-200)' }}>
                {(['public', 'private'] as Visibility[]).map(v => (
                  <button key={v} onClick={() => setVisibility(v)}
                    style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: visibility === v ? 'var(--black)' : '#fff', color: visibility === v ? '#fff' : 'var(--grey-500)' }}>
                    {v === 'public' ? '🌐 Público' : '🔒 Privado'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {visibility === 'public' && (
            <div style={{ padding: '12px 16px', background: 'rgba(214,255,0,0.06)', border: '1px solid rgba(214,255,0,0.3)', fontSize: 12, color: 'var(--grey-500)', marginBottom: 16 }}>
              <strong style={{ color: 'var(--black)' }}>Juego público:</strong> se generará un código QR para compartir. Cualquier jugador puede unirse hasta completar los cupos.
            </div>
          )}
          {visibility === 'private' && (
            <div style={{ padding: '12px 16px', background: 'var(--grey-50)', border: '1px solid var(--grey-200)', fontSize: 12, color: 'var(--grey-500)', marginBottom: 16 }}>
              <strong style={{ color: 'var(--black)' }}>Juego privado:</strong> debés completar todos los jugadores antes de poder iniciar el juego.
              {selectedPlayers.length < maxPlayers && (
                <span style={{ color: '#ee0005', display: 'block', marginTop: 4 }}>
                  Faltan {maxPlayers - selectedPlayers.length} jugador(es) para completar el cupo.
                </span>
              )}
            </div>
          )}

          <div>
            <label style={labelStyle}>Notas adicionales</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Traer pelotas, entrada por calle Av. Corrientes…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <a href="/dashboard/player" style={{ padding: '12px 24px', border: '1px solid var(--grey-200)', fontSize: 13, fontWeight: 600, textDecoration: 'none', color: 'var(--grey-500)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Cancelar
          </a>
          <button
            onClick={() => setSubmitted(true)}
            disabled={!date || !time || !selectedClub}
            style={{
              padding: '12px 32px', background: date && time && selectedClub ? 'var(--black)' : 'var(--grey-200)',
              color: date && time && selectedClub ? '#fff' : 'var(--grey-400)',
              border: 'none', cursor: date && time && selectedClub ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
            Crear juego rápido
          </button>
        </div>
      </div>
    </div>
  );
}
