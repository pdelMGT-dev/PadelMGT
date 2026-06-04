'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLeague } from '@/hooks/useLeague';
import { createSeason, saveSeason, activateSeason, type LeagueSeason } from '@/lib/league-season-store';

function CreateSeasonForm({ leagueId, onCreated }: { leagueId: string; onCreated: () => void }) {
  const nextYear = String(new Date().getFullYear() + 1);
  const [year, setYear] = useState(nextYear);
  const [rounds, setRounds] = useState('18');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  function handleCreate() {
    if (!year.trim()) return;
    createSeason({
      leagueId,
      year: year.trim(),
      status: 'upcoming',
      rounds: parseInt(rounds) || 18,
      startDate: startDate || `${year}-01-01`,
      endDate: endDate || `${year}-12-31`,
      champion: null,
    });
    onCreated();
  }

  return (
    <div style={{ background: 'var(--black)', padding: '28px 32px', marginBottom: 24 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 16 }}>Nueva Temporada</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 14, alignItems: 'end' }}>
        <div className="field">
          <label style={{ color: 'rgba(255,255,255,0.6)' }}>Año</label>
          <input value={year} onChange={e => setYear(e.target.value)} placeholder="2027" style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
        </div>
        <div className="field">
          <label style={{ color: 'rgba(255,255,255,0.6)' }}>Jornadas</label>
          <input type="number" value={rounds} onChange={e => setRounds(e.target.value)} min={1} style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
        </div>
        <div className="field">
          <label style={{ color: 'rgba(255,255,255,0.6)' }}>Inicio</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
        </div>
        <div className="field">
          <label style={{ color: 'rgba(255,255,255,0.6)' }}>Fin</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
        </div>
        <button onClick={handleCreate} disabled={!year.trim()} className="btn btn-sm" style={{ background: 'var(--neon)', color: 'var(--black)', borderRadius: 0, fontWeight: 700 }}>
          Crear
        </button>
      </div>
    </div>
  );
}

function SeasonChampionEditor({ season, onSave }: { season: LeagueSeason; onSave: () => void }) {
  const [champion, setChampion] = useState(season.champion ?? '');

  function handleSave() {
    saveSeason({ ...season, status: 'completed', champion: champion.trim() || null });
    onSave();
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
      <input value={champion} onChange={e => setChampion(e.target.value)} placeholder="Nombre del campeón" style={{ padding: '5px 10px', border: '1px solid var(--grey-200)', fontSize: 13, width: 200 }} />
      <button onClick={handleSave} className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Finalizar temporada</button>
    </div>
  );
}

export default function LeagueSeasonsPage() {
  const { league, seasons, activeSeason, refresh } = useLeague();
  const [showCreate, setShowCreate] = useState(false);
  const [showChampion, setShowChampion] = useState<string | null>(null);

  if (!league) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
        <div style={{ marginBottom: 16 }}>Primero configurá tu liga.</div>
        <Link href="/dashboard/league" className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Ir al panel →</Link>
      </div>
    );
  }

  function handleActivate(id: string) {
    activateSeason(id, league!.id);
    refresh();
  }

  const active = activeSeason;

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>{league.name}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>TEMPORADAS</h1>
      </div>

      {/* Active season highlight */}
      {active ? (
        <div style={{ background: 'var(--black)', padding: '36px 40px', marginBottom: 32, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--neon)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 8 }}>Temporada activa</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 16 }}>Temp. {active.year}</div>
              <div style={{ display: 'flex', gap: 32 }}>
                {[
                  { label: 'Jornadas', v: active.rounds },
                  { label: 'Inicio', v: active.startDate },
                  { label: 'Fin', v: active.endDate },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{s.v}</div>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {showChampion === active.id ? (
                <SeasonChampionEditor season={active} onSave={() => { setShowChampion(null); refresh(); }} />
              ) : (
                <button onClick={() => setShowChampion(active.id)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', padding: '8px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Finalizar temporada
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '32px', border: '2px dashed var(--grey-200)', textAlign: 'center', marginBottom: 32, color: 'var(--grey-400)' }}>
          <p style={{ fontSize: 14, marginBottom: 12 }}>No hay temporada activa.</p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>Crear temporada</button>
        </div>
      )}

      {showCreate && (
        <CreateSeasonForm leagueId={league.id} onCreated={() => { setShowCreate(false); refresh(); }} />
      )}

      {/* All seasons */}
      {seasons.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)', marginBottom: 24 }}>
          {seasons.map((s) => (
            <div key={s.id} style={{ background: s.status === 'active' ? '#fff' : 'var(--grey-50, #fafafa)', padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 32 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: s.status === 'active' ? 'var(--black)' : 'var(--grey-300)', letterSpacing: '-0.02em', width: 80, flexShrink: 0 }}>{s.year}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--grey-500)' }}>
                  <span><strong style={{ color: 'var(--black)', fontFamily: 'var(--font-display)', fontSize: 16 }}>{s.rounds}</strong> jornadas</span>
                  <span>{s.startDate} → {s.endDate}</span>
                </div>
                {s.champion && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f5a623', marginTop: 6 }}>Campeón: {s.champion}</div>
                )}
                {s.status === 'upcoming' && !active && (
                  <button onClick={() => handleActivate(s.id)} style={{ marginTop: 8, background: 'none', border: '1px solid var(--turf-green)', color: 'var(--turf-green)', padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    Activar temporada
                  </button>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                {s.status === 'active' && <span className="badge" style={{ background: 'rgba(30,170,82,0.1)', color: 'var(--turf-green)', border: 'none' }}>En curso</span>}
                {s.status === 'upcoming' && <span className="badge" style={{ background: 'rgba(214,255,0,0.1)', color: '#8a9e00', border: 'none' }}>Próxima</span>}
                {s.status === 'completed' && <span className="badge" style={{ background: 'var(--grey-100)', color: 'var(--grey-500)' }}>Finalizada</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>
        {showCreate ? 'Cancelar' : '+ Crear próxima temporada'}
      </button>
    </div>
  );
}
