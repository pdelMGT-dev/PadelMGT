// tournament-engine.ts — Generates all rounds for Americano and Mexicano tournaments.
// Pure TypeScript. No React. No Next.js imports.

import {
  GamePlayer,
  GameRound,
  CourtMatch,
  FixedPair,
  calculateStandings,
  generateMexicanoRound,
  generateRoundRobinRounds,
  generateKnockoutBracketFromPairs,
  generateKnockoutGroupStage,
  calculateGroupStandings,
  advanceKnockoutBracket,
} from './game-engine';
import type { Tournament } from './tournament-store';

/** Extended player type that may carry a sex field for mixto tournaments. */
type MixtoPlayer = GamePlayer & { sex?: 'masculino' | 'femenino' };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Americano Individual (non-mixto)
// ---------------------------------------------------------------------------

function generateAmericanoIndividualRounds(
  players: GamePlayer[],
  courts: number,
): GameRound[] {
  const N = players.length;
  if (N < 4) return [];

  const maxActive = courts * 4;
  const active = Math.min(maxActive, Math.floor(N / 4) * 4);
  const restCount = N - active;

  let arr = players.map((_, i) => i); // indices 0..N-1
  const rounds: GameRound[] = [];

  for (let r = 0; r < N; r++) {
    // First restCount in circle rest, remaining active play
    const restingIndices = arr.slice(0, restCount);
    const playingIndices = arr.slice(restCount); // length = active

    // Fold pairing: play[k*2] partners with play[active-1-k*2]
    const courtMatches: CourtMatch[] = [];
    const nP = playingIndices.length;
    for (let k = 0; k * 4 < nP && courtMatches.length < courts; k++) {
      courtMatches.push({
        courtNum: courtMatches.length + 1,
        pair1: [players[playingIndices[k * 2]].id, players[playingIndices[nP - 1 - k * 2]].id],
        pair2: [players[playingIndices[k * 2 + 1]].id, players[playingIndices[nP - 2 - k * 2]].id],
        pair1Score: null,
        pair2Score: null,
        status: 'pending',
      });
    }

    rounds.push({
      num: r + 1,
      status: 'pending',
      courts: courtMatches,
      resting: restingIndices.map(i => players[i].id),
    });

    // Full cyclic rotation: move first to last (no fixed player = balanced rests)
    arr = [...arr.slice(1), arr[0]];
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

  const maxActiveTeams = courts * 2;
  const activeTeams = Math.min(maxActiveTeams, Math.floor(M / 2) * 2);
  const restTeams = M - activeTeams;

  let arr = Array.from({ length: M }, (_, i) => i); // team indices
  const rounds: GameRound[] = [];

  for (let r = 0; r < M; r++) {
    // First restTeams in circle rest
    const restingTeamIndices = arr.slice(0, restTeams);
    const playingTeamIndices = arr.slice(restTeams); // length = activeTeams

    const courtMatches: CourtMatch[] = [];
    for (let c = 0; c + 1 < playingTeamIndices.length && courtMatches.length < courts; c += 2) {
      const team1 = fixedPairs[playingTeamIndices[c]];
      const team2 = fixedPairs[playingTeamIndices[c + 1]];
      courtMatches.push({
        courtNum: courtMatches.length + 1,
        pair1: [team1.player1Id, team1.player2Id],
        pair2: [team2.player1Id, team2.player2Id],
        pair1Score: null,
        pair2Score: null,
        status: 'pending',
      });
    }

    const restingPlayerIds: string[] = [];
    for (const teamIdx of restingTeamIndices) {
      const team = fixedPairs[teamIdx];
      restingPlayerIds.push(team.player1Id, team.player2Id);
    }

    rounds.push({
      num: r + 1,
      status: 'pending',
      courts: courtMatches,
      resting: restingPlayerIds,
    });

    // Full cyclic rotation (no fixed team = balanced rests)
    arr = [...arr.slice(1), arr[0]];
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
  const { format, players, courts, pairType, mixto, fixedPairs, pjTarget } = tournament;

  let rounds: GameRound[] = [];

  if (format === 'knockout' || format === 'world_cup') {
    const pairs = fixedPairs ?? [];
    if (pairs.length < 2) return tournament;
    const cfg = tournament.knockoutConfig ?? { hasGroups: false, numGroups: 2, teamsAdvancing: 1, currentPhase: 'bracket' as const };

    if (cfg.hasGroups) {
      const groups = generateKnockoutGroupStage(pairs, cfg.numGroups, tournament.courts);
      return {
        ...tournament,
        status: 'live',
        rounds: [],
        currentRound: 1,
        standings: [],
        groups,
        knockoutConfig: { ...cfg, currentPhase: 'group_stage' },
      };
    } else {
      const bracket = generateKnockoutBracketFromPairs(pairs);
      return {
        ...tournament,
        status: 'live',
        rounds: [],
        currentRound: 1,
        standings: [],
        bracket,
        knockoutConfig: { ...cfg, currentPhase: 'bracket' },
      };
    }
  }

  if (format === 'americano') {
    rounds = generateTournamentAmericanoRounds(
      players,
      courts,
      pairType,
      mixto,
      fixedPairs,
    );
  } else if (format === 'mexicano') {
    // Only generate first round (random); subsequent rounds generated dynamically
    const firstRound = generateMexicanoRound(players, [], courts, 1, pairType, fixedPairs);
    rounds = [firstRound];
  } else if (format === 'round_robin') {
    const pj = pjTarget ?? 4;
    if (pairType === 'parejas' && fixedPairs && fixedPairs.length >= 2) {
      // Treat each fixed pair as one "player" entity
      const pairPlayers: GamePlayer[] = fixedPairs.map(fp => ({
        id: fp.player1Id,
        name: `${fp.player1Name} / ${fp.player2Name}`,
        email: '',
        ranking: 999,
        isCreator: false,
      }));
      rounds = generateRoundRobinRounds(pairPlayers, courts, pj).map(round => ({
        ...round,
        courts: round.courts.map(court => ({
          ...court,
          pair1: fixedPairs.find(fp => fp.player1Id === court.pair1[0])
            ? [court.pair1[0], fixedPairs.find(fp => fp.player1Id === court.pair1[0])!.player2Id]
            : court.pair1,
          pair2: fixedPairs.find(fp => fp.player1Id === court.pair2[0])
            ? [court.pair2[0], fixedPairs.find(fp => fp.player1Id === court.pair2[0])!.player2Id]
            : court.pair2,
        })),
      }));
    } else {
      rounds = generateRoundRobinRounds(players, courts, pj);
    }
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

// ---------------------------------------------------------------------------
// updateKnockoutGroupMatch — score a group stage match
// ---------------------------------------------------------------------------

export function updateKnockoutGroupMatch(
  tournament: Tournament,
  groupId: string,
  courtNum: number,
  s1: number,
  s2: number,
  sets?: Array<{ p1: number; p2: number }>,
): Tournament {
  if (!tournament.groups || !tournament.fixedPairs) return tournament;
  const pairs = tournament.fixedPairs;

  const groups = tournament.groups.groups.map(g => {
    if (g.id !== groupId) return g;
    const matches = g.matches.map(m =>
      m.courtNum === courtNum
        ? { ...m, pair1Score: s1, pair2Score: s2, status: 'completed' as const, ...(sets ? { sets } : {}) }
        : m
    );
    const standings = calculateGroupStandings({ ...g, matches }, pairs);
    return { ...g, matches, standings };
  });

  return { ...tournament, groups: { groups } };
}

// ---------------------------------------------------------------------------
// advanceGroupsToKnockout — promote top teams, generate bracket
// ---------------------------------------------------------------------------

export function advanceGroupsToKnockout(tournament: Tournament): Tournament {
  const { groups, knockoutConfig, fixedPairs } = tournament;
  if (!groups || !knockoutConfig || !fixedPairs) return tournament;

  const { teamsAdvancing } = knockoutConfig;
  const allGroups = groups.groups;
  const numGroups = allGroups.length;

  const getFP = (playerId: string): FixedPair | null =>
    fixedPairs.find(p => p.player1Id === playerId) ?? null;

  // Build seeded array using cross-group pairing when numGroups >= 2 and teamsAdvancing >= 2.
  // Pairs: (group 0, group 1), (group 2, group 3), …
  // Seeding: A1 vs B2, A2 vs B1, C1 vs D2, C2 vs D1, …
  // This is achieved by filling: [A1,A2, C1,C2, …] in the first half and
  // [D1,D2, B1,B2, …] (reverse pair order) in the second half, so that the
  // generateKnockoutBracketFromPairs seeding (i vs size-1-i) produces the right matchups.
  const qualifying: (FixedPair | null)[] = [];

  if (numGroups >= 2 && teamsAdvancing >= 2) {
    const numPairs = Math.floor(numGroups / 2);
    const firstHalf: (FixedPair | null)[] = [];
    const secondHalf: (FixedPair | null)[] = [];

    for (let pi = 0; pi < numPairs; pi++) {
      const groupA = allGroups[pi * 2];
      const groupB = allGroups[pi * 2 + 1];
      for (let pos = 0; pos < teamsAdvancing; pos++) {
        firstHalf.push(getFP(groupA.standings[pos]?.playerId ?? ''));
      }
      // Prepend groupB so last pair's B comes first in secondHalf
      const bTeams: (FixedPair | null)[] = [];
      for (let pos = 0; pos < teamsAdvancing; pos++) {
        bTeams.push(getFP(groupB.standings[pos]?.playerId ?? ''));
      }
      secondHalf.unshift(...bTeams);
    }

    // Odd group has no partner — append its qualifiers to firstHalf
    if (numGroups % 2 === 1) {
      const lastGroup = allGroups[numGroups - 1];
      for (let pos = 0; pos < teamsAdvancing; pos++) {
        firstHalf.push(getFP(lastGroup.standings[pos]?.playerId ?? ''));
      }
    }

    qualifying.push(...firstHalf, ...secondHalf);
  } else {
    // Simple ordering: all 1st places, then all 2nd places, etc.
    for (let pos = 0; pos < teamsAdvancing; pos++) {
      for (const group of allGroups) {
        qualifying.push(getFP(group.standings[pos]?.playerId ?? ''));
      }
    }
  }

  // Fill up to the next power of 2 using best-thirds
  // (sorted by pts desc → pointsFor desc → diff desc)
  const qualCount = qualifying.filter(Boolean).length;
  let targetSize = 2;
  while (targetSize < qualCount) targetSize *= 2;
  const needed = targetSize - qualCount;

  if (needed > 0) {
    const thirds: { fp: FixedPair; pts: number; pointsFor: number; diff: number }[] = [];
    for (const group of allGroups) {
      const st = group.standings[teamsAdvancing]; // position just below the cut
      if (!st) continue;
      const fp = getFP(st.playerId);
      if (fp && !qualifying.includes(fp)) {
        thirds.push({ fp, pts: st.pts, pointsFor: st.pointsFor, diff: st.diff });
      }
    }
    thirds.sort((a, b) =>
      b.pts !== a.pts ? b.pts - a.pts :
      b.pointsFor !== a.pointsFor ? b.pointsFor - a.pointsFor :
      b.diff - a.diff
    );
    for (let i = 0; i < needed && i < thirds.length; i++) {
      qualifying.push(thirds[i].fp);
    }
  }

  // Annotate group origin on qualifying pairs
  const annotatedQualifying = qualifying.map(fp => {
    if (!fp) return fp;
    // Find which group this pair belongs to and at what standing position
    for (const g of allGroups) {
      const posIdx = g.standings.findIndex(s => s.playerId === fp.player1Id);
      if (posIdx !== -1) {
        const isBest3rd = posIdx >= teamsAdvancing;
        const origin = isBest3rd
          ? `M3° ${g.name.replace('Grupo ', '')}`
          : `${posIdx + 1}° ${g.name.replace('Grupo ', '')}`;
        return { ...fp, groupOrigin: origin };
      }
    }
    return fp;
  });

  const advancingPairs = annotatedQualifying.filter((fp): fp is FixedPair => fp !== null);
  const bracket = generateKnockoutBracketFromPairs(advancingPairs);
  return {
    ...tournament,
    bracket,
    knockoutConfig: { ...knockoutConfig, currentPhase: 'bracket' },
  };
}

// ---------------------------------------------------------------------------
// updateKnockoutBracketMatch — score a bracket match and advance winner
// ---------------------------------------------------------------------------

export function updateKnockoutBracketMatch(
  tournament: Tournament,
  roundIdx: number,
  matchIdx: number,
  s1: number,
  s2: number,
  sets?: Array<{ p1: number; p2: number }>,
  walkover?: boolean,
): Tournament {
  if (!tournament.bracket) return tournament;

  const rounds = tournament.bracket.rounds.map((round, ri) => {
    if (ri !== roundIdx) return round;
    const matches = round.matches.map((m, mi) => {
      if (mi !== matchIdx) return m;
      const winner = s1 > s2 ? m.pair1 : m.pair2;
      return { ...m, pair1Score: s1, pair2Score: s2, winner, status: 'completed' as const, walkover: walkover ?? false, ...(sets ? { sets } : {}) };
    });
    return { ...round, matches };
  });

  const advanced = advanceKnockoutBracket({ rounds });

  // Check if Final is done → finish tournament
  const lastRound = advanced.rounds[advanced.rounds.length - 1];
  const isFinished = lastRound?.matches.every(m => m.status === 'completed') ?? false;

  return {
    ...tournament,
    bracket: advanced,
    status: isFinished ? 'finished' : tournament.status,
  };
}
