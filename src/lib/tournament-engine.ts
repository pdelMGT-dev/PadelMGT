// tournament-engine.ts — Generates all rounds for Americano and Mexicano tournaments.
// Pure TypeScript. No React. No Next.js imports.

import {
  GamePlayer,
  GameRound,
  CourtMatch,
  FixedPair,
  calculateStandings,
  generateMexicanoRound,
} from './game-engine';
import type { Tournament } from './tournament-store';

/** Extended player type that may carry a sex field for mixto tournaments. */
type MixtoPlayer = GamePlayer & { sex?: 'masculino' | 'femenino' };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Classic circle rotation: fix position 0, pop last, insert at position 1. */
function rotateCircle<T>(arr: T[]): T[] {
  if (arr.length <= 2) return arr;
  const next = [...arr];
  const last = next.pop()!;
  next.splice(1, 0, last);
  return next;
}

// ---------------------------------------------------------------------------
// Americano Individual (non-mixto)
// ---------------------------------------------------------------------------

function generateAmericanoIndividualRounds(
  players: GamePlayer[],
  courts: number,
): GameRound[] {
  const N = players.length;
  if (N < 4) return [];

  // Maximum active players must be a multiple of 4
  const maxActive = courts * 4;
  const active = Math.min(maxActive, Math.floor(N / 4) * 4);

  let arr = players.map((_, i) => i); // indices 0..N-1
  const rounds: GameRound[] = [];

  for (let r = 0; r < N; r++) {
    const playingIndices = arr.slice(0, active);
    const restingIndices = arr.slice(active);

    const courtMatches: CourtMatch[] = [];
    for (let c = 0; c < playingIndices.length; c += 4) {
      if (c + 3 < playingIndices.length && courtMatches.length < courts) {
        courtMatches.push({
          courtNum: courtMatches.length + 1,
          pair1: [players[playingIndices[c]].id, players[playingIndices[c + 1]].id],
          pair2: [players[playingIndices[c + 2]].id, players[playingIndices[c + 3]].id],
          pair1Score: null,
          pair2Score: null,
          status: 'pending',
        });
      }
    }

    rounds.push({
      num: r + 1,
      status: 'pending',
      courts: courtMatches,
      resting: restingIndices.map(i => players[i].id),
    });

    arr = rotateCircle(arr);
  }

  return rounds;
}

// ---------------------------------------------------------------------------
// Americano Parejas (fixed teams)
// ---------------------------------------------------------------------------

function generateAmericanoParejasRounds(
  fixedPairs: FixedPair[],
  courts: number,
): GameRound[] {
  const M = fixedPairs.length;
  if (M < 2) return [];

  // Maximum active teams: 2 per court (one per side)
  const maxActiveTeams = courts * 2;
  const activeTeams = Math.min(maxActiveTeams, Math.floor(M / 2) * 2);

  let arr = Array.from({ length: M }, (_, i) => i); // team indices
  const rounds: GameRound[] = [];

  for (let r = 0; r < M; r++) {
    const playingTeams = arr.slice(0, activeTeams);
    const restingTeams = arr.slice(activeTeams);

    const courtMatches: CourtMatch[] = [];
    for (let c = 0; c < playingTeams.length; c += 2) {
      if (c + 1 < playingTeams.length && courtMatches.length < courts) {
        const team1 = fixedPairs[playingTeams[c]];
        const team2 = fixedPairs[playingTeams[c + 1]];
        courtMatches.push({
          courtNum: courtMatches.length + 1,
          pair1: [team1.player1Id, team1.player2Id],
          pair2: [team2.player1Id, team2.player2Id],
          pair1Score: null,
          pair2Score: null,
          status: 'pending',
        });
      }
    }

    const restingPlayerIds: string[] = [];
    for (const teamIdx of restingTeams) {
      const team = fixedPairs[teamIdx];
      restingPlayerIds.push(team.player1Id, team.player2Id);
    }

    rounds.push({
      num: r + 1,
      status: 'pending',
      courts: courtMatches,
      resting: restingPlayerIds,
    });

    arr = rotateCircle(arr);
  }

  return rounds;
}

