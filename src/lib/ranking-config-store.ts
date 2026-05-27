// ranking-config-store.ts — Configurable ranking point tables

const CONFIG_KEY = 'padelmgt_ranking_config';

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

function isServer(): boolean {
  return typeof window === 'undefined';
}

function load(): RankingTableConfig[] {
  if (isServer()) return [DEFAULT_GLOBAL];
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return [DEFAULT_GLOBAL];
    return JSON.parse(raw) as RankingTableConfig[];
  } catch {
    return [DEFAULT_GLOBAL];
  }
}

function persist(configs: RankingTableConfig[]): void {
  if (isServer()) return;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(configs));
  } catch {}
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getGlobalRankingConfig(): RankingTableConfig {
  const all = load();
  return all.find(c => c.scope === 'global' && c.active) ?? DEFAULT_GLOBAL;
}

export function getAllRankingConfigs(): RankingTableConfig[] {
  return load();
}

export function saveRankingConfig(config: RankingTableConfig): void {
  const all = load();
  const idx = all.findIndex(c => c.id === config.id);
  if (idx >= 0) all[idx] = config;
  else all.push(config);
  persist(all);
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
  if (id === 'global') return; // can't delete global
  const all = load().filter(c => c.id !== id);
  persist(all);
}
