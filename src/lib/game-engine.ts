// game-engine.ts — Pure TypeScript game logic. No React. No Next.js imports.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameFormat =
  | 'americano'
  | 'mexicano'
  | 'round_robin'
  | 'team_league'
  | 'knockout'
  | 'world_cup';

export type GameStatus = 'created' | 'starting_soon' | 'live' | 'finished';

export type PairType = 'individual' | 'parejas';

export type ScoreConfigType = 'points' | 'traditional';

export interface ScoreConfig {
  type: ScoreConfigType;
  target?: number;       // for points mode
  setsPerMatch?: number; // for traditional
  gamesPerSet?: number;
  tiebreak?: number;
  deuce?: 'ventaja' | 'oro';
}

export interface GamePlayer {
  id: string;
  name: string;
  ranking: number;
  isCreator: boolean;
  email?: string;
  shortId?: string;
}

export interface InvitedPlayer {
  id: string;
  name: string;
  email?: string;
  shortId?: string;
  ranking: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  invitedAt: string;
  isFriend: boolean;
}

export interface FixedPair {
  pairIndex: number;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
}

export interface CourtMatch {
  courtNum: number;
  pair1: string[];     // player ids (1 or 2 players)
  pair2: string[];     // player ids (1 or 2 players)
  pair1Score: number | null;
  pair2Score: number | null;
  sets?: Array<{ p1: number; p2: number }>; // games per set (traditional mode)
  status: 'pending' | 'completed';
}

export interface GameRound {
  num: number;          // 1-indexed
  status: 'pending' | 'active' | 'completed';
  courts: CourtMatch[];
  resting: string[];    // player ids sitting out
}

export interface Standing {
  playerId: string;
  playerName: string;
  pts: number;          // points scored (for points mode) or match wins * 3 + draws
  wins: number;         // courts/matches won
  played: number;
  diff: number;         // point/game difference
  pointsFor: number;
  pointsAgainst: number;
}

export interface KnockoutBracket {
  rounds: KnockoutRound[];
}

export interface KnockoutRound {
  name: string; // 'Final', 'Semifinal', 'Cuartos', 'Octavos', etc.
  matches: KnockoutMatch[];
}

export interface KnockoutMatch {
  id: string;
  pair1: string[] | null; // player ids (null if TBD)
  pair2: string[] | null;
  pair1Score: number | null;
  pair2Score: number | null;
  winner: string[] | null; // winning pair player ids
  status: 'pending' | 'completed';
}

export interface ActiveGame {
  id: string;
  code: string;
  name: string;
  format: GameFormat;
  status: GameStatus;
  date: string;
  time: string;
  club: string;
  city: string;
  country?: string;
  locationName?: string;      // custom name for "Pista Privada"
  pairType: PairType;
  mixto: boolean;
  scoreConfig: ScoreConfig;
  maxPlayers: number;
  courts: number;
  players: GamePlayer[];      // confirmed players (including creator)
  invitedPlayers: InvitedPlayer[]; // full invitation list with status
  fixedPairs?: FixedPair[];   // set by creator in 'parejas' mode before start
  rounds: GameRound[];
  currentRound: number;       // 0 = not started, 1+ = current round number
  standings: Standing[];
  levelLabel?: string;        // display label for level filter used at creation
  creatorId?: string;         // user ID of the creator
  bracket?: KnockoutBracket;  // for knockout/world_cup
  groups?: GroupStage;        // for world_cup
  isCreator?: boolean;        // set by UI when rendering for creator
  cancelledAt?: string;       // ISO date if game was cancelled
}

export interface GroupStage {
  groups: Group[];
}

