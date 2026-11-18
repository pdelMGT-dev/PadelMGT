'use client';

// Organizer panel for rotation americano nights: load the roster (paste from
// Excel or import league members), set each player's category and games,
// then generate the full schedule before the night starts.

import { useMemo, useState } from 'react';
import {
  generateRotationSchedule, rotationTargets, maxRotationGames,
  type ActiveGame, type GamePlayer, type RotationScheduleResult,
} from '@/lib/game-engine';
import { parseRoster, normalizeName } from '@/lib/rotation-agenda';
import { fetchLeagueDetailFromSupabase } from '@/lib/player-league-store';
import { getPlayerLimits } from '@/lib/plan-config';

interface Props {
  game: ActiveGame;
  canEdit: boolean;
  onChange: (g: ActiveGame) => void;
  showToast: (msg: string) => void;
}

const box: React.CSSProperties = { border: '1px solid var(--grey-200)', background: 'var(--grey-50)', padding: '14px 16px', marginBottom: 16 };
const smallBtn: React.CSSProperties = { padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid var(--grey-200)', background: '#fff', color: 'var(--black)' };
const darkBtn: React.CSSProperties = { ...smallBtn, background: 'var(--black)', color: '#fff', border: 'none' };

/** True when the saved schedule no longer matches the roster (players added/removed). */
export function isPlanStale(game: ActiveGame): boolean {
  const planned = game.plannedRounds ?? [];
  if (planned.length === 0) return false;
  const inPlan = new Set(planned.flatMap(r => r.courts.flatMap(c => [...c.pair1, ...c.pair2])));
  const ids = new Set(game.players.map(p => p.id));
  for (const id of inPlan) if (!ids.has(id)) return true;
  const targets = game.playerQuota ?? {};
  for (const p of game.players) if (!inPlan.has(p.id) && targets[p.id] !== 0) return true;
  return false;
}

export default function RotationPlanner({ game, canEdit, onChange, showToast }: Props) {
  const rotation = game.rotation ?? { rounds: 8, avoidConsecutive: true };
  const categories = game.categories ?? [];
  const [bulkOpen, setBulkOpen] = useState(game.players.length <= 1);
  const [bulkText, setBulkText] = useState('');
  const [mucho, setMucho] = useState(5);
  const [poco, setPoco] = useState(2);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<RotationScheduleResult | null>(null);
  const [catText, setCatText] = useState(categories.join(', '));

  const targets = useMemo(() => rotationTargets(game.players, {
    numCourts: game.courts, numRounds: rotation.rounds, avoidConsecutive: rotation.avoidConsecutive,
    playerQuota: game.playerQuota,
  }), [game.players, game.courts, rotation.rounds, rotation.avoidConsecutive, game.playerQuota]);

  const parsed = useMemo(() => parseRoster(bulkText, categories, mucho, poco), [bulkText, categories, mucho, poco]);
  const cap = maxRotationGames(rotation.rounds, rotation.avoidConsecutive);
  const capacity = rotation.rounds * game.courts * 4;
  const demand = game.players.reduce((s, p) => s + (targets[p.id] ?? 0), 0);

  const byCategory = useMemo(() => {
    const groups = new Map<string, GamePlayer[]>();
    const order = categories.length > 0 ? [...categories, ''] : [''];
    for (const c of order) groups.set(c, []);
    for (const p of game.players) {
      const c = categories.length > 0 ? (game.playerCategory?.[p.id] ?? '') : '';
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c)!.push(p);
    }
    return [...groups.entries()].filter(([c, ps]) => ps.length > 0 || (c !== '' && categories.includes(c)));
  }, [game.players, game.playerCategory, categories]);

  const stale = isPlanStale(game);
  const planned = game.plannedRounds ?? [];

  // ── Mutations (every roster change drops the saved schedule) ────────────────

  function commit(patch: Partial<ActiveGame>, keepPlan = false) {
    onChange({ ...game, ...patch, ...(keepPlan ? {} : { plannedRounds: undefined }) });
    if (!keepPlan) setLastResult(null);
  }

  function addPlayers(entries: Array<{ player: GamePlayer; category?: string; quota?: number }>) {
    const limit = getPlayerLimits().maxPlayersPerGame;
    const existingIds = new Set(game.players.map(p => p.id));
    const existingNames = new Set(game.players.map(p => normalizeName(p.name)));
    const players = [...game.players];
    const playerCategory = { ...(game.playerCategory ?? {}) };
    const playerQuota = { ...(game.playerQuota ?? {}) };
    const invitedPlayers = [...(game.invitedPlayers ?? [])];
    let added = 0, dup = 0, overLimit = 0;
    for (const e of entries) {
      if (existingIds.has(e.player.id) || existingNames.has(normalizeName(e.player.name))) { dup++; continue; }
      if (limit !== -1 && players.length >= limit) { overLimit++; continue; }
      players.push(e.player);
      existingIds.add(e.player.id); existingNames.add(normalizeName(e.player.name));
      if (e.category) playerCategory[e.player.id] = e.category;
      if (e.quota !== undefined) playerQuota[e.player.id] = e.quota;
      if (e.player.id.startsWith('prov-')) {
        invitedPlayers.push({ id: e.player.id, name: e.player.name, ranking: 0, status: 'accepted', invitedAt: new Date().toISOString(), isFriend: false, isProvisional: true });
      }
      added++;
    }
    commit({ players, playerCategory, playerQuota, invitedPlayers, maxPlayers: Math.max(game.maxPlayers, players.length) });
    const parts = [`${added} agregada${added !== 1 ? 's' : ''}`];
    if (dup) parts.push(`${dup} ya estaba${dup !== 1 ? 'n' : ''}`);
    if (overLimit) parts.push(`${overLimit} no entraron: tu plan permite ${limit} jugadoras por juego`);
    showToast(parts.join(' · '));
  }

  async function handleBulkAdd() {
    const rows = parsed.filter(r => !r.skip);
    if (rows.length === 0) return;
    // Match against league members by name so results credit the real player.
    let members: Array<{ playerId: string; playerName: string; category?: string }> = [];
    if (game.leagueId) {
      const detail = await fetchLeagueDetailFromSupabase(game.leagueId);
      members = detail?.members ?? [];
    }
    const memberByName = new Map(members.map(m => [normalizeName(m.playerName), m]));
    const stamp = Date.now();
    addPlayers(rows.map((r, i) => {
      const m = memberByName.get(normalizeName(r.name));
      return {
        player: { id: m ? m.playerId : `prov-${stamp}-${i}`, name: m ? m.playerName : r.name, ranking: 0, isCreator: false },
        category: r.category ?? (m?.category && categories.includes(m.category) ? m.category : undefined),
        quota: r.quota,
      };
    }));
    setBulkText('');
    setBulkOpen(false);
  }

  async function handleImportLeague() {
    if (!game.leagueId) return;
    setImporting(true);
    const detail = await fetchLeagueDetailFromSupabase(game.leagueId);
    setImporting(false);
    if (!detail) { showToast('No se pudo cargar la liga.'); return; }
    addPlayers(detail.members.map(m => ({
      player: { id: m.playerId, name: m.playerName, ranking: 0, isCreator: false },
      category: m.category && categories.includes(m.category) ? m.category : undefined,
    })));
  }

  function setCategory(playerId: string, category: string) {
    const playerCategory = { ...(game.playerCategory ?? {}) };
    if (category) playerCategory[playerId] = category; else delete playerCategory[playerId];
    commit({ playerCategory });
  }

  function setQuota(playerId: string, value: string) {
    const playerQuota = { ...(game.playerQuota ?? {}) };
    const n = parseInt(value, 10);
    if (value === '' || Number.isNaN(n)) delete playerQuota[playerId];
    else playerQuota[playerId] = Math.max(0, Math.min(n, 30));
    commit({ playerQuota });
  }

  function removePlayer(playerId: string) {
    if (playerId === game.creatorId) return;
    const playerCategory = { ...(game.playerCategory ?? {}) }; delete playerCategory[playerId];
    const playerQuota = { ...(game.playerQuota ?? {}) }; delete playerQuota[playerId];
    commit({
      players: game.players.filter(p => p.id !== playerId),
      invitedPlayers: (game.invitedPlayers ?? []).filter(ip => ip.id !== playerId),
      playerCategory, playerQuota,
    });
  }

  function saveCategories() {
    const list = [...new Set(catText.split(/[,\n]/).map(s => s.trim()).filter(Boolean))].slice(0, 12);
    const playerCategory = Object.fromEntries(Object.entries(game.playerCategory ?? {}).filter(([, c]) => list.includes(c)));
    commit({ categories: list.length > 0 ? list : undefined, playerCategory });
  }

  function handleGenerate() {
    const res = generateRotationSchedule(game.players, {
      numCourts: game.courts,
      numRounds: rotation.rounds,
      avoidConsecutive: rotation.avoidConsecutive,
      categories,
      playerCategory: categories.length > 0 ? game.playerCategory : undefined,
      playerQuota: game.playerQuota,
    });
    setLastResult(res);
    onChange({ ...game, plannedRounds: res.rounds });
    const matches = res.rounds.reduce((s, r) => s + r.courts.length, 0);
    showToast(`Cronograma listo: ${res.rounds.length} rondas · ${matches} partidos`);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const shortList = lastResult ? game.players.filter(p => (lastResult.gamesByPlayer[p.id] ?? 0) < (lastResult.targetByPlayer[p.id] ?? 0)) : [];

  return (
    <div>
      {/* Settings */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16, fontSize: 13 }}>
        <span><strong>{rotation.rounds}</strong> rondas</span>
        <span><strong>{game.courts}</strong> cancha{game.courts !== 1 ? 's' : ''}</span>
        <span><strong>{game.players.length}</strong> jugadoras</span>
        <span style={{ color: demand > capacity ? '#b45309' : 'var(--grey-500)' }}>
          Juegos pedidos <strong>{demand / 4 % 1 === 0 ? demand / 4 : (demand / 4).toFixed(1)}</strong> de <strong>{capacity / 4}</strong> partidos posibles
        </span>
        {canEdit && (
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button style={{ ...smallBtn, padding: '4px 10px' }} onClick={() => commit({ rotation: { ...rotation, rounds: Math.max(1, rotation.rounds - 1) } })}>− ronda</button>
            <button style={{ ...smallBtn, padding: '4px 10px' }} onClick={() => commit({ rotation: { ...rotation, rounds: Math.min(30, rotation.rounds + 1) } })}>+ ronda</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input type="checkbox" checked={rotation.avoidConsecutive} onChange={e => commit({ rotation: { ...rotation, avoidConsecutive: e.target.checked } })} />
              Sin rondas seguidas (máx. {cap})
            </label>
          </span>
        )}
      </div>

      {/* Load roster */}
      {canEdit && (
        <div style={box}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: bulkOpen ? 12 : 0 }}>
            <button style={bulkOpen ? darkBtn : smallBtn} onClick={() => setBulkOpen(v => !v)}>📋 Pegar lista</button>
            {game.leagueId && (
              <button style={smallBtn} onClick={handleImportLeague} disabled={importing}>{importing ? 'Cargando…' : '👥 Importar miembros de la liga'}</button>
            )}
          </div>
          {bulkOpen && (
            <>
              <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 8, lineHeight: 1.5 }}>
                Una jugadora por línea: <em>Nombre, Categoría, Juegos</em>. Podés pegar columnas directo desde Excel.
                Juegos puede ser un número o “Mucho”/“Poco”. “No juega” se omite. Sin juegos = reparto automático parejo.
              </div>
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={7}
                placeholder={'Ana Olivares, Tercera, Poco\nLaura Hernández, Tercera, Mucho\nMónica Terrero, Quinta, 5'}
                style={{ width: '100%', boxSizing: 'border-box', padding: 10, fontSize: 13, fontFamily: 'monospace', border: '1px solid var(--grey-200)' }} />
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                <label style={{ fontSize: 12 }}>Mucho = <input type="number" min={1} max={30} value={mucho} onChange={e => setMucho(Math.max(1, parseInt(e.target.value || '1', 10)))} style={{ width: 52, padding: 4 }} /> juegos</label>
                <label style={{ fontSize: 12 }}>Poco = <input type="number" min={1} max={30} value={poco} onChange={e => setPoco(Math.max(1, parseInt(e.target.value || '1', 10)))} style={{ width: 52, padding: 4 }} /> juegos</label>
                <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>
                  {parsed.filter(r => !r.skip).length} para agregar{parsed.some(r => r.skip) ? ` · ${parsed.filter(r => r.skip).length} no juegan` : ''}
                  {categories.length > 0 && parsed.some(r => !r.skip && !r.category) ? ` · ${parsed.filter(r => !r.skip && !r.category).length} sin categoría` : ''}
                </span>
                <button style={{ ...darkBtn, marginLeft: 'auto' }} disabled={parsed.filter(r => !r.skip).length === 0} onClick={handleBulkAdd}>Agregar a la lista</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Categories editor */}
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Categorías:</span>
          <input value={catText} onChange={e => setCatText(e.target.value)} placeholder="Sin categorías — ej. Primera, Segunda, Tercera"
            style={{ flex: '1 1 260px', padding: '6px 10px', fontSize: 12, border: '1px solid var(--grey-200)' }} />
          {catText !== categories.join(', ') && <button style={smallBtn} onClick={saveCategories}>Guardar</button>}
        </div>
      )}

      {/* Roster by category */}
      {byCategory.map(([cat, ps]) => {
        const catDemand = ps.reduce((s, p) => s + (targets[p.id] ?? 0), 0);
        const warn = categories.length > 0 && cat !== '' && ps.length > 0 && ps.length < 4
          ? 'Necesita al menos 4 jugadoras para armar partidos'
          : catDemand % 4 !== 0 ? `${catDemand % 4} juego${catDemand % 4 !== 1 ? 's' : ''} sobra${catDemand % 4 !== 1 ? 'n' : ''} (los partidos son de 4)` : '';
        return (
          <div key={cat || 'none'} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--grey-200)', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {categories.length === 0 ? 'Jugadoras' : cat || 'Sin categoría'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>{ps.length} jugadora{ps.length !== 1 ? 's' : ''} · {catDemand / 4 % 1 === 0 ? catDemand / 4 : (catDemand / 4).toFixed(2)} partidos</span>
              {warn && <span style={{ fontSize: 11, color: '#b45309' }}>⚠ {warn}</span>}
            </div>
            {ps.map(p => {
              const explicit = game.playerQuota?.[p.id];
              const played = lastResult?.gamesByPlayer[p.id];
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontSize: 13 }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  {played !== undefined && played < (lastResult!.targetByPlayer[p.id] ?? 0) && (
                    <span style={{ fontSize: 10, color: '#b45309' }}>{played}/{lastResult!.targetByPlayer[p.id]}</span>
                  )}
                  {canEdit && categories.length > 0 && (
                    <select value={game.playerCategory?.[p.id] ?? ''} onChange={e => setCategory(p.id, e.target.value)}
                      style={{ fontSize: 12, padding: '3px 4px', border: '1px solid var(--grey-200)', background: '#fff' }}>
                      <option value="">—</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                  {canEdit ? (
                    <input type="number" min={0} max={cap} value={explicit ?? ''} placeholder={String(targets[p.id] ?? 0)}
                      onChange={e => setQuota(p.id, e.target.value)} title="Juegos (vacío = automático)"
                      style={{ width: 52, padding: '3px 6px', fontSize: 12, border: '1px solid var(--grey-200)', color: explicit === undefined ? 'var(--grey-400)' : 'var(--black)' }} />
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>{targets[p.id] ?? 0} juegos</span>
                  )}
                  {canEdit && p.id !== game.creatorId && (
                    <button onClick={() => removePlayer(p.id)} title="Quitar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--grey-300)', fontSize: 14 }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Generate */}
      {canEdit && (
        <div style={{ ...box, background: planned.length > 0 && !stale ? '#f0fdf4' : 'var(--grey-50)', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button style={darkBtn} onClick={handleGenerate} disabled={game.players.length < 4}>
              {planned.length > 0 ? '🔄 Regenerar cronograma' : '⚡ Generar cronograma'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>
              {game.players.length < 4 ? 'Necesitás al menos 4 jugadoras.'
                : stale ? '⚠ La lista cambió desde que se generó — regenerá el cronograma.'
                : planned.length > 0 ? `✓ ${planned.length} rondas · ${planned.reduce((s, r) => s + r.courts.length, 0)} partidos. Revisalo abajo y compartí las agendas.`
                : 'Arma todas las rondas: cada jugadora su cupo, sin repetir compañera, solo dentro de su categoría.'}
            </span>
          </div>
          {lastResult && (lastResult.shortfall > 0 || lastResult.repeatedPartners > 0) && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
              {lastResult.shortfall > 0 && <div>⚠ {shortList.length} jugadora{shortList.length !== 1 ? 's' : ''} con menos juegos de lo pedido: {shortList.slice(0, 6).map(p => p.name).join(', ')}{shortList.length > 6 ? '…' : ''}. Sumá rondas/canchas o bajá cupos.</div>}
              {lastResult.repeatedPartners > 0 && <div>⚠ {lastResult.repeatedPartners} pareja{lastResult.repeatedPartners !== 1 ? 's' : ''} repetida{lastResult.repeatedPartners !== 1 ? 's' : ''} (no alcanzan las combinaciones en alguna categoría).</div>}
            </div>
          )}
          {lastResult && lastResult.shortfall === 0 && lastResult.repeatedPartners === 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#166534' }}>✓ Todas con su cupo exacto y sin parejas repetidas{rotation.avoidConsecutive ? ', nadie juega rondas seguidas' : ''}.</div>
          )}
        </div>
      )}
    </div>
  );
}
