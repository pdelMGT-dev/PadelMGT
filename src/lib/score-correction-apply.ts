// score-correction-apply.ts — applies an approved score correction to the
// real tournament record and recomputes ranking points from it.
//
// Only tournament-type corrections are reachable today (no UI ever creates a
// 'game'-type correction — see score-correction-store.ts), so this only
// covers tournaments. Reuses the same trusted primitives the rest of the app
// uses to record/credit scores, rather than re-deriving win/draw/loss math by
// hand:
//  - updateMatchScore (game-engine.ts) patches the court in place, exactly
//    like every other score-entry path in the app.
//  - applyTournamentRankingResults (ranking-store.ts) is idempotent and
//    self-correcting: it diffs the freshly computed per-player win/draw/loss
//    record against whatever was last credited for this tournament and
//    reverses+reapplies only the difference. Calling it after patching the
//    score is the safe way to "recompute ranking points" — no manual delta
//    math needed, and it can never double-count.

import { updateMatchScore, type CourtMatch } from './game-engine';
import { getTournament, saveTournament, type Tournament } from './tournament-store';
import { upsertTournamentToSupabase, getFullTournamentFromSupabase } from './superadmin-data';
import { applyTournamentRankingResults } from './ranking-store';

function findCourt(tournament: Tournament, roundNum: number, courtNum: number): CourtMatch | null {
  const round = tournament.rounds.find(r => r.num === roundNum);
  return round?.courts.find(c => c.courtNum === courtNum) ?? null;
}

export interface ApplyCorrectionResult {
  ok: true;
  affectedPlayerIds: string[];
}
export interface ApplyCorrectionError {
  ok: false;
  error: string;
}

/**
 * Loads the tournament (local cache first, else Supabase's `data` column —
 * same fallback the SA tournament detail drawer uses), patches the given
 * round/court's score to the corrected value, persists it, and recomputes
 * ranking points for everyone affected.
 */
export async function applyTournamentScoreCorrection(
  tournamentId: string,
  roundNum: number,
  courtNum: number,
  requestedPair1Score: number,
  requestedPair2Score: number,
): Promise<ApplyCorrectionResult | ApplyCorrectionError> {
  let tournament = getTournament(tournamentId);
  if (!tournament) {
    const sbData = await getFullTournamentFromSupabase(tournamentId);
    if (!sbData) return { ok: false, error: 'No se encontró el torneo (ni local ni en Supabase)' };
    tournament = sbData as unknown as Tournament;
  }

  const court = findCourt(tournament, roundNum, courtNum);
  if (!court) return { ok: false, error: `No se encontró Ronda ${roundNum} / Cancha ${courtNum} en este torneo` };

  const affectedPlayerIds = [...court.pair1, ...court.pair2];

  const updated = updateMatchScore(tournament, roundNum, courtNum, requestedPair1Score, requestedPair2Score);
  saveTournament(updated);
  await upsertTournamentToSupabase(updated as unknown as Record<string, unknown>);

  // Idempotent + self-correcting — safe whether this tournament was already
  // finished-and-credited (reverses the stale entries, reapplies the fresh
  // ones) or is still in progress (first-time credit for what's completed so
  // far; a later real finish reconciles again with the full final state).
  applyTournamentRankingResults(updated);

  return { ok: true, affectedPlayerIds };
}
