'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  loadPersonalizadoById,
  saveControlPanel,
  estimateTournamentDays,
  teamsPerGroupFromCount,
  groupCountFromTeamsPerGroup,
  nextPowerOfTwo,
  DEFAULT_CONTROL_CONFIG,
  DEFAULT_SCORE_PHASE,
  type PersonalizadoTournament,
  type PersonalizadoTeam,
  type PersonalizadoCategory,
  type ControlPanelConfig,
  type CategoryGroupConfig,
  type ScorePhaseConfig,
  type DeuceRule,
} from '@/lib/personalizado-store';
import { getMinorCategories, type MinorCategory } from '@/lib/minor-categories-store';
import { searchPlayers, getPlayer, type RegisteredPlayer } from '@/lib/player-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ToastProvider';

// ── Styles ─────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '22px 24px', marginBottom: 16,
};
const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)',
};
const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--grey-500)', marginBottom: 6, display: 'block',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 11px', fontSize: 13, border: '1px solid var(--grey-200)',
  background: '#fff', color: 'var(--black)', outline: 'none', boxSizing: 'border-box',
};
const numInp: React.CSSProperties = { ...inp, width: 90 };
const GENDER_LABELS: Record<string, string> = {
  libre: 'Libre', masculino: 'Masculino', femenino: 'Femenino', mixto: 'Mixto',
};

// ── Pill toggle ──────────────────────────────────────────────────────────────

function Toggle({ on, onChange, labelOn = 'Activado', labelOff = 'Desactivado' }: {
  on: boolean; onChange: (v: boolean) => void; labelOn?: string; labelOff?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer',
        border: '1px solid', borderColor: on ? 'var(--turf-green)' : 'var(--grey-200)',
        background: on ? 'rgba(34,197,94,0.08)' : '#fff', color: on ? '#15803d' : 'var(--grey-500)',
        fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
      }}
    >
      <span style={{
        width: 30, height: 16, borderRadius: 9, background: on ? 'var(--turf-green)' : 'var(--grey-300)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 16 : 2, width: 12, height: 12, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
        }} />
      </span>
      {on ? labelOn : labelOff}
    </button>
  );
}

function num(v: string, fallback = 0): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

// ── Score parameters per phase (Clasificación / Eliminatoria) ─────────────────
// The score *type* (traditional vs points) is shared; only these params differ per phase.

const DEUCE_OPTIONS: { v: DeuceRule; label: string; desc: string }[] = [
  { v: 'ventaja', label: 'Ventaja Tradicional', desc: 'D y AD hasta que un equipo gane 2 puntos consecutivos.' },
  { v: 'oro',     label: 'Punto de Oro',        desc: 'El siguiente punto en Deuce gana el game.' },
  { v: 'plata',   label: 'Punto de Plata',      desc: 'Ventaja al primero en puntuar en Deuce. Si la pierde, vuelve a Deuce.' },
  { v: 'ipf',     label: 'IPF',                 desc: 'Punto de Oro federado. El siguiente punto gana.' },
];

function pickBtn(active: boolean): React.CSSProperties {
  return {
    border: `2px solid ${active ? 'var(--black)' : 'var(--grey-200)'}`,
    background: active ? 'var(--black)' : '#fff',
    color: active ? '#fff' : 'var(--black)',
    cursor: 'pointer',
  };
}

