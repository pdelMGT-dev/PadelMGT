// club-review-store.ts — Player-generated club ratings (stars + comments)
//
// Source of truth is Supabase (cross-device, feeds the SA stats for future
// club-plan sales). localStorage keeps a same-device cache so the UI reflects
// a vote immediately and still works offline / before migration 009 runs.

import { supabase } from './supabase';

export interface ClubReview {
  clubId: string;
  playerId: string;
  playerName: string;
  rating: number; // 1..5
  comment?: string;
  createdAt: string;
}

const LS_KEY = 'padelmgt_club_reviews';

function loadLocal(): ClubReview[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as ClubReview[]) : [];
  } catch { return []; }
}

function persistLocal(reviews: ClubReview[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(reviews)); } catch { /* quota */ }
}

function mergeIntoLocal(incoming: ClubReview[]): ClubReview[] {
  const local = loadLocal();
  const byKey = new Map(local.map(r => [`${r.clubId}|${r.playerId}`, r]));
  for (const r of incoming) byKey.set(`${r.clubId}|${r.playerId}`, r);
  const merged = [...byKey.values()];
  persistLocal(merged);
  return merged;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export function getClubReviews(clubId: string): ClubReview[] {
  return loadLocal()
    .filter(r => r.clubId === clubId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getClubRating(clubId: string): { avg: number; count: number } {
  const reviews = getClubReviews(clubId);
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

export function getPlayerReview(clubId: string, playerId: string): ClubReview | null {
  return loadLocal().find(r => r.clubId === clubId && r.playerId === playerId) ?? null;
}

/** Fetch all reviews from Supabase, merge into the local cache, and return them. */
export async function syncClubReviews(clubId?: string): Promise<ClubReview[]> {
  if (!supabase) return loadLocal();
  try {
    let query = supabase
      .from('club_reviews')
      .select('club_id, player_id, player_name, rating, comment, created_at');
    if (clubId) query = query.eq('club_id', clubId);
    const { data, error } = await query.limit(2000);
    if (error || !data) return loadLocal();
    const incoming: ClubReview[] = data.map(row => ({
      clubId: row.club_id as string,
      playerId: row.player_id as string,
      playerName: (row.player_name as string) ?? '',
      rating: (row.rating as number) ?? 0,
      comment: (row.comment as string) ?? undefined,
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
    }));
    return mergeIntoLocal(incoming);
  } catch { return loadLocal(); }
}

/** Average + count per clubId for a set of clubs (used by the clubs list). */
export function getRatingsByClub(reviews: ClubReview[]): Map<string, { avg: number; count: number }> {
  const grouped = new Map<string, number[]>();
  for (const r of reviews) {
    const arr = grouped.get(r.clubId) ?? [];
    arr.push(r.rating);
    grouped.set(r.clubId, arr);
  }
  const result = new Map<string, { avg: number; count: number }>();
  for (const [clubId, ratings] of grouped) {
    const sum = ratings.reduce((a, b) => a + b, 0);
    result.set(clubId, { avg: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length });
  }
  return result;
}

// ── Writes ────────────────────────────────────────────────────────────────────

/** One review per player per club — submitting again replaces the previous vote. */
export async function submitClubReview(input: {
  clubId: string;
  playerId: string;
  playerName: string;
  rating: number;
  comment?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Sin conexión' };

  // Verify the caller has an active session and owns the playerId
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Debés iniciar sesión para valorar este club.' };
  if (session.user.id !== input.playerId) return { ok: false, error: 'Usuario no autorizado.' };

  const review: ClubReview = {
    clubId: input.clubId,
    playerId: input.playerId,
    playerName: input.playerName,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    comment: input.comment?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  mergeIntoLocal([review]);

  try {
    const { error } = await supabase.from('club_reviews').upsert({
      club_id: review.clubId,
      player_id: review.playerId,
      player_name: review.playerName,
      rating: review.rating,
      comment: review.comment ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'club_id,player_id' });
    if (error) return { ok: false, error: error.message };
  } catch { /* offline — local cache already updated */ }

  return { ok: true };
}