export interface Group {
  id: string;
  name: string;         // 'Grupo A', 'Grupo B'
  playerIds: string[];
  matches: CourtMatch[];
  standings: Standing[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a circle-method rotation index array for n players (n must be even). */
function buildCircleIndices(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/**
 * Rotate the index array one step clockwise (fix position 0, rotate the rest).
 * Last element moves to position 1.
 */
function rotateIndices(idx: number[]): number[] {
  if (idx.length <= 2) return idx;
  const next = [...idx];
  const last = next.pop()!;
  next.splice(1, 0, last);
  return next;
}

/** Generate a single round's court matches from an index array and player list. */
function buildRoundFromIndices(
  idx: number[],
  players: GamePlayer[],
  numCourts: number,
  roundNum: number,
): GameRound {
  const courts: CourtMatch[] = [];
  const restingIds: string[] = [];

  for (let i = 0; i < idx.length; i += 4) {
    if (
      i + 3 < idx.length &&
      courts.length < numCourts &&
      idx[i] < players.length &&
      idx[i + 1] < players.length &&
      idx[i + 2] < players.length &&
      idx[i + 3] < players.length
    ) {
      courts.push({
        courtNum: courts.length + 1,
        pair1: [players[idx[i]].id, players[idx[i + 1]].id],
        pair2: [players[idx[i + 2]].id, players[idx[i + 3]].id],
        pair1Score: null,
        pair2Score: null,
        status: 'pending',
      });
    } else {
      // Mark excess players as resting
      for (let j = i; j < Math.min(i + 4, idx.length); j++) {
        if (idx[j] < players.length) {
          restingIds.push(players[idx[j]].id);
        }
      }
    }
  }

  return {
    num: roundNum,
    status: 'pending',
    courts,
    resting: restingIds,
  };
}

// ---------------------------------------------------------------------------
// 1. generateAmericanoRounds
// ---------------------------------------------------------------------------

export function generateAmericanoRounds(
  players: GamePlayer[],
  numCourts: number,
): GameRound[] {
  const n = players.length % 2 === 0 ? players.length : players.length + 1;
  const numRounds = n - 1;

  let idx = buildCircleIndices(n);
  const rounds: GameRound[] = [];

  for (let r = 0; r < numRounds; r++) {
    rounds.push(buildRoundFromIndices(idx, players, numCourts, r + 1));
    idx = rotateIndices(idx);
  }

  return rounds;
}

// ---------------------------------------------------------------------------
// 2. generateMexicanoRound
// ---------------------------------------------------------------------------

export function generateMexicanoRound(
  players: GamePlayer[],
  standings: Standing[],
  numCourts: number,
  roundNum: number,
): GameRound {
  if (roundNum === 1 || standings.length === 0) {
    // Round 1: use the first round of Americano (random order)
    const allRounds = generateAmericanoRounds(players, numCourts);
    return { ...allRounds[0], num: roundNum, status: 'pending' };
  }

  // Rounds 2+: sort players by pts descending, then pair by rank position
  const sorted = [...players].sort((a, b) => {
    const sA = standings.find((s) => s.playerId === a.id);
    const sB = standings.find((s) => s.playerId === b.id);
    const ptsA = sA?.pts ?? 0;
    const ptsB = sB?.pts ?? 0;
    if (ptsB !== ptsA) return ptsB - ptsA;
    const diffA = sA?.diff ?? 0;
    const diffB = sB?.diff ?? 0;
    return diffB - diffA;
  });

  const courts: CourtMatch[] = [];
  const restingIds: string[] = [];

  for (let i = 0; i < sorted.length; i += 4) {
    if (i + 3 < sorted.length && courts.length < numCourts) {
      courts.push({
        courtNum: courts.length + 1,
        pair1: [sorted[i].id, sorted[i + 1].id],
        pair2: [sorted[i + 2].id, sorted[i + 3].id],
        pair1Score: null,
        pair2Score: null,
        status: 'pending',
      });
    } else {
      for (let j = i; j < Math.min(i + 4, sorted.length); j++) {
        restingIds.push(sorted[j].id);
      }
    }
  }

  return {
    num: roundNum,
    status: 'pending',
    courts,
    resting: restingIds,
  };
}

// ---------------------------------------------------------------------------
// 3. generateRoundRobinRounds
// ---------------------------------------------------------------------------

export function generateRoundRobinRounds(
  players: GamePlayer[],
  numCourts: number,
): GameRound[] {
  // Same circle method as Americano — each player meets every other player exactly once
  return generateAmericanoRounds(players, numCourts);
}

// ---------------------------------------------------------------------------
// 4. generateKnockoutBracket
// ---------------------------------------------------------------------------

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function knockoutRoundName(totalRounds: number, roundIndex: number): string {
  const stepsFromFinal = totalRounds - 1 - roundIndex;
  switch (stepsFromFinal) {
    case 0:
      return 'Final';
    case 1:
      return 'Semifinal';
    case 2:
      return 'Cuartos';
    case 3:
      return 'Octavos';
    case 4:
      return 'Dieciseisavos';
    case 5:
      return 'Treintaidosavos';
    default:
      return `Ronda ${roundIndex + 1}`;
  }
}

export function generateKnockoutBracket(players: GamePlayer[]): KnockoutBracket {
  const size = nextPowerOfTwo(players.length);
  const numRounds = Math.log2(size);

  // Seed: 1 vs n, 2 vs n-1, …
  const seeded = [...players];
  while (seeded.length < size) {
    seeded.push({ id: `bye-${seeded.length}`, name: 'BYE', ranking: 0, isCreator: false });
  }

  const firstRoundMatches: KnockoutMatch[] = [];
  for (let i = 0; i < size / 2; i++) {
    const p1 = seeded[i];
    const p2 = seeded[size - 1 - i];
    const isBye1 = p1.id.startsWith('bye-');
    const isBye2 = p2.id.startsWith('bye-');

    let winner: string[] | null = null;
    let status: 'pending' | 'completed' = 'pending';

    if (isBye1 && !isBye2) {
      winner = [p2.id];
      status = 'completed';
    } else if (isBye2 && !isBye1) {
      winner = [p1.id];
      status = 'completed';
    }

    firstRoundMatches.push({
      id: `r1-m${i + 1}`,
      pair1: isBye1 ? null : [p1.id],
      pair2: isBye2 ? null : [p2.id],
      pair1Score: null,
      pair2Score: null,
      winner,
      status,
    });
  }

  const rounds: KnockoutRound[] = [];

  for (let r = 0; r < numRounds; r++) {
    if (r === 0) {
      rounds.push({
        name: knockoutRoundName(numRounds, r),
        matches: firstRoundMatches,
      });
    } else {
      const matchCount = size / Math.pow(2, r + 1);
      const matches: KnockoutMatch[] = Array.from({ length: matchCount }, (_, i) => ({
        id: `r${r + 1}-m${i + 1}`,
        pair1: null,
        pair2: null,
        pair1Score: null,
        pair2Score: null,
        winner: null,
        status: 'pending',
      }));
      rounds.push({ name: knockoutRoundName(numRounds, r), matches });
    }
  }

  return { rounds };
}

// ---------------------------------------------------------------------------
// 5. advanceKnockoutBracket
// ---------------------------------------------------------------------------

export function advanceKnockoutBracket(bracket: KnockoutBracket): KnockoutBracket {
  const rounds = bracket.rounds.map((r) => ({
    ...r,
    matches: r.matches.map((m) => ({ ...m })),
  }));

  for (let r = 0; r < rounds.length - 1; r++) {
    const current = rounds[r];
    const next = rounds[r + 1];

    current.matches.forEach((match, matchIdx) => {
      if (match.status === 'completed' && match.winner) {
        const nextMatchIdx = Math.floor(matchIdx / 2);
        const slot = matchIdx % 2 === 0 ? 'pair1' : 'pair2';
        if (next.matches[nextMatchIdx]) {
          next.matches[nextMatchIdx] = {
            ...next.matches[nextMatchIdx],
            [slot]: match.winner,
          };
        }
      }
    });
  }

  return { rounds };
}

// ---------------------------------------------------------------------------
// 6. generateWorldCupGroups
// ---------------------------------------------------------------------------

export function generateWorldCupGroups(
  players: GamePlayer[],
  numGroups: number,
): GroupStage {
  const groups: Group[] = [];

  // Distribute players snake-style across groups
  const sortedPlayers = [...players].sort((a, b) => b.ranking - a.ranking);

  for (let g = 0; g < numGroups; g++) {
    groups.push({
      id: `group-${g}`,
      name: `Grupo ${String.fromCharCode(65 + g)}`,
      playerIds: [],
      matches: [],
      standings: [],
    });
  }

  sortedPlayers.forEach((player, idx) => {
    const groupIdx = idx % numGroups;
    groups[groupIdx].playerIds.push(player.id);
  });

  // Generate round-robin matches within each group
  groups.forEach((group) => {
    const groupPlayers = players.filter((p) => group.playerIds.includes(p.id));
    const n = groupPlayers.length % 2 === 0 ? groupPlayers.length : groupPlayers.length + 1;
    const numRounds = n - 1;
    let idx = buildCircleIndices(n);
    let courtNum = 1;

    for (let r = 0; r < numRounds; r++) {
      for (let i = 0; i < idx.length; i += 2) {
        if (idx[i] < groupPlayers.length && idx[i + 1] < groupPlayers.length) {
          group.matches.push({
            courtNum: courtNum++,
            pair1: [groupPlayers[idx[i]].id],
            pair2: [groupPlayers[idx[i + 1]].id],
            pair1Score: null,
            pair2Score: null,
            status: 'pending',
          });
        }
      }
      idx = rotateIndices(idx);
    }

    group.standings = groupPlayers.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      pts: 0,
      wins: 0,
      played: 0,
      diff: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    }));
  });

