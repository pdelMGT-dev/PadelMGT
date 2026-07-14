// ranking-config-store.ts — Configurable ranking point tables

import { createLocalStore } from './local-store';

export interface RankingTableConfig {
  id: string;
  name: string;
  scope: 'global' | 'league' | 'club' | 'federation';
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  active: boolean;
  createdAt: string;
}

const DEFAULT_GLOBAL: RankingTableConfig = {
  id: 'global',
  name: 'Global',
  scope: 'global',
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: -1,
  active: true,
  createdAt: new Date().toISOString(),
};

const _store = createLocalStore<RankingTableConfig[]>('padelmgt_ranking_config', [DEFAULT_GLOBAL]);

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getGlobalRankingConfig(): RankingTableConfig {
  const all = _store.load();
  return all.find(c => c.scope === 'global' && c.active) ?? DEFAULT_GLOBAL;
}

export function getAllRankingConfigs(): RankingTableConfig[] {
  return _store.load();
}

export function saveRankingConfig(config: RankingTableConfig): void {
  const all = _store.load();
  const idx = all.findIndex(c => c.id === config.id);
  if (idx >= 0) all[idx] = config;
  else all.push(config);
  _store.persist(all);
}

export function createRankingConfig(
  name: string,
  scope: RankingTableConfig['scope'],
  pts: { win: number; draw: number; loss: number }
): RankingTableConfig {
  const config: RankingTableConfig = {
    id: generateId(),
    name,
    scope,
    pointsWin: pts.win,
    pointsDraw: pts.draw,
    pointsLoss: pts.loss,
    active: true,
    createdAt: new Date().toISOString(),
  };
  saveRankingConfig(config);
  return config;
}

export function deleteRankingConfig(id: string): void {
  if (id === 'global') return;
  _store.persist(_store.load().filter(c => c.id !== id));
}

// ── Supabase sync ─────────────────────────────────────────────────────────────
// The point math (ranking-store.ts) reads getGlobalRankingConfig() synchronously
// everywhere, so the local cache stays the source of truth for gameplay; these
// just keep it fresh across devices.

/** Pull the real global config from Supabase into the local cache. Returns
 * null on fetch failure (caller should keep showing the local cache). */
export async function syncRankingConfigFromSupabase(): Promise<RankingTableConfig | null> {
  try {
    const res = await fetch('/api/ranking-config');
    if (!res.ok) return null;
    const data = await res.json() as { config: RankingTableConfig };
    if (!data.config) return null;
    saveRankingConfig(data.config);
    return data.config;
  } catch { return null; }
}

export async function pushRankingConfigToSupabase(config: RankingTableConfig): Promise<void> {
  const res = await fetch('/api/sa/ranking-config', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pointsWin: config.pointsWin, pointsDraw: config.pointsDraw, pointsLoss: config.pointsLoss }),
  });
  if (!res.ok) throw new Error(`push ranking config failed: ${res.status}`);
}
