// score-correction-store.ts — Persistent score correction requests (localStorage + Supabase)

import { createLocalStore } from './local-store';
import { supabase } from './supabase';

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
  // Structured set-score the correction resolves to (sets won per pair) —
  // what actually gets applied to the match + used to recompute ranking
  // points. currentScore/requestedScore stay free text for human display.
  requestedPair1Score: number;
  requestedPair2Score: number;
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
  opts: { reviewedBy?: string; reviewNotes?: string; affectedPlayerIds?: string[]; rankingAdjusted?: boolean } = {},
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
    ...(opts.affectedPlayerIds ? { affectedPlayerIds: opts.affectedPlayerIds } : {}),
    ...(opts.rankingAdjusted !== undefined ? { rankingAdjusted: opts.rankingAdjusted } : {}),
  };
  all[idx] = updated;
  _store.persist(all);
  syncCorrectionToSupabase(updated).catch(() => {});
  return updated;
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
      requestedPair1Score: row.requested_pair1_score ?? 0,
      requestedPair2Score: row.requested_pair2_score ?? 0,
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
  if (typeof window === 'undefined') return;
  // Route through the service-role endpoint (anon writes on score_corrections
  // are blocked by RLS). Fire-and-forget: the localStorage copy is authoritative
  // for the UI, so a failed sync never blocks the caller.
  try {
    await fetch('/api/score-corrections/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c),
    });
  } catch {
    // fire-and-forget
  }
}