  return { groups };
}

// ---------------------------------------------------------------------------
// 7. calculateStandings
// ---------------------------------------------------------------------------

export function calculateStandings(game: ActiveGame): Standing[] {
  const map = new Map<string, Standing>();

  for (const player of game.players) {
    map.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      pts: 0,
      wins: 0,
      played: 0,
      diff: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
  }

  const isRoundRobin = game.format === 'round_robin' || game.format === 'team_league';

  for (const round of game.rounds) {
    for (const court of round.courts) {
      if (court.status !== 'completed') continue;
      if (court.pair1Score === null || court.pair2Score === null) continue;

      const s1 = court.pair1Score;
      const s2 = court.pair2Score;

      const allInMatch = [...court.pair1, ...court.pair2];

      for (const pid of court.pair1) {
        const s = map.get(pid);
        if (!s) continue;
        s.played += 1;
        s.pointsFor += s1;
        s.pointsAgainst += s2;
        s.diff += s1 - s2;
        if (isRoundRobin) {
          if (s1 > s2) { s.wins += 1; s.pts += 3; }
          else if (s1 === s2) { s.pts += 1; }
        } else {
          s.pts += s1;
          if (s1 > s2) s.wins += 1;
        }
      }

      for (const pid of court.pair2) {
        const s = map.get(pid);
        if (!s) continue;
        s.played += 1;
        s.pointsFor += s2;
        s.pointsAgainst += s1;
        s.diff += s2 - s1;
        if (isRoundRobin) {
          if (s2 > s1) { s.wins += 1; s.pts += 3; }
          else if (s2 === s1) { s.pts += 1; }
        } else {
          s.pts += s2;
          if (s2 > s1) s.wins += 1;
        }
      }

      void allInMatch; // suppress unused warning
    }
  }

  const standings = Array.from(map.values());

  standings.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.pointsFor - a.pointsFor;
  });

  return standings;
}

