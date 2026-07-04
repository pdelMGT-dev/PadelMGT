'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createPlayerLeague, createLeagueSeason, getAllPlayerLeagues } from '@/lib/player-league-store';
import { checkLeagueCreateGate } from '@/lib/plan-config';

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: '1px solid var(--grey-200)', background: '#fff',
  color: 'var(--black)', outline: 'none', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 6, display: 'block',
};
const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '24px', marginBottom: 16,
};
const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)',
};

function today() { return new Date().toISOString().slice(0, 10); }
function inMonths(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

export default function CreateLeaguePage() {
  const router = useRouter();
  const { user } = useCurrentUser();

  // League fields
  const [name, setName]             = useState('');
  const [description, setDescription] = useState('');
  const [isOpen, setIsOpen]         = useState(false);

  // First season fields
  const [addSeason, setAddSeason]   = useState(true);
  const [seasonName, setSeasonName] = useState('Temporada 1');
  const [startDate, setStartDate]   = useState(today());
  const [endDate, setEndDate]       = useState(inMonths(3));
  const [pointsWin, setPointsWin]   = useState(3);
  const [pointsDraw, setPointsDraw] = useState(1);
  const [pointsLoss, setPointsLoss] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function handleSubmit() {
    if (!user) return;
    if (!name.trim()) { setError('El nombre de la liga es obligatorio.'); return; }
    if (addSeason && !seasonName.trim()) { setError('El nombre de la temporada es obligatorio.'); return; }
    if (addSeason && endDate <= startDate) { setError('La fecha de fin debe ser posterior a la de inicio.'); return; }

    // Plan gate: the creator's plan caps how many leagues they can run.
    const myLeagueCount = getAllPlayerLeagues().filter(l => l.createdBy === user.id).length;
    const gate = checkLeagueCreateGate(user.id, myLeagueCount);
    if (!gate.allowed && gate.reason === 'active_leagues') {
      setError(`Tu plan permite ${gate.limit} liga${gate.limit === 1 ? '' : 's'} activa${gate.limit === 1 ? '' : 's'} (ya tenés ${gate.used}). Actualizá tu plan para crear más.`);
      return;
    }

    setSaving(true);
    const league = createPlayerLeague({
      name: name.trim(),
      description: description.trim() || undefined,
      createdBy: user.id,
      createdByName: user.name,
      isOpen,
      isPublic: true,
      defaultPointsWin: pointsWin,
      defaultPointsDraw: pointsDraw,
      defaultPointsLoss: pointsLoss,
    });

    if (addSeason) {
      createLeagueSeason({
        leagueId: league.id,
        name: seasonName.trim(),
        startDate,
        endDate,
        pointsWin,
        pointsDraw,
        pointsLoss,
      });
    }

    router.push(`/dashboard/player/leagues/${league.id}`);
  }

  return (
    <div style={{ padding: '40px 32px 80px', maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid var(--grey-100)' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 4 }}>Nueva Liga</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>CREAR LIGA</h1>
        </div>
        <Link href="/dashboard/player/leagues" style={{ padding: '9px 18px', border: '1px solid var(--grey-200)', fontSize: 11, fontWeight: 600, color: 'var(--grey-500)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Cancelar
        </Link>
      </div>

      {/* Liga info */}
      <div style={card}>
        <div style={secTitle}>Información de la Liga</div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Nombre de la Liga *</label>
          <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Liga Verano 2026" maxLength={80} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Descripción</label>
          <textarea
            style={{ ...inp, resize: 'vertical', minHeight: 72 }}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descripción opcional..."
            maxLength={300}
          />
        </div>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={isOpen} onChange={e => setIsOpen(e.target.checked)} />
            <span style={{ fontSize: 13, color: 'var(--grey-600)' }}>Liga abierta — cualquier jugador puede unirse</span>
          </label>
          <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 4, marginLeft: 24 }}>
            Si está desactivado, solo los jugadores invitados por un administrador pueden unirse.
          </div>
        </div>
      </div>

      {/* Primera temporada */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)' }}>Primera Temporada</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--grey-500)' }}>
            <input type="checkbox" checked={addSeason} onChange={e => setAddSeason(e.target.checked)} />
            Agregar ahora
          </label>
        </div>

        {!addSeason && (
          <div style={{ fontSize: 13, color: 'var(--grey-400)', padding: '12px 0' }}>
            Podés agregar temporadas más adelante desde la página de la liga.
          </div>
        )}

        {addSeason && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Nombre de la Temporada</label>
              <input style={inp} value={seasonName} onChange={e => setSeasonName(e.target.value)} maxLength={60} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={lbl}>Fecha de Inicio</label>
                <input type="date" style={inp} value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Fecha de Fin</label>
                <input type="date" style={inp} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--grey-100)' }}>
              Puntos por Resultado
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'Victoria', color: '#16a34a', value: pointsWin,  setter: setPointsWin },
                { label: 'Empate',   color: '#ca8a04', value: pointsDraw, setter: setPointsDraw },
                { label: 'Derrota',  color: '#dc2626', value: pointsLoss, setter: setPointsLoss },
              ].map(({ label, color, value, setter }) => (
                <div key={label} style={{ border: `1px solid ${color}30`, padding: '12px', background: `${color}08` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: 8 }}>{label}</div>
                  <input
                    type="number"
                    style={{ ...inp, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, padding: '8px', borderColor: `${color}40` }}
                    value={value}
                    onChange={e => setter(Number(e.target.value))}
                    min={-10}
                    max={100}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        style={{ width: '100%', padding: '14px', background: saving ? 'var(--grey-200)' : 'var(--black)', color: saving ? 'var(--grey-400)' : '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
      >
        {saving ? 'Creando...' : 'Crear Liga →'}
      </button>
    </div>
  );
}
