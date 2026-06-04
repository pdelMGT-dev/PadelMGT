'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLeague } from '@/hooks/useLeague';
import { createTeam, saveTeam, deleteTeam, type LeagueTeam, type TeamPlayer } from '@/lib/team-store';

function PlayerList({ players, onChange }: { players: TeamPlayer[]; onChange: (p: TeamPlayer[]) => void }) {
  function add() { onChange([...players, { name: '', ranking: '' }]); }
  function update(i: number, field: keyof TeamPlayer, val: string) {
    const next = [...players];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  }
  function remove(i: number) { onChange(players.filter((_, j) => j !== i)); }

  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
        Jugadores ({players.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {players.map((p, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8 }}>
            <input
              value={p.name}
              onChange={e => update(i, 'name', e.target.value)}
              placeholder={`Jugador ${i + 1}`}
              style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '6px 10px', fontSize: 13 }}
            />
            <input
              value={p.ranking ?? ''}
              onChange={e => update(i, 'ranking', e.target.value)}
              placeholder="#001"
              style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '6px 10px', fontSize: 13, fontFamily: 'monospace' }}
            />
            <button onClick={() => remove(i)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '0 10px', fontSize: 14 }}>×</button>
          </div>
        ))}
      </div>
      <button onClick={add} style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
        + Jugador
      </button>
    </div>
  );
}

function AddTeamForm({ leagueId, onAdded }: { leagueId: string; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [club, setClub] = useState('');
  const [city, setCity] = useState('');
  const [players, setPlayers] = useState<TeamPlayer[]>([]);

  function handleAdd() {
    if (!name.trim()) return;
    createTeam({ leagueId, name: name.trim(), club: club.trim(), city: city.trim(), players: players.filter(p => p.name.trim()) });
    setName(''); setClub(''); setCity(''); setPlayers([]);
    onAdded();
  }

  return (
    <div style={{ background: 'var(--black)', padding: '28px 32px', marginBottom: 24, position: 'relative' }}>
      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 16 }}>Nuevo Equipo</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="field">
          <label style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre del equipo</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Mi Equipo FC" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
        </div>
        <div className="field">
          <label style={{ color: 'rgba(255,255,255,0.6)' }}>Club / Sede</label>
          <input value={club} onChange={e => setClub(e.target.value)} placeholder="Club nombre" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
        </div>
        <div className="field">
          <label style={{ color: 'rgba(255,255,255,0.6)' }}>Ciudad</label>
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ciudad" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <PlayerList players={players} onChange={setPlayers} />
      </div>
      <button onClick={handleAdd} disabled={!name.trim()} className="btn btn-sm" style={{ background: 'var(--neon)', color: 'var(--black)', borderRadius: 0, fontWeight: 700 }}>
        Agregar equipo
      </button>
    </div>
  );
}