// ---------------------------------------------------------------------------
// 8. isRoundComplete
// ---------------------------------------------------------------------------

export function isRoundComplete(round: GameRound): boolean {
  return round.courts.length > 0 && round.courts.every((c) => c.status === 'completed');
}

// ---------------------------------------------------------------------------
// 9. isGameFinished
// ---------------------------------------------------------------------------

export function isGameFinished(game: ActiveGame): boolean {
  if (game.rounds.length === 0) return false;

  if (game.format === 'knockout' || game.format === 'world_cup') {
    if (!game.bracket) return false;
    const lastRound = game.bracket.rounds[game.bracket.rounds.length - 1];
    return lastRound?.matches.every((m) => m.status === 'completed') ?? false;
  }

  return game.rounds.every((r) => r.status === 'completed');
}

// ---------------------------------------------------------------------------
// 10. updateMatchScore
// ---------------------------------------------------------------------------

export function updateMatchScore(
  game: ActiveGame,
  roundNum: number,
  courtNum: number,
  pair1Score: number,
  pair2Score: number,
): ActiveGame {
  const rounds = game.rounds.map((round) => {
    if (round.num !== roundNum) return round;

    const courts = round.courts.map((court) => {
      if (court.courtNum !== courtNum) return court;
      return { ...court, pair1Score, pair2Score, status: 'completed' as const };
    });

    const allDone = courts.every((c) => c.status === 'completed');
    return {
      ...round,
      courts,
      status: allDone ? ('completed' as const) : round.status,
    };
  });

  const updated: ActiveGame = { ...game, rounds };
  const standings = calculateStandings(updated);

  const allDone = rounds.every((r) => r.status === 'completed');

  return {
    ...updated,
    standings,
    status: allDone ? 'finished' : updated.status,
  };
}

// ---------------------------------------------------------------------------
// 11. startNextRound
// ---------------------------------------------------------------------------

