'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  loadPersonalizadoById,
  saveControlPanel,
  DEFAULT_CONTROL_CONFIG,
  type PersonalizadoTournament,
  type PersonalizadoTeam,
  type PersonalizadoCategory,
  type ControlPanelConfig,
  type CategoryGroupConfig,
} from '@/lib/personalizado-store';
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
const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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

// ── Group-count helper ───────────────────────────────────────────────────────

function groupCount(teamsInCategory: number, teamsPerGroup: number): number {
  if (teamsPerGroup <= 0) return 0;
  return Math.max(1, Math.ceil(teamsInCategory / teamsPerGroup));
}

// ── Schedule end-time estimate ───────────────────────────────────────────────

function estimateEndTime(cfg: ControlPanelConfig, totalMatches: number, courts: number): string {
  if (!cfg.schedule.startTime || courts <= 0) return '—';
  const [h, m] = cfg.schedule.startTime.split(':').map(Number);
  let minutes = h * 60 + m;
  const waves = Math.ceil(totalMatches / courts);
  minutes += waves * (cfg.schedule.matchDurationMin || 50);
  if (cfg.schedule.lunchEnabled) minutes += cfg.schedule.lunchDurationMin || 0;
  minutes = Math.min(minutes, 23 * 60 + 59);
  const eh = Math.floor(minutes / 60), em = minutes % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ControlPanelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();

  const [tournament, setTournament] = useState<PersonalizadoTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable state
  const [categories, setCategories] = useState<PersonalizadoCategory[]>([]);
  const [config, setConfig] = useState<ControlPanelConfig>(DEFAULT_CONTROL_CONFIG);
  const [teams, setTeams] = useState<PersonalizadoTeam[]>([]);

  useEffect(() => {
    let active = true;
    loadPersonalizadoById(id).then(t => {
      if (!active || !t) { if (active) setLoading(false); return; }
      setTournament(t);
      setCategories(t.categories);
      setTeams(t.teams);
      // Merge stored config with defaults, and ensure a group config row per category.
      const base: ControlPanelConfig = { ...DEFAULT_CONTROL_CONFIG, ...(t.config ?? {}) };
      const groups: CategoryGroupConfig[] = t.categories.map(cat => {
        const existing = (t.config?.groups ?? []).find(g => g.categoryId === cat.id);
        return existing ?? { categoryId: cat.id, teamsPerGroup: 4, qualifyPerGroup: 2 };
      });
      const courtNames = (base.courtNames && base.courtNames.length > 0)
        ? base.courtNames
        : Array.from({ length: t.courts || 2 }, (_, i) => `Cancha ${i + 1}`);
      setConfig({ ...base, groups, courtNames });
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

  // ── Drag & drop group assignment ────────────────────────────────────────────
  const [dragTeam, setDragTeam] = useState<string | null>(null);

  function assignTeamToGroup(teamId: string, groupId: string | null) {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, groupId: groupId ?? undefined } : t));
  }

  function autoDistribute(categoryId: string, groups: string[]) {
    if (groups.length === 0) return;
    const catTeams = assignable.filter(t => t.categoryId === categoryId);
    setTeams(prev => {
      const next = [...prev];
      catTeams.forEach((t, i) => {
        const gid = groups[i % groups.length];
        const idx = next.findIndex(x => x.id === t.id);
        if (idx >= 0) next[idx] = { ...next[idx], groupId: gid };
      });
      return next;
    });
  }

  function clearGroups(categoryId: string) {
    setTeams(prev => prev.map(t => t.categoryId === categoryId ? { ...t, groupId: undefined } : t));
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
      <div style={{ padding: '40px 40px 80px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--grey-500)' }}>Torneo no encontrado.</div>
      </div>
    );
  }

  // Totals for the schedule estimate (group-stage round-robin matches).
  const totalGroupMatches = config.groups.reduce((sum, g) => {
    const catTeams = assignable.filter(t => t.categoryId === g.categoryId).length;
    const groups = groupCount(catTeams, g.teamsPerGroup);
    const perGroup = Math.ceil(catTeams / Math.max(1, groups));
    // round-robin matches in a group of `perGroup` teams
    return sum + groups * (perGroup * (perGroup - 1)) / 2;
  }, 0);
  const totalQualifiers = config.groups.reduce((sum, g) => {
    const catTeams = assignable.filter(t => t.categoryId === g.categoryId).length;
    const groups = groupCount(catTeams, g.teamsPerGroup);
    return sum + groups * g.qualifyPerGroup;
  }, 0);
  const estimatedEnd = estimateEndTime(config, totalGroupMatches, config.courtNames.length || tournament.courts);

  const block = (title: string, body: React.ReactNode, letter: string) => (
    <div style={card}>
      <div style={{ ...secTitle, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 20, height: 20, borderRadius: '50%', background: 'var(--black)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
        }}>{letter}</span>
        {title}
      </div>
      {body}
    </div>
  );

  return (
    <div style={{ padding: '40px 40px 120px', maxWidth: 1000, margin: '0 auto' }}>
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
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
          {tournament.name}
        </h1>
      </div>

      {/* A — Sustitución */}
      {block('Equipos y Sustitución', (
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
      ), 'A')}

      {/* B — Máx equipos por categoría */}
      {block('Máximo de equipos por categoría', (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4 }}>
            Editable hasta que comience el torneo. Aumentarlo promueve equipos desde la lista de espera.
          </div>
          {categories.map(cat => {
            const enrolled = assignable.filter(t => t.categoryId === cat.id).length;
            return (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', border: '1px solid var(--grey-100)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{cat.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{GENDER_LABELS[cat.gender]} · {enrolled} inscritos</div>
                </div>
                <input type="number" min={enrolled} value={cat.maxTeams} style={numInp}
                  onChange={e => setCategoryMax(cat.id, num(e.target.value, cat.maxTeams))} />
              </div>
            );
          })}
        </div>
      ), 'B')}

      {/* C — Tipo de Score */}
      {block('Tipo de Score', (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['traditional', 'points'] as const).map(s => (
              <button key={s} type="button" onClick={() => patchConfig({ scoreType: s })}
                style={{
                  padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
                  border: '1px solid', borderColor: config.scoreType === s ? 'var(--black)' : 'var(--grey-200)',
                  background: config.scoreType === s ? 'var(--black)' : '#fff', color: config.scoreType === s ? '#fff' : 'var(--grey-500)',
                }}>
                {s === 'traditional' ? 'Tradicional (sets/games)' : 'Por puntos'}
              </button>
            ))}
          </div>
          {config.scoreType === 'points' && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={lbl}>Puntos por set</label>
                <input type="number" min={1} value={config.pointsPerSet ?? 16} style={numInp}
                  onChange={e => patchConfig({ pointsPerSet: num(e.target.value, 16) })} />
              </div>
              <div>
                <label style={lbl}>N° de sets</label>
                <input type="number" min={1} value={config.sets ?? 2} style={numInp}
                  onChange={e => patchConfig({ sets: num(e.target.value, 2) })} />
              </div>
              <div>
                <label style={lbl}>Puntos 3er set (0 = no)</label>
                <input type="number" min={0} value={config.thirdSetPoints ?? 0} style={numInp}
                  onChange={e => patchConfig({ thirdSetPoints: num(e.target.value, 0) })} />
              </div>
            </div>
          )}
        </div>
      ), 'C')}

      {/* D — Tabla de puntos */}
      {block('Tabla de puntos (clasificación de grupos)', (
        <div>
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
      ), 'D')}

      {/* E — Forfeit / Retiro */}
      {block('Forfeit / Retiro por lesión', (
        <div>
          <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 12, lineHeight: 1.6 }}>
            Define qué recibe el equipo rival cuando el otro no se presenta o se retira. El equipo que abandona
            recibe 0 puntos.
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
      ), 'E')}

      {/* F — Grupos por categoría */}
      {block('Estructura de grupos', (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map(cat => {
            const g = config.groups.find(x => x.categoryId === cat.id)!;
            const catTeams = assignable.filter(t => t.categoryId === cat.id).length;
            const groups = groupCount(catTeams, g.teamsPerGroup);
            return (
              <div key={cat.id} style={{ padding: '12px 14px', border: '1px solid var(--grey-100)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{cat.name} <span style={{ color: 'var(--grey-400)', fontWeight: 400 }}>· {catTeams} equipos</span></div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div><label style={lbl}>Equipos por grupo</label>
                    <input type="number" min={2} value={g.teamsPerGroup} style={numInp}
                      onChange={e => patchGroup(cat.id, { teamsPerGroup: num(e.target.value, g.teamsPerGroup) })} /></div>
                  <div><label style={lbl}>Clasifican por grupo</label>
                    <input type="number" min={1} value={g.qualifyPerGroup} style={numInp}
                      onChange={e => patchGroup(cat.id, { qualifyPerGroup: num(e.target.value, g.qualifyPerGroup) })} /></div>
                  <div style={{ fontSize: 12, color: 'var(--grey-500)', paddingBottom: 9 }}>
                    → <strong>{groups}</strong> {groups === 1 ? 'grupo' : 'grupos'} · <strong>{groups * g.qualifyPerGroup}</strong> clasificados
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ), 'F')}

      {/* G — Bracket */}
      {block('Fase final: bracket eliminatorio', (
        <div style={{ fontSize: 13, color: 'var(--grey-500)', lineHeight: 1.7 }}>
          Al terminar la fase de grupos, los <strong>{totalQualifiers}</strong> equipos clasificados entran a un
          bracket de eliminación directa (estilo Copa del Mundo). El cruce se calcula automáticamente
          (1º de grupo vs 2º de otro grupo) según la cantidad de clasificados. No requiere configuración manual.
        </div>
      ), 'G')}

      {/* H — Canchas */}
      {block('Canchas', (
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
      ), 'H')}

      {/* I — Horario */}
      {block('Horario', (
        <div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
            <div><label style={lbl}>Hora de inicio</label>
              <input type="time" value={config.schedule.startTime} style={inp}
                onChange={e => patchSchedule({ startTime: e.target.value })} /></div>
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
          <div style={{ fontSize: 13, color: 'var(--grey-500)', padding: '10px 12px', background: 'var(--grey-50, #fafafa)', border: '1px solid var(--grey-100)' }}>
            Fin estimado del día: <strong style={{ color: 'var(--black)' }}>{estimatedEnd}</strong>
            <span style={{ color: 'var(--grey-400)' }}> · {totalGroupMatches} partidos de grupos en {config.courtNames.length || tournament.courts} canchas</span>
          </div>
        </div>
      ), 'I')}

      {/* J — Drag & drop grupos */}
      {block('Organización de grupos (arrastra y suelta)', (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {categories.map(cat => {
            const g = config.groups.find(x => x.categoryId === cat.id)!;
            const catTeams = assignable.filter(t => t.categoryId === cat.id);
            const groups = groupCount(catTeams.length, g.teamsPerGroup);
            const groupIds = Array.from({ length: groups }, (_, i) => `${cat.id}-G${i + 1}`);
            const unassigned = catTeams.filter(t => !t.groupId || !groupIds.includes(t.groupId));
            return (
              <div key={cat.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{cat.name}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => autoDistribute(cat.id, groupIds)}
                      style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', cursor: 'pointer', border: '1px solid var(--grey-200)', background: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Distribuir automáticamente
                    </button>
                    <button type="button" onClick={() => clearGroups(cat.id)}
                      style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', cursor: 'pointer', border: '1px solid var(--grey-200)', background: '#fff', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Vaciar
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(180px, 1fr))`, gap: 10 }}>
                  {/* Unassigned column */}
                  <DropColumn
                    title="Sin asignar" accent="var(--grey-300)" count={unassigned.length}
                    onDrop={() => { if (dragTeam) { assignTeamToGroup(dragTeam, null); setDragTeam(null); } }}
                  >
                    {unassigned.map(t => (
                      <TeamChip key={t.id} team={t} onDragStart={() => setDragTeam(t.id)} />
                    ))}
                  </DropColumn>
                  {/* Group columns */}
                  {groupIds.map((gid, i) => {
                    const members = catTeams.filter(t => t.groupId === gid);
                    return (
                      <DropColumn
                        key={gid} title={`Grupo ${GROUP_LETTERS[i]}`} accent="var(--turf-green)"
                        count={members.length} capacity={g.teamsPerGroup}
                        onDrop={() => { if (dragTeam) { assignTeamToGroup(dragTeam, gid); setDragTeam(null); } }}
                      >
                        {members.map(t => (
                          <TeamChip key={t.id} team={t} onDragStart={() => setDragTeam(t.id)} />
                        ))}
                      </DropColumn>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ), 'J')}

      {/* Save bar */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
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

// ── Drag helpers ─────────────────────────────────────────────────────────────

function DropColumn({ title, accent, count, capacity, onDrop, children }: {
  title: string; accent: string; count: number; capacity?: number;
  onDrop: () => void; children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(); }}
      style={{
        border: `1px solid ${over ? accent : 'var(--grey-200)'}`,
        background: over ? 'rgba(34,197,94,0.04)' : '#fff', padding: 10, minHeight: 90,
        boxShadow: over ? `inset 0 0 0 1px ${accent}` : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: capacity && count > capacity ? '#b91c1c' : 'var(--grey-400)' }}>
          {count}{capacity ? `/${capacity}` : ''}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function TeamChip({ team, onDragStart }: { team: PersonalizadoTeam; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{
        padding: '7px 9px', border: '1px solid var(--grey-200)', background: 'var(--grey-50, #fafafa)',
        cursor: 'grab', fontSize: 12, lineHeight: 1.3,
      }}
    >
      <div style={{ fontWeight: 600 }}>{team.player1Name}</div>
      {team.player2Name && <div style={{ color: 'var(--grey-400)', fontSize: 11 }}>{team.player2Name}</div>}
    </div>
  );
}