function ScorePhaseEditor({ scoreType, value, onChange }: {
  scoreType: 'traditional' | 'points';
  value: ScorePhaseConfig;
  onChange: (v: ScorePhaseConfig) => void;
}) {
  if (scoreType === 'points') {
    return (
      <div>
        <label style={lbl}>Puntos objetivo</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[16, 24, 32].map(n => (
            <button key={n} type="button" onClick={() => onChange({ ...value, target: n })}
              style={{ width: 58, height: 48, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, ...pickBtn(value.target === n) }}>
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={lbl}>Sets por partido</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3].map(n => (
            <button key={n} type="button" onClick={() => onChange({ ...value, sets: n })}
              style={{ flex: 1, padding: '12px 8px', textAlign: 'center', ...pickBtn(value.sets === n) }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3, color: value.sets === n ? 'rgba(255,255,255,0.55)' : 'var(--grey-400)' }}>
                {n === 1 ? 'set' : n === 2 ? 'sets (tb)' : 'best of 3'}
              </div>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 6 }}>
          {value.sets === 2 ? 'Si cada equipo gana 1 set, se juega tiebreak para desempatar.' : value.sets === 3 ? 'Gana el primero en ganar 2 sets.' : 'El que gana el set, gana el partido.'}
        </div>
      </div>
      <div>
        <label style={lbl}>Games por set</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[4, 5, 6].map(n => (
            <button key={n} type="button" onClick={() => onChange({ ...value, gamesPerSet: n })}
              style={{ width: 48, height: 42, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, ...pickBtn(value.gamesPerSet === n) }}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={lbl}>Tiebreak a</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 10].map(n => (
            <button key={n} type="button" onClick={() => onChange({ ...value, tiebreak: n })}
              style={{ width: 52, height: 42, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, ...pickBtn(value.tiebreak === n) }}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={lbl}>Regla de Deuce / Ventaja</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DEUCE_OPTIONS.map(o => {
            const active = value.deuce === o.v;
            return (
              <button key={o.v} type="button" onClick={() => onChange({ ...value, deuce: o.v })}
                style={{ padding: '10px 14px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10, border: `1px solid ${active ? 'var(--black)' : 'var(--grey-200)'}`, background: active ? '#111' : '#fff', color: active ? '#fff' : 'var(--black)' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${active ? 'var(--neon)' : 'var(--grey-300)'}`, background: active ? 'var(--neon)' : 'transparent', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{o.label}</div>
                  <div style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.5)' : 'var(--grey-400)', lineHeight: 1.4 }}>{o.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ControlPanelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const { user: currentUser } = useCurrentUser();

  const [tournament, setTournament] = useState<PersonalizadoTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable state
  const [date, setDate] = useState('');
  const [categories, setCategories] = useState<PersonalizadoCategory[]>([]);
  const [config, setConfig] = useState<ControlPanelConfig>(DEFAULT_CONTROL_CONFIG);
  const [teams, setTeams] = useState<PersonalizadoTeam[]>([]);

  // SA base age categories (quick-pick for child tournaments)
  const [baseMinorCats, setBaseMinorCats] = useState<MinorCategory[]>([]);
  useEffect(() => { setBaseMinorCats(getMinorCategories()); }, []);

  // Co-creator management (creator only)
  const [coSearch, setCoSearch] = useState('');
  const [coResults, setCoResults] = useState<RegisteredPlayer[]>([]);
  useEffect(() => {
    setCoResults(coSearch.trim().length >= 2 ? searchPlayers(coSearch).slice(0, 6) : []);
  }, [coSearch]);

  useEffect(() => {
    let active = true;
    loadPersonalizadoById(id).then(t => {
      if (!active || !t) { if (active) setLoading(false); return; }
      setTournament(t);
      setDate(t.date ?? '');
      setCategories(t.categories.map((c, i) => ({ ...c, level: c.level ?? i })));
      setTeams(t.teams);
      // Merge stored config with defaults, and ensure a group config row per category.
      const base: ControlPanelConfig = { ...DEFAULT_CONTROL_CONFIG, ...(t.config ?? {}) };
      const groups: CategoryGroupConfig[] = t.categories.map(cat => {
        const existing = (t.config?.groups ?? []).find(g => g.categoryId === cat.id);
        if (existing) {
          // Backfill groupCount for rows saved before the field existed (avoids NaN).
          const groupCount = existing.groupCount && existing.groupCount > 0
            ? existing.groupCount
            : groupCountFromTeamsPerGroup(cat.maxTeams, existing.teamsPerGroup || teamsPerGroupFromCount(cat.maxTeams, Math.max(1, Math.round(cat.maxTeams / 4))));
          return { ...existing, groupCount };
        }
        const groupCount = Math.max(1, Math.round(cat.maxTeams / 4));
        return { categoryId: cat.id, groupCount, teamsPerGroup: teamsPerGroupFromCount(cat.maxTeams, groupCount), qualifyPerGroup: 2 };
      });
      const courtNames = (base.courtNames && base.courtNames.length > 0)
        ? base.courtNames
        : Array.from({ length: t.courts || 2 }, (_, i) => `Cancha ${i + 1}`);
      // Normalize per-phase score params (backfill new fields) and derive the shared score type,
      // honoring any legacy per-phase scoreType that was stored before the model changed.
      const legacyType = (t.config?.scoreQualification as { scoreType?: 'traditional' | 'points' } | undefined)?.scoreType;
      const scoreType = base.scoreType ?? legacyType ?? 'traditional';
      const normPhase = (p?: Partial<ScorePhaseConfig>): ScorePhaseConfig => ({
        sets: p?.sets ?? DEFAULT_SCORE_PHASE.sets,
        gamesPerSet: p?.gamesPerSet ?? DEFAULT_SCORE_PHASE.gamesPerSet,
        tiebreak: p?.tiebreak ?? DEFAULT_SCORE_PHASE.tiebreak,
        deuce: p?.deuce ?? DEFAULT_SCORE_PHASE.deuce,
        target: p?.target ?? DEFAULT_SCORE_PHASE.target,
      });
      setConfig({
        ...base, groups, courtNames, scoreType,
        scoreQualification: normPhase(base.scoreQualification),
        scoreElimination: normPhase(base.scoreElimination),
      });
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  // Assignable teams = confirmed or pending (not rejected/waitlisted)
  const assignable = useMemo(
    () => teams.filter(t => t.status === 'pending' || t.status === 'confirmed'),
    [teams],
  );

  function patchConfig(patch: Partial<ControlPanelConfig>) {
    setConfig(prev => ({ ...prev, ...patch }));
  }
  function patchSchedule(patch: Partial<ControlPanelConfig['schedule']>) {
    setConfig(prev => ({ ...prev, schedule: { ...prev.schedule, ...patch } }));
  }
  function patchGroup(categoryId: string, patch: Partial<CategoryGroupConfig>) {
    setConfig(prev => ({
      ...prev,
      groups: prev.groups.map(g => g.categoryId === categoryId ? { ...g, ...patch } : g),
    }));
  }
  function setCategoryMax(categoryId: string, maxTeams: number) {
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, maxTeams } : c));
    const g = config.groups.find(x => x.categoryId === categoryId);
    if (g) patchGroup(categoryId, { teamsPerGroup: teamsPerGroupFromCount(maxTeams, g.groupCount) });
  }
  function setCategoryLevel(categoryId: string, level: number) {
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, level } : c));
  }
  function setCategoryMaxAge(categoryId: string, maxAge: number | undefined) {
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, maxAge } : c));
  }
  function addCoCreator(playerId: string) {
    if (!playerId) return;
    const current = config.coCreatorIds ?? [];
    if (current.includes(playerId) || playerId === tournament?.creatorId) return;
    patchConfig({ coCreatorIds: [...current, playerId] });
    setCoSearch(''); setCoResults([]);
  }
  function removeCoCreator(playerId: string) {
    patchConfig({ coCreatorIds: (config.coCreatorIds ?? []).filter(pid => pid !== playerId) });
  }
  function setGroupCount(cat: PersonalizadoCategory, groupCount: number) {
    patchGroup(cat.id, { groupCount: Math.max(1, groupCount), teamsPerGroup: teamsPerGroupFromCount(cat.maxTeams, Math.max(1, groupCount)) });
  }
  function setTeamsPerGroup(cat: PersonalizadoCategory, teamsPerGroup: number) {
    const tpg = Math.max(2, teamsPerGroup);
    patchGroup(cat.id, { teamsPerGroup: tpg, groupCount: groupCountFromTeamsPerGroup(cat.maxTeams, tpg) });
  }

  // ── Court name editing ──────────────────────────────────────────────────────
  function setCourtCount(n: number) {
    setConfig(prev => {
      const names = [...prev.courtNames];
      if (n > names.length) {
        for (let i = names.length; i < n; i++) names.push(`Cancha ${i + 1}`);
      } else {
        names.length = n;
      }
      return { ...prev, courtNames: names };
    });
  }
  function setCourtName(idx: number, name: string) {
    setConfig(prev => ({ ...prev, courtNames: prev.courtNames.map((c, i) => i === idx ? name : c) }));
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave(markConfigured: boolean) {
    if (!tournament) return;
    setSaving(true);
    const groupAssignments: Record<string, string | null> = {};
    for (const t of teams) groupAssignments[t.id] = t.groupId ?? null;
    const res = await saveControlPanel({
      id: tournament.id,
      categories,
      config,
      date,
      status: markConfigured ? 'configured' : undefined,
      groupAssignments,
    });
    setSaving(false);
    if (!res.ok) { showToast(res.error ?? 'No se pudo guardar', 'error'); return; }
    if (res.teams) setTeams(res.teams);
    showToast(markConfigured ? 'Torneo configurado' : 'Configuración guardada', 'success');
    if (markConfigured) router.push(`/dashboard/player/tournaments/personalizado/${id}`);
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--grey-400)', fontSize: 14 }}>Cargando…</div>;
  if (!tournament) {
    return (
      <div style={{ padding: '40px clamp(16px, 4vw, 40px) 80px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--grey-500)' }}>Torneo no encontrado.</div>
      </div>
    );
  }

  const liveTournament: PersonalizadoTournament = { ...tournament, date, categories, teams };
  const estimate = estimateTournamentDays(liveTournament, config);

  const block = (title: string, body: React.ReactNode, num: number) => (
    <div style={card}>
      <div style={{ ...secTitle, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 20, height: 20, borderRadius: '50%', background: 'var(--black)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
        }}>{num}</span>
        {title}
      </div>
      {body}
    </div>
  );

  return (
    <div style={{ padding: '40px clamp(16px, 4vw, 40px) 120px', maxWidth: 1000, margin: '0 auto' }}>
      <Link
        href={`/dashboard/player/tournaments/personalizado/${id}`}
        style={{ fontSize: 11, color: 'var(--grey-400)', textDecoration: 'none', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}
      >
        ← Volver al torneo
      </Link>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
          Panel de Control
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
          {tournament.name}
        </h1>
      </div>

      {/* 1 — Horario y Duración */}
      {block('Horario y Duración', (
        <div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
            <div><label style={lbl}>Fecha de inicio</label>
              <input type="date" value={date} style={inp} onChange={e => setDate(e.target.value)} /></div>
            <div><label style={lbl}>Fecha estimada de culminación</label>
              <input type="date" value={config.schedule.endDate ?? estimate.suggestedEndDate} style={inp}
                onChange={e => patchSchedule({ endDate: e.target.value })} /></div>
            <button type="button" onClick={() => patchSchedule({ endDate: estimate.suggestedEndDate })}
              style={{ padding: '9px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', border: '1px solid var(--grey-200)', background: '#fff', cursor: 'pointer', color: 'var(--grey-500)', whiteSpace: 'nowrap' }}>
              Usar sugerencia ({estimate.days} {estimate.days === 1 ? 'día' : 'días'})
            </button>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
            <div><label style={lbl}>Hora de inicio</label>
              <input type="time" value={config.schedule.startTime} style={inp}
                onChange={e => patchSchedule({ startTime: e.target.value })} /></div>
            <div><label style={lbl}>Hora de culminación</label>
              <input type="time" value={config.schedule.endTime ?? '21:00'} style={inp}
                onChange={e => patchSchedule({ endTime: e.target.value })} /></div>
            <div><label style={lbl}>Min. por partido</label>
              <input type="number" min={10} value={config.schedule.matchDurationMin} style={numInp}
                onChange={e => patchSchedule({ matchDurationMin: num(e.target.value, 50) })} /></div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <Toggle on={config.schedule.lunchEnabled} onChange={v => patchSchedule({ lunchEnabled: v })}
              labelOn="Con receso de almuerzo" labelOff="Sin receso" />
          </div>
          {config.schedule.lunchEnabled && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
              <div><label style={lbl}>Inicio del receso</label>
                <input type="time" value={config.schedule.lunchStart ?? '13:00'} style={inp}
                  onChange={e => patchSchedule({ lunchStart: e.target.value })} /></div>
              <div><label style={lbl}>Duración (min)</label>
                <input type="number" min={0} value={config.schedule.lunchDurationMin ?? 60} style={numInp}
                  onChange={e => patchSchedule({ lunchDurationMin: num(e.target.value, 60) })} /></div>
            </div>
          )}

          <div style={{ fontSize: 13, color: 'var(--grey-500)', padding: '12px 14px', background: 'var(--grey-50, #fafafa)', border: '1px solid var(--grey-100)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--black)' }}>{estimate.totalMatches}</strong> partidos estimados (grupos + eliminatoria) ·{' '}
            <strong style={{ color: 'var(--black)' }}>{estimate.matchesPerDay}</strong> partidos/día con la configuración actual ·{' '}
            recomendación: <strong style={{ color: 'var(--black)' }}>{estimate.days} {estimate.days === 1 ? 'día' : 'días'}</strong> (hasta {estimate.suggestedEndDate}).
            <div style={{ marginTop: 6, color: 'var(--grey-400)' }}>
              El calendario detallado (rondas niveladas entre categorías, novatos primero, finales cerca del cierre) se genera en{' '}
              <Link href={`/dashboard/player/tournaments/personalizado/${id}/schedule`} style={{ color: 'var(--grey-500)', fontWeight: 700 }}>Calendario</Link>.
            </div>
          </div>
        </div>
      ), 1)}

      {/* 2 — Equipos y Grupos */}
      {block('Equipos y Grupos', (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 2 }}>
            Editable hasta que comience el torneo. &quot;Nivel&quot; ordena las categorías en el calendario (las más principiantes juegan primero en el día).
          </div>
          {categories.map(cat => {
            const enrolled = assignable.filter(t => t.categoryId === cat.id).length;
            const g = config.groups.find(x => x.categoryId === cat.id)!;
            const totalQualifiers = g.groupCount * g.qualifyPerGroup;
            const balancedSize = nextPowerOfTwo(totalQualifiers);
            return (
              <div key={cat.id} style={{ padding: '14px 16px', border: '1px solid var(--grey-100)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                  {cat.name} <span style={{ color: 'var(--grey-400)', fontWeight: 400 }}>· {GENDER_LABELS[cat.gender]} · {enrolled} inscritos</span>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}>
                  <div><label style={lbl}>Máx. equipos</label>
                    <input type="number" min={enrolled} value={cat.maxTeams} style={numInp}
                      onChange={e => setCategoryMax(cat.id, num(e.target.value, cat.maxTeams))} /></div>
                  <div><label style={lbl}>Nivel</label>
                    <input type="number" value={cat.level ?? 0} style={numInp}
                      onChange={e => setCategoryLevel(cat.id, num(e.target.value, cat.level ?? 0))} /></div>
                  <div><label style={lbl}>Cantidad de grupos</label>
                    <input type="number" min={1} value={g.groupCount} style={numInp}
                      onChange={e => setGroupCount(cat, num(e.target.value, g.groupCount))} /></div>
                  <div><label style={lbl}>Equipos por grupo</label>
                    <input type="number" min={2} value={g.teamsPerGroup} style={numInp}
                      onChange={e => setTeamsPerGroup(cat, num(e.target.value, g.teamsPerGroup))} /></div>
                  <div><label style={lbl}>Clasifican por grupo</label>
                    <input type="number" min={1} value={g.qualifyPerGroup} style={numInp}
                      onChange={e => patchGroup(cat.id, { qualifyPerGroup: num(e.target.value, g.qualifyPerGroup) })} /></div>
                </div>
                {config.isChildTournament && (
                  <div style={{ marginBottom: 10, padding: '10px 12px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div>
                        <label style={lbl}>Edad máxima (menores de)</label>
                        <input type="number" min={4} max={18} value={cat.maxAge ?? ''} placeholder="—" style={numInp}
                          onChange={e => setCategoryMaxAge(cat.id, e.target.value === '' ? undefined : num(e.target.value, 0))} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 2 }}>
                        {baseMinorCats.map(mc => (
                          <button key={mc.id} type="button" onClick={() => setCategoryMaxAge(cat.id, mc.maxAge)}
                            style={{
                              fontSize: 10, fontWeight: 700, padding: '6px 10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
                              border: `1px solid ${cat.maxAge === mc.maxAge ? 'var(--turf-green)' : 'var(--grey-200)'}`,
                              background: cat.maxAge === mc.maxAge ? 'rgba(34,197,94,0.12)' : '#fff',
                              color: cat.maxAge === mc.maxAge ? '#15803d' : 'var(--grey-500)',
                            }}>
                            {mc.name} &lt;{mc.maxAge}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 8, lineHeight: 1.5 }}>
                      Edad calculada al 1 de enero del año del torneo. Un jugador puede competir en categorías superiores (mayor edad) pero no inferiores.
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--grey-500)' }}>
                  → <strong>{totalQualifiers}</strong> clasificados directos
                  {balancedSize > totalQualifiers ? (
                    <> · el sistema completará con los <strong>{balancedSize - totalQualifiers}</strong> mejores siguientes de la tabla general para balancear el bracket a <strong>{balancedSize}</strong></>
                  ) : balancedSize > 0 ? (
                    <> · bracket balanceado de <strong>{balancedSize}</strong></>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ), 2)}

      {/* 3 — Tipo de Score por Fase */}
      {block('Tipo de Score por Fase', (
        <div>
          {/* Shared score-type toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {([{ v: 'points', label: 'Por Puntos' }, { v: 'traditional', label: 'Tradicional (sets)' }] as const).map(o => (
              <button key={o.v} type="button" onClick={() => patchConfig({ scoreType: o.v })}
                style={{
                  padding: '10px 18px', border: `2px solid ${config.scoreType === o.v ? 'var(--black)' : 'var(--grey-200)'}`,
                  background: config.scoreType === o.v ? 'var(--black)' : '#fff', color: config.scoreType === o.v ? '#fff' : 'var(--black)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                {o.label}
              </button>
            ))}
          </div>

          {/* Two phases side by side: Clasificación (Grupos) / Eliminatoria (Cuadro) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            <div style={{ borderRight: '1px solid var(--grey-100)', paddingRight: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--grey-100)' }}>
                Fase I — Clasificación (Grupos)
              </div>
              <ScorePhaseEditor scoreType={config.scoreType} value={config.scoreQualification} onChange={v => patchConfig({ scoreQualification: v })} />
            </div>
            <div style={{ paddingLeft: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--grey-100)' }}>
                Fase II — Eliminatoria (Cuadro)
              </div>
              <ScorePhaseEditor scoreType={config.scoreType} value={config.scoreElimination} onChange={v => patchConfig({ scoreElimination: v })} />
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 14 }}>
            Editable en cualquier momento antes de que comience cada fase.
          </div>
        </div>
      ), 3)}

      {/* 4 — Reglas Generales del Torneo */}
      {block('Reglas Generales del Torneo', (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 12, lineHeight: 1.6 }}>
              Los equipos son <strong>fijos</strong>. Activa la sustitución para permitir reemplazar a un jugador
              lesionado durante el torneo. Si está desactivada, un retiro por lesión elimina al equipo.
            </div>
            <Toggle
              on={config.substitutionEnabled}
              onChange={v => patchConfig({ substitutionEnabled: v })}
              labelOn="Torneo con sustitución" labelOff="Sin sustitución"
            />
          </div>

          <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--black)', marginBottom: 12 }}>Participantes familiares</div>
            <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 12, lineHeight: 1.6 }}>
              Permite a un responsable inscribir a un familiar menor (sin cuenta) en este torneo.
            </div>
            <Toggle
              on={config.acceptsFamilyMembers ?? false}
              onChange={v => patchConfig({ acceptsFamilyMembers: v })}
              labelOn="Acepta participantes familiares (menores)" labelOff="Solo cuentas propias"
            />
          </div>

          <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--black)', marginBottom: 12 }}>Torneo infantil (menores)</div>
            <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 12, lineHeight: 1.6 }}>
              Al activarlo, define la edad máxima por categoría arriba (Equipos y Grupos) y el sistema valida la edad de cada inscrito al 1 de enero del año del torneo.
            </div>
            <Toggle
              on={config.isChildTournament ?? false}
              onChange={v => patchConfig({ isChildTournament: v })}
              labelOn="Torneo infantil" labelOff="Torneo de adultos"
            />
          </div>

          {currentUser && tournament.creatorId === currentUser.id && (
            <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--black)', marginBottom: 12 }}>Co-creadores</div>
              <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 12, lineHeight: 1.6 }}>
                Los co-creadores pueden ayudarte a gestionar el torneo (grupos, calendario, resultados, bracket). No pueden eliminar el torneo ni gestionar otros co-creadores.
              </div>
              {(config.coCreatorIds ?? []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {(config.coCreatorIds ?? []).map(pid => {
                    const p = getPlayer(pid);
                    return (
                      <div key={pid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 12px', border: '1px solid var(--grey-100)' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{p?.name ?? pid}</div>
                          <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{p?.shortId ?? p?.email ?? pid}</div>
                        </div>
                        <button type="button" onClick={() => removeCoCreator(pid)}
                          style={{ fontSize: 10, fontWeight: 700, padding: '5px 10px', cursor: 'pointer', border: '1px solid var(--grey-200)', background: '#fff', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Quitar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <input value={coSearch} onChange={e => setCoSearch(e.target.value)} placeholder="Buscar jugador por nombre, email o #ID…" style={inp} />
              {coResults.length > 0 && (
                <div style={{ border: '1px solid var(--grey-200)', borderTop: 'none' }}>
                  {coResults.map(p => {
                    const added = (config.coCreatorIds ?? []).includes(p.id) || p.id === tournament.creatorId;
                    return (
                      <button key={p.id} type="button" onClick={() => addCoCreator(p.id)} disabled={added}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 12px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--grey-100)', cursor: added ? 'default' : 'pointer' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: added ? 'var(--grey-400)' : 'var(--black)' }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{p.shortId} · #{p.ranking}</div>
                        </div>
                        {added && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--turf-green)', textTransform: 'uppercase' }}>{p.id === tournament.creatorId ? 'Creador' : 'Añadido'}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--black)', marginBottom: 12 }}>Tabla de puntos (clasificación de grupos)</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div><label style={lbl}>Victoria</label>
                <input type="number" value={config.standingsPoints.win} style={numInp}
                  onChange={e => patchConfig({ standingsPoints: { ...config.standingsPoints, win: num(e.target.value) } })} /></div>
              <div><label style={lbl}>Empate</label>
                <input type="number" value={config.standingsPoints.draw} style={numInp}
                  onChange={e => patchConfig({ standingsPoints: { ...config.standingsPoints, draw: num(e.target.value) } })} /></div>
              <div><label style={lbl}>Derrota</label>
                <input type="number" value={config.standingsPoints.loss} style={numInp}
                  onChange={e => patchConfig({ standingsPoints: { ...config.standingsPoints, loss: num(e.target.value) } })} /></div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 10, lineHeight: 1.5 }}>
              Los desempates usan la diferencia de juegos/puntos (a favor − en contra) registrada en cada partido.
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--black)', marginBottom: 12 }}>Forfeit / Retiro por lesión</div>
            <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 12, lineHeight: 1.6 }}>
              Define qué recibe el equipo rival cuando el otro no se presenta o se retira. El equipo que abandona recibe 0 puntos.
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div><label style={lbl}>Puntos al rival</label>
                <input type="number" value={config.forfeit.winnerPoints} style={numInp}
                  onChange={e => patchConfig({ forfeit: { ...config.forfeit, winnerPoints: num(e.target.value) } })} /></div>
              <div><label style={lbl}>Juegos a favor del rival</label>
                <input type="number" value={config.forfeit.winnerGamesFor} style={numInp}
                  onChange={e => patchConfig({ forfeit: { ...config.forfeit, winnerGamesFor: num(e.target.value) } })} /></div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 10, lineHeight: 1.5 }}>
              Ej: {config.forfeit.winnerPoints} pts y {config.forfeit.winnerGamesFor} juegos a favor
              {config.forfeit.winnerGamesFor === 0 ? ' (no se jugó ningún set).' : ' (como si hubiese ganado los sets).'}
            </div>
          </div>
        </div>
      ), 4)}

      {/* 5 — Canchas */}
      {block('Canchas Disponibles', (
        <div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Número de canchas</label>
            <input type="number" min={1} value={config.courtNames.length} style={numInp}
              onChange={e => setCourtCount(Math.max(1, num(e.target.value, 1)))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {config.courtNames.map((name, i) => (
              <div key={i}>
                <label style={lbl}>Cancha {i + 1}</label>
                <input value={name} style={inp} onChange={e => setCourtName(i, e.target.value)} placeholder={`Cancha ${i + 1}`} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 10 }}>
            Editable durante el torneo. El sistema reajusta sus recomendaciones de programación.
          </div>
        </div>
      ), 5)}

      {/* Save bar */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => handleSave(false)} disabled={saving}
          style={{ padding: '12px 24px', border: '1px solid var(--grey-300)', background: '#fff', color: 'var(--black)', cursor: saving ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
        <button type="button" onClick={() => handleSave(true)} disabled={saving}
          style={{ padding: '12px 28px', border: 'none', background: 'var(--black)', color: 'var(--neon)', cursor: saving ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {saving ? 'Guardando…' : 'Guardar y marcar configurado'}
        </button>
      </div>
    </div>
  );
}