export function startNextRound(game: ActiveGame): ActiveGame {
  const nextRoundNum = game.currentRound + 1;

  if (
    game.format === 'americano' ||
    game.format === 'round_robin' ||
    game.format === 'team_league'
  ) {
    // All rounds pre-generated — just activate the next one
    const rounds = game.rounds.map((r) => {
      if (r.num === nextRoundNum) return { ...r, status: 'active' as const };
      return r;
    });
    return { ...game, rounds, currentRound: nextRoundNum };
  }

  if (game.format === 'mexicano') {
    const newRound = generateMexicanoRound(
      game.players,
      game.standings,
      game.courts,
      nextRoundNum,
    );
    const activeRound: GameRound = { ...newRound, status: 'active' };
    return {
      ...game,
      rounds: [...game.rounds, activeRound],
      currentRound: nextRoundNum,
    };
  }

  // Knockout / world_cup: bracket-driven, no extra round generation needed
  return { ...game, currentRound: nextRoundNum };
}

// ---------------------------------------------------------------------------
// 12. generateFixedPairsRounds — round robin treating player pairs as units
// ---------------------------------------------------------------------------

export function generateFixedPairsRounds(
  players: GamePlayer[],
  numCourts: number,
): GameRound[] {
  const pairCount = Math.floor(players.length / 2);
  if (pairCount < 2) return [];

  // Even up for circle algorithm
  const n = pairCount % 2 === 0 ? pairCount : pairCount + 1;
  let idx = Array.from({ length: n }, (_, i) => i);
  const rounds: GameRound[] = [];

  for (let r = 0; r < n - 1; r++) {
    const courts: CourtMatch[] = [];
    const resting: string[] = [];

    for (let i = 0; i + 1 < idx.length; i += 2) {
      const pi1 = idx[i];
      const pi2 = idx[i + 1];
      const isBye1 = pi1 >= pairCount;
      const isBye2 = pi2 >= pairCount;

      if (isBye1 && !isBye2) {
        resting.push(players[pi2 * 2].id, players[pi2 * 2 + 1].id);
      } else if (isBye2 && !isBye1) {
        resting.push(players[pi1 * 2].id, players[pi1 * 2 + 1].id);
      } else if (!isBye1 && !isBye2 && courts.length < numCourts) {
        courts.push({
          courtNum: courts.length + 1,
          pair1: [players[pi1 * 2].id, players[pi1 * 2 + 1].id],
          pair2: [players[pi2 * 2].id, players[pi2 * 2 + 1].id],
          pair1Score: null,
          pair2Score: null,
          status: 'pending',
        });
      }
    }

    rounds.push({ num: r + 1, status: 'pending', courts, resting });

    // Circle rotation: fix index 0, rotate the rest
    if (idx.length > 2) {
      const last = idx.pop()!;
      idx.splice(1, 0, last);
    }
  }

  return rounds;
}

// ---------------------------------------------------------------------------
// 13. startGame
// ---------------------------------------------------------------------------

export function startGame(game: ActiveGame): ActiveGame {
  let rounds: GameRound[] = [];

  // Fixed pairs: use pair round-robin instead of individual rotation
  if (game.pairType === 'parejas' && game.players.length >= 4) {
    rounds = generateFixedPairsRounds(game.players, game.courts).map((r, i) =>
      i === 0 ? { ...r, status: 'active' as const } : r,
    );
    return {
      ...game,
      status: 'live',
      rounds,
      currentRound: 1,
      standings: calculateStandings({ ...game, rounds: [] }),
    };
  }

  if (game.format === 'americano' || game.format === 'round_robin' || game.format === 'team_league') {
    rounds = generateAmericanoRounds(game.players, game.courts).map((r, i) =>
      i === 0 ? { ...r, status: 'active' as const } : r,
    );
  } else if (game.format === 'mexicano') {
    const firstRound = generateMexicanoRound(game.players, [], game.courts, 1);
    rounds = [{ ...firstRound, status: 'active' as const }];
  } else if (game.format === 'knockout') {
    const bracket = generateKnockoutBracket(game.players);
    return {
      ...game,
      status: 'live',
      currentRound: 1,
      rounds: [],
      bracket,
      standings: calculateStandings({ ...game, rounds: [] }),
    };
  } else if (game.format === 'world_cup') {
    const numGroups = Math.max(2, Math.floor(game.players.length / 4));
    const groups = generateWorldCupGroups(game.players, numGroups);
    const bracket = generateKnockoutBracket(game.players.slice(0, numGroups * 2));
    return {
      ...game,
      status: 'live',
      currentRound: 1,
      rounds: [],
      groups,
      bracket,
      standings: calculateStandings({ ...game, rounds: [] }),
    };
  }

  const standings = calculateStandings({ ...game, rounds });

  return {
    ...game,
    status: 'live',
    rounds,
    currentRound: 1,
    standings,
  };
}
