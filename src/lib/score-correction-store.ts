// score-correction-store.ts — Persistent score correction requests (localStorage + Supabase)

import { createLocalStore } from './local-store';
import { supabase } from './supabase';
import { updatePlayerRankingPoints } from './player-store';

export interface ScoreCorrectionRequest {
  id: string;
  type: 'tournament' | 'game';
  entityId: string;
  entityName: string;
  roundNum: number;
  courtNum: number;
  requestedBy: string;
  requestedById: string;
  currentScore: string;
  requestedScore: string;
  reason: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  affectedPlayerIds?: string[];
  rankingAdjusted?: boolean;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `sc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const _store = createLocalStore<ScoreCorrectionRequest[]>(
  'padelmgt_score_corrections',
  [],
  { seedOnFirstLoad: false },
);

export function getScoreCorrections(): ScoreCorrectionRequest[] {
  return _store.load();
}

export function getScoreCorrectionsByEntity(entityId: string): ScoreCorrectionRequest[] {
  return _store.load().filter(c => c.entityId === entityId);
}

export function getPendingScoreCorrections(): ScoreCorrectionRequest[] {
  return _store.load().filter(c => c.status === 'pending');
}

export function createScoreCorrection(
  req: Omit<ScoreCorrectionRequest, 'id' | 'createdAt' | 'status'>,
): ScoreCorrectionRequest {
  const correction: ScoreCorrectionRequest = {
    ...req,
    id: generateId(),
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  const all = _store.load();
  _store.persist([...all, correction]);
  syncCorrectionToSupabase(correction).catch(() => {});
  return correction;
}

export function updateScoreCorrectionStatus(
  id: string,
  status: 'approved' | 'rejected',
  opts: { reviewedBy?: string; reviewNotes?: string } = {},
): ScoreCorrectionRequest | null {
  const all = _store.load();
  const idx = all.findIndex(c => c.id === id);
  if (idx < 0) return null;
  const updated: ScoreCorrectionRequest = {
    ...all[idx],
    status,
    reviewedBy: opts.reviewedBy,
    reviewedAt: new Date().toISOString(),
    reviewNotes: opts.reviewNotes,
  };
  all[idx] = updated;
  _store.persist(all);
  syncCorrectionToSupabase(updated).catch(() => {});
  return updated;
}

export function applyRankingAdjustmentForCorrection(
  correctionId: string,
  playerDeltas: Array<{ playerId: string; oldDelta: number; newDelta: number }>,
): void {
  const all = _store.load();
  const idx = all.findIndex(c => c.id === correctionId);
  if (idx < 0) return;

  for (const pd of playerDeltas) {
    const diff = pd.newDelta - pd.oldDelta;
    if (diff !== 0) updatePlayerRankingPoints(pd.playerId, diff);
  }

  all[idx] = { ...all[idx], rankingAdjusted: true };
  _store.persist(all);
}

export async function fetchCorrectionsFromSupabase(): Promise<ScoreCorrectionRequest[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('score_corrections')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(row => ({
      id: row.id,
      type: row.entity_type as 'tournament' | 'game',
      entityId: row.entity_id ?? '',
      entityName: row.entity_name ?? '',
      roundNum: row.round_num ?? 0,
      courtNum: row.court_num ?? 0,
      requestedBy: row.requested_by ?? '',
      requestedById: row.requested_by_id ?? '',
      currentScore: row.current_score ?? '',
      requestedScore: row.requested_score ?? '',
      reason: row.reason ?? '',
      createdAt: row.created_at,
      status: row.status as 'pending' | 'approved' | 'rejected',
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      affectedPlayerIds: row.affected_player_ids,
      rankingAdjusted: row.ranking_adjusted ?? false,
    }));
  } catch {
    return [];
  }
}

export function mergeCorrectionsFromSupabase(remote: ScoreCorrectionRequest[]): void {
  if (remote.length === 0) return;
  const local = _store.load();
  const localById = new Map(local.map(c => [c.id, c]));
  for (const r of remote) {
    const existing = localById.get(r.id);
    if (!existing || new Date(r.reviewedAt ?? r.createdAt) > new Date(existing.reviewedAt ?? existing.createdAt)) {
      localById.set(r.id, r);
    }
  }
  _store.persist(Array.from(localById.values()));
}

async function syncCorrectionToSupabase(c: ScoreCorrectionRequest): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('score_corrections').upsert({
      id: c.id,
      entity_type: c.type,
      entity_id: c.entityId,
      entity_name: c.entityName,
      round_num: c.roundNum,
      court_num: c.courtNum,
      requested_by: c.requestedBy,
      requested_by_id: c.requestedById,
      current_score: c.currentScore,
      requested_score: c.requestedScore,
      reason: c.reason,
      status: c.status,
      reviewed_by: c.reviewedBy ?? null,
      reviewed_at: c.reviewedAt ?? null,
      review_notes: c.reviewNotes ?? null,
      affected_player_ids: c.affectedPlayerIds ?? null,
      ranking_adjusted: c.rankingAdjusted ?? false,
    }, { onConflict: 'id' });
  } catch {
    // fire-and-forget
  }
}