// ---------------------------------------------------------------------------
// Americano Mixto Individual
// ---------------------------------------------------------------------------

function generateAmericanoMixtoRounds(
  players: GamePlayer[],
  courts: number,
): GameRound[] {
  const mixtoPlayers = players as MixtoPlayer[];
  const men = mixtoPlayers.filter(p => p.sex !== 'femenino');
  const women = mixtoPlayers.filter(p => p.sex === 'femenino');

  const W = women.length;
  const numRounds = Math.min(men.length, W);
  if (numRounds === 0 || men.length === 0 || W === 0) return [];

  const rounds: GameRound[] = [];

  for (let r = 0; r < numRounds; r++) {
    // Build pairs: man[i] partners with woman[(i+r) % W]
    const pairs: [GamePlayer, GamePlayer][] = men.map((man, i) => [
      man,
      women[(i + r) % W],
    ]);

    // Active: first even count of pairs, max courts*2 pairs (2 pairs per court)
    const maxActivePairs = courts * 2;
    let activePairCount = Math.min(maxActivePairs, pairs.length);
    // Must be even (2 pairs per court)
    if (activePairCount % 2 !== 0) activePairCount--;

    const activePairs = pairs.slice(0, activePairCount);
    const restingPairs = pairs.slice(activePairCount);

    const courtMatches: CourtMatch[] = [];
    for (let c = 0; c < activePairs.length; c += 2) {
      if (c + 1 < activePairs.length && courtMatches.length < courts) {
        const [p1a, p1b] = activePairs[c];
        const [p2a, p2b] = activePairs[c + 1];
        courtMatches.push({
          courtNum: courtMatches.length + 1,
          pair1: [p1a.id, p1b.id],
          pair2: [p2a.id, p2b.id],
          pair1Score: null,
          pair2Score: null,
          status: 'pending',
        });
      }
    }

    const restingIds: string[] = restingPairs.flatMap(([a, b]) => [a.id, b.id]);

    rounds.push({
      num: r + 1,
      status: 'pending',
      courts: courtMatches,
      resting: restingIds,
    });
  }

  return rounds;
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export function generateTournamentAmericanoRounds(
  players: GamePlayer[],
  courts: number,
  pairType: 'individual' | 'parejas',
  mixto: boolean,
  fixedPairs?: FixedPair[],
): GameRound[] {
  if (pairType === 'parejas' && fixedPairs && fixedPairs.length >= 2) {
    return generateAmericanoParejasRounds(fixedPairs, courts);
  }
  if (mixto) {
    return generateAmericanoMixtoRounds(players, courts);
  }
  return generateAmericanoIndividualRounds(players, courts);
}

// ---------------------------------------------------------------------------
// startTournament
// ---------------------------------------------------------------------------

export function startTournament(tournament: Tournament): Tournament {
  const { format, players, courts, pairType, mixto, fixedPairs } = tournament;

  let rounds: GameRound[] = [];

  if (format === 'americano') {
    rounds = generateTournamentAmericanoRounds(
      players,
      courts,
      pairType,
      mixto,
      fixedPairs,
    );
  } else if (format === 'mexicano') {
    // Only generate first round; subsequent rounds generated dynamically
    const firstRound = generateMexicanoRound(players, [], courts, 1);
    rounds = [firstRound];
  }

  // Make round 1 active
  rounds = rounds.map((r, i) =>
    i === 0 ? { ...r, status: 'active' as const } : r,
  );

  const base: Tournament = {
    ...tournament,
    status: 'live',
    rounds,
    currentRound: 1,
    standings: [],
  };

  // Reset standings using calculateStandings on empty rounds
  const standings = calculateStandings({ ...base, rounds: [] });

  return { ...base, standings };
}