function EditTeamForm({ team, onSave, onCancel }: { team: LeagueTeam; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState(team.name);
  const [club, setClub] = useState(team.club);
  const [city, setCity] = useState(team.city);
  const [players, setPlayers] = useState<TeamPlayer[]>(team.players);

  function handleSave() {
    saveTeam({ ...team, name: name.trim(), club: club.trim(), city: city.trim(), players: players.filter(p => p.name.trim()) });
    onSave();
  }

  return (
    <div style={{ background: '#fafafa', padding: '20px 24px', borderTop: '1px solid var(--grey-200)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="field"><label>Nombre</label><input value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="field"><label>Club / Sede</label><input value={club} onChange={e => setClub(e.target.value)} /></div>
        <div className="field"><label>Ciudad</label><input value={city} onChange={e => setCity(e.target.value)} /></div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)', marginBottom: 10 }}>Jugadores</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {players.map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8 }}>
              <input value={p.name} onChange={e => { const n = [...players]; n[i] = { ...n[i], name: e.target.value }; setPlayers(n); }} placeholder={`Jugador ${i + 1}`} style={{ padding: '6px 10px', border: '1px solid var(--grey-200)', fontSize: 13 }} />
              <input value={p.ranking ?? ''} onChange={e => { const n = [...players]; n[i] = { ...n[i], ranking: e.target.value }; setPlayers(n); }} placeholder="#001" style={{ padding: '6px 10px', border: '1px solid var(--grey-200)', fontSize: 13, fontFamily: 'monospace' }} />
              <button onClick={() => setPlayers(players.filter((_, j) => j !== i))} style={{ background: 'none', border: '1px solid var(--grey-200)', color: '#ee0005', cursor: 'pointer', padding: '0 10px' }}>×</button>
            </div>
          ))}
        </div>
        <button onClick={() => setPlayers([...players, { name: '', ranking: '' }])} style={{ background: 'none', border: '1px dashed var(--grey-200)', color: 'var(--grey-400)', padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>+ Jugador</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Guardar</button>
        <button onClick={onCancel} className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Cancelar</button>
      </div>
    </div>
  );
}

export default function LeagueTeamsPage() {
  const { league, teams, standings, activeSeason, refresh } = useLeague();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!league) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
        <div style={{ marginBottom: 16 }}>Primero configurá tu liga.</div>
        <Link href="/dashboard/league" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Ir al panel →</Link>
      </div>
    );
  }

  const standingsMap = new Map(standings.map((s, i) => [s.teamId, { pos: i + 1, pts: s.pts }]));
  const totalPlayers = teams.reduce((acc, t) => acc + t.players.length, 0);

  function handleDelete(id: string) {
    deleteTeam(id);
    setConfirmDelete(null);
    setExpanded(null);
    refresh();
  }

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
            {league.name} · {activeSeason?.year ?? ''}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>EQUIPOS</h1>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>
          {showAdd ? 'Cancelar' : '+ Agregar Equipo'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {[
          { label: 'Equipos inscriptos', value: String(teams.length) },
          { label: 'Jugadores totales', value: String(totalPlayers) },
          { label: 'Jugadores por equipo', value: teams.length > 0 ? (totalPlayers / teams.length).toFixed(1) : '—' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {showAdd && <AddTeamForm leagueId={league.id} onAdded={() => { setShowAdd(false); refresh(); }} />}

      {teams.length === 0 ? (
        <div style={{ padding: '40px', border: '1px solid var(--grey-200)', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
          No hay equipos aún. Usá "+ Agregar Equipo" para empezar.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
          {teams.map((team) => {
            const standing = standingsMap.get(team.id);
            const pos = standing?.pos ?? '—';
            const pts = standing?.pts ?? 0;
            const isExpanded = expanded === team.id;
            const isEditing = editing === team.id;

            return (
              <div key={team.id}>
                <div
                  onClick={() => { if (!isEditing) { setExpanded(isExpanded ? null : team.id); } }}
                  style={{ background: isExpanded ? 'var(--black)' : '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer', transition: 'background 0.15s' }}
                >
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: isExpanded ? 'var(--neon)' : 'var(--grey-200)', width: 48, flexShrink: 0 }}>#{pos}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: isExpanded ? '#fff' : 'var(--black)' }}>{team.name}</div>
                    <div style={{ fontSize: 12, color: isExpanded ? 'rgba(255,255,255,0.45)' : 'var(--grey-400)', marginTop: 2 }}>
                      {team.club}{team.city ? ` · ${team.city}` : ''} · {team.players.length} jugadores
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 16 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: isExpanded ? '#fff' : 'var(--black)' }}>{pts}</div>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: isExpanded ? 'rgba(255,255,255,0.4)' : 'var(--grey-400)', fontWeight: 600 }}>pts</div>
                  </div>
                  <span style={{ fontSize: 14, color: isExpanded ? 'var(--neon)' : 'var(--grey-300)' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {isExpanded && !isEditing && (
                  <div style={{ background: '#fff', padding: '20px 24px 24px', borderTop: '1px solid var(--grey-200)' }}>
                    {team.players.length > 0 ? (
                      <>
                        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 14 }}>Nómina de jugadores</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                          {team.players.map((p, i) => (
                            <div key={i} style={{ border: '1px solid var(--grey-200)', padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                              {p.ranking && <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--grey-400)' }}>{p.ranking}</div>}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 16 }}>Sin jugadores cargados.</p>
                    )}

                    {confirmDelete === team.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#ee0005', fontWeight: 600 }}>¿Eliminar equipo?</span>
                        <button onClick={() => handleDelete(team.id)} style={{ background: '#ee0005', border: 'none', color: '#fff', padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Confirmar</button>
                        <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Cancelar</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditing(team.id)} className="btn btn-secondary btn-sm" style={{ borderRadius: 0 }}>Editar equipo</button>
                        <button onClick={() => setConfirmDelete(team.id)} style={{ background: 'none', border: '1px solid var(--grey-200)', padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#ee0005', fontWeight: 600 }}>Eliminar</button>
                      </div>
                    )}
                  </div>
                )}

                {isEditing && (
                  <EditTeamForm
                    team={team}
                    onSave={() => { setEditing(null); refresh(); }}
                    onCancel={() => setEditing(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
