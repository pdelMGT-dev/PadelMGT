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
  deuce?: 'ventaja' | 'oro' | 'plata' | 'ipf';
  allowTies?: boolean;   // round_robin: allow set to end equal (e.g. 6-6)
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
  isProvisional?: boolean;  // unregistered fill-in player
}

export interface FixedPair {
  pairIndex: number;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  name?: string;
  groupOrigin?: string;  // e.g. '1° A', '2° B', 'M3° A'
}

export interface CourtMatch {
  courtNum: number;
  pair1: string[];     // player ids (1 or 2 players)
  pair2: string[];     // player ids (1 or 2 players)
  pair1Score: number | null;
  pair2Score: number | null;
  sets?: Array<{ p1: number; p2: number }>; // games per set (traditional mode)
  status: 'pending' | 'completed';
  roundNum?: number;  // for group stage: which RR round this match belongs to (1-indexed)
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
  player2Id?: string;    // set in parejas mode: the second player of the pair
  pts: number;          // points scored (for points mode) or match wins * 3 + draws
  wins: number;         // courts/matches won
  losses: number;
  draws: number;
  played: number;
  diff: number;         // sets diff (setsFor - setsAgainst)
  pointsFor: number;    // sets won
  pointsAgainst: number; // sets lost
  gamesFor?: number;    // total games won (sum of set scores)
  gamesAgainst?: number;
  gamesDiff?: number;
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
  sets?: Array<{ p1: number; p2: number }>;
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
  pjTarget?: number;           // for round_robin: target games per player/pair
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
  coCreatorIds?: string[];    // player IDs that can also manage scores/rounds
  bracket?: KnockoutBracket;  // for knockout/world_cup
  groups?: GroupStage;        // for world_cup / knockout phase I
  knockoutConfig?: KnockoutConfig;
  groupScoreConfig?: ScoreConfig; // knockout with groups: separate score config for group stage
  isCreator?: boolean;        // set by UI when rendering for creator
  cancelledAt?: string;       // ISO date if game was cancelled
  createdAt?: string;         // ISO date when game was first created
  reorganizationRequested?: boolean;
  reorganizationRequestedAt?: string;
  leagueId?: string;   // player-created league this game belongs to
  seasonId?: string;   // league season this game belongs to
}

export interface KnockoutConfig {
  hasGroups: boolean;
  numGroups: number;
  teamsAdvancing: number;     // per group
  currentPhase: 'group_stage' | 'bracket';
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
  pairType?: PairType,
  fixedPairs?: FixedPair[],
): GameRound {
  const isParejas = pairType === 'parejas' && fixedPairs && fixedPairs.length > 0;

  if (isParejas) {
    return generateMexicanoParejas(fixedPairs!, standings, roundNum);
  }

  // Individual mode — new partners every round
  let sorted: GamePlayer[];

  if (roundNum === 1 || standings.length === 0) {
    // R1: random shuffle
    sorted = fisherYates([...players]);
  } else {
    // R2+: sort by pts desc, then diff desc as tiebreaker
    sorted = [...players].sort((a, b) => {
      const sA = standings.find(s => s.playerId === a.id);
      const sB = standings.find(s => s.playerId === b.id);
      if ((sB?.pts ?? 0) !== (sA?.pts ?? 0)) return (sB?.pts ?? 0) - (sA?.pts ?? 0);
      return (sB?.diff ?? 0) - (sA?.diff ?? 0);
    });
  }

  const N = sorted.length;
  const numCts = Math.floor(N / 4);
  const courts: CourtMatch[] = [];
  const restingIds: string[] = [];

  // Mexicano pairing: for court i (0-indexed, out of numCts):
  //   pair1 = [rank(i+1), rank(i+1 + numCts)]  — e.g., ranks 1&3 for i=0 with numCts=2
  //   pair2 = [rank(i+1 + 2*numCts), rank(i+1 + 3*numCts)]  — e.g., ranks 5&7
  for (let i = 0; i < numCts; i++) {
    courts.push({
      courtNum: i + 1,
      pair1: [sorted[i].id, sorted[i + numCts].id],
      pair2: [sorted[i + 2 * numCts].id, sorted[i + 3 * numCts].id],
      pair1Score: null,
      pair2Score: null,
      status: 'pending',
    });
  }

  for (let i = numCts * 4; i < N; i++) {
    restingIds.push(sorted[i].id);
  }

  return { num: roundNum, status: 'pending', courts, resting: restingIds };
}

function generateMexicanoParejas(
  fixedPairs: FixedPair[],
  standings: Standing[],
  roundNum: number,
): GameRound {
  let sortedPairs: FixedPair[];

  if (roundNum === 1 || standings.length === 0) {
    sortedPairs = fisherYates([...fixedPairs]);
  } else {
    sortedPairs = [...fixedPairs].sort((a, b) => {
      const sA = standings.find(s => s.playerId === a.player1Id);
      const sB = standings.find(s => s.playerId === b.player1Id);
      if ((sB?.pts ?? 0) !== (sA?.pts ?? 0)) return (sB?.pts ?? 0) - (sA?.pts ?? 0);
      return (sB?.diff ?? 0) - (sA?.diff ?? 0);
    });
  }

  const N = sortedPairs.length;
  const numCts = Math.floor(N / 2);
  const courts: CourtMatch[] = [];
  const restingIds: string[] = [];

  // Mexicano for pairs: pair[i] vs pair[i + numCts]
  for (let i = 0; i < numCts; i++) {
    const fp1 = sortedPairs[i];
    const fp2 = sortedPairs[i + numCts];
    courts.push({
      courtNum: i + 1,
      pair1: [fp1.player1Id, fp1.player2Id],
      pair2: [fp2.player1Id, fp2.player2Id],
      pair1Score: null,
      pair2Score: null,
      status: 'pending',
    });
  }

  if (N % 2 !== 0) {
    const last = sortedPairs[N - 1];
    restingIds.push(last.player1Id, last.player2Id);
  }

  return { num: roundNum, status: 'pending', courts, resting: restingIds };
}

function fisherYates<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// 3. generateRoundRobinRounds
// ---------------------------------------------------------------------------

export function generateRoundRobinRounds(
  players: GamePlayer[],
  numCourts: number,
  pjTarget: number,
): GameRound[] {
  const N = players.length;
  const playPerRound = Math.min(numCourts * 4, N);
  const effectiveCourts = Math.floor(playPerRound / 4);
  const totalRounds = effectiveCourts === 0
    ? 0
    : Math.ceil((N * pjTarget) / (effectiveCourts * 4));

  // Track how many games each player still needs to play
  const gamesLeft = new Map<string, number>(players.map(p => [p.id, pjTarget]));

  // Partner and opponent frequency maps for variety optimization
  const partnerFreq = new Map<string, Map<string, number>>();
  const opponentFreq = new Map<string, Map<string, number>>();
  for (const p of players) {
    partnerFreq.set(p.id, new Map());
    opponentFreq.set(p.id, new Map());
  }

  const rounds: GameRound[] = [];

  for (let r = 0; r < totalRounds; r++) {
    // Sort players by gamesLeft DESC (most needed first), shuffle within ties
    const sorted = [...players]
      .map(p => ({ p, left: gamesLeft.get(p.id) ?? 0, rnd: Math.random() }))
      .sort((a, b) => b.left - a.left || a.rnd - b.rnd)
      .map(x => x.p);

    const active = sorted.slice(0, effectiveCourts * 4);
    const resting = sorted.slice(effectiveCourts * 4);

    // Decrement gamesLeft for active players
    for (const p of active) {
      gamesLeft.set(p.id, Math.max(0, (gamesLeft.get(p.id) ?? 0) - 1));
    }

    // Assign courts using greedy partner/opponent variety
    const courts = rrAssignCourts(active, effectiveCourts, partnerFreq, opponentFreq);

    // Update frequency maps
    for (const court of courts) {
      const [a, b] = court.pair1;
      const [c, d] = court.pair2;
      incFreq(partnerFreq, a, b); incFreq(partnerFreq, b, a);
      incFreq(partnerFreq, c, d); incFreq(partnerFreq, d, c);
      for (const p of [a, b]) for (const q of [c, d]) { incFreq(opponentFreq, p, q); incFreq(opponentFreq, q, p); }
    }

    rounds.push({
      num: r + 1,
      status: r === 0 ? 'active' : 'pending',
      courts,
      resting: resting.map(p => p.id),
    });
  }

  return rounds;
}

function incFreq(freq: Map<string, Map<string, number>>, a: string, b: string) {
  let inner = freq.get(a);
  if (!inner) { inner = new Map(); freq.set(a, inner); }
  inner.set(b, (inner.get(b) ?? 0) + 1);
}

function getFreq(freq: Map<string, Map<string, number>>, a: string, b: string): number {
  return freq.get(a)?.get(b) ?? 0;
}

function rrAssignCourts(
  players: GamePlayer[],
  numCourts: number,
  partnerFreq: Map<string, Map<string, number>>,
  opponentFreq: Map<string, Map<string, number>>,
): CourtMatch[] {
  const courts: CourtMatch[] = [];
  const remaining = [...players];

  for (let c = 0; c < numCourts && remaining.length >= 4; c++) {
    const p1 = remaining.shift()!;

    // Best partner for p1: least-used partner from remaining
    let bestPartnerIdx = 0;
    let minPart = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const f = getFreq(partnerFreq, p1.id, remaining[i].id);
      if (f < minPart) { minPart = f; bestPartnerIdx = i; }
    }
    const p2 = remaining.splice(bestPartnerIdx, 1)[0];

    // Best opposing pair from remaining: minimize partner repetition + opponent repetition
    let bestScore = Infinity;
    let bestI = 0, bestJ = 1;
    for (let i = 0; i < remaining.length; i++) {
      for (let j = i + 1; j < remaining.length; j++) {
        const p3 = remaining[i]; const p4 = remaining[j];
        const partScore = getFreq(partnerFreq, p3.id, p4.id);
        const oppScore =
          getFreq(opponentFreq, p1.id, p3.id) + getFreq(opponentFreq, p1.id, p4.id) +
          getFreq(opponentFreq, p2.id, p3.id) + getFreq(opponentFreq, p2.id, p4.id);
        const total = partScore * 4 + oppScore;
        if (total < bestScore) { bestScore = total; bestI = i; bestJ = j; }
      }
    }

    const p4 = remaining.splice(bestJ, 1)[0];
    const p3 = remaining.splice(bestI, 1)[0];

    courts.push({
      courtNum: c + 1,
      pair1: [p1.id, p2.id],
      pair2: [p3.id, p4.id],
      pair1Score: null,
      pair2Score: null,
      status: 'pending',
    });
  }

  return courts;
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
      losses: 0,
      draws: 0,
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
  // ── Parejas fijas: one entry per pair ────────────────────────────────────
  const isPairejas = game.pairType === 'parejas' && (game.fixedPairs?.length ?? 0) > 0;
  if (isPairejas && game.fixedPairs) {
    const pairMap = new Map<string, Standing>();
    const playerToPairKey = new Map<string, string>(); // both player1 and player2 → player1Id
    for (const fp of game.fixedPairs) {
      pairMap.set(fp.player1Id, {
        playerId: fp.player1Id,
        player2Id: fp.player2Id,
        playerName: fp.name ?? `${fp.player1Name} / ${fp.player2Name}`,
        pts: 0, wins: 0, losses: 0, draws: 0, played: 0,
        diff: 0, pointsFor: 0, pointsAgainst: 0,
      });
      playerToPairKey.set(fp.player1Id, fp.player1Id);
      playerToPairKey.set(fp.player2Id, fp.player1Id);
    }
    for (const round of game.rounds) {
      for (const court of round.courts) {
        if (court.status !== 'completed') continue;
        if (court.pair1Score === null || court.pair2Score === null) continue;
        const s1 = court.pair1Score;
        const s2 = court.pair2Score;
        const k1 = playerToPairKey.get(court.pair1[0]);
        const k2 = playerToPairKey.get(court.pair2[0]);
        const st1 = k1 ? pairMap.get(k1) : undefined;
        const st2 = k2 ? pairMap.get(k2) : undefined;
        if (st1) {
          st1.played += 1; st1.pointsFor += s1; st1.pointsAgainst += s2; st1.diff += s1 - s2; st1.pts += s1;
          if (s1 > s2) st1.wins += 1; else if (s1 === s2) st1.draws += 1; else st1.losses += 1;
        }
        if (st2) {
          st2.played += 1; st2.pointsFor += s2; st2.pointsAgainst += s1; st2.diff += s2 - s1; st2.pts += s2;
          if (s2 > s1) st2.wins += 1; else if (s2 === s1) st2.draws += 1; else st2.losses += 1;
        }
      }
    }
    return Array.from(pairMap.values()).sort((a, b) =>
      b.pts !== a.pts ? b.pts - a.pts : b.diff !== a.diff ? b.diff - a.diff : b.pointsFor - a.pointsFor
    );
  }

  // ── Individual mode ───────────────────────────────────────────────────────
  const map = new Map<string, Standing>();

  for (const player of game.players) {
    map.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      pts: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      played: 0,
      diff: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
  }

  const isRoundRobin = game.format === 'round_robin' || game.format === 'team_league';

  // head-to-head record: matchRecord[pidA][pidB] = net match pts (positive = A beat B overall)
  const matchRecord = new Map<string, Map<string, number>>();
  const initH2H = (pid: string) => {
    if (!matchRecord.has(pid)) matchRecord.set(pid, new Map());
  };

  for (const round of game.rounds) {
    for (const court of round.courts) {
      if (court.status !== 'completed') continue;
      if (court.pair1Score === null || court.pair2Score === null) continue;

      const s1 = court.pair1Score;
      const s2 = court.pair2Score;

      // For round_robin with traditional scoring, use games from sets for diff/pointsFor
      let gamesFor1 = s1;
      let gamesFor2 = s2;
      if (isRoundRobin && court.sets && court.sets.length > 0) {
        gamesFor1 = court.sets.reduce((sum, set) => sum + set.p1, 0);
        gamesFor2 = court.sets.reduce((sum, set) => sum + set.p2, 0);
      }

      for (const pid of court.pair1) {
        const s = map.get(pid);
        if (!s) continue;
        s.played += 1;
        s.pointsFor += gamesFor1;
        s.pointsAgainst += gamesFor2;
        s.diff += gamesFor1 - gamesFor2;
        if (isRoundRobin) {
          if (s1 > s2) { s.wins += 1; s.pts += 3; }
          else if (s1 === s2) { s.draws += 1; s.pts += 1; }
          else { s.losses += 1; s.pts -= 1; }
        } else {
          s.pts += s1;
          if (s1 > s2) s.wins += 1;
          else if (s1 === s2) s.draws += 1;
          else s.losses += 1;
        }
        // h2h
        if (isRoundRobin) {
          for (const opp of court.pair2) {
            initH2H(pid); initH2H(opp);
            const delta = s1 > s2 ? 1 : s1 < s2 ? -1 : 0;
            matchRecord.get(pid)!.set(opp, (matchRecord.get(pid)!.get(opp) ?? 0) + delta);
            matchRecord.get(opp)!.set(pid, (matchRecord.get(opp)!.get(pid) ?? 0) - delta);
          }
        }
      }

      for (const pid of court.pair2) {
        const s = map.get(pid);
        if (!s) continue;
        s.played += 1;
        s.pointsFor += gamesFor2;
        s.pointsAgainst += gamesFor1;
        s.diff += gamesFor2 - gamesFor1;
        if (isRoundRobin) {
          if (s2 > s1) { s.wins += 1; s.pts += 3; }
          else if (s2 === s1) { s.draws += 1; s.pts += 1; }
          else { s.losses += 1; s.pts -= 1; }
        } else {
          s.pts += s2;
          if (s2 > s1) s.wins += 1;
          else if (s2 === s1) s.draws += 1;
          else s.losses += 1;
        }
      }
    }
  }

  const standings = Array.from(map.values());

  standings.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    // Head-to-head tiebreaker (only for exactly 2 tied players)
    if (isRoundRobin) {
      const h2h = matchRecord.get(a.playerId)?.get(b.playerId);
      if (h2h !== undefined && h2h !== 0) return h2h > 0 ? -1 : 1;
    }
    return 0;
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
  sets?: Array<{ p1: number; p2: number }>,
): ActiveGame {
  const rounds = game.rounds.map((round) => {
    if (round.num !== roundNum) return round;

    const courts = round.courts.map((court) => {
      if (court.courtNum !== courtNum) return court;
      return { ...court, pair1Score, pair2Score, ...(sets ? { sets } : {}), status: 'completed' as const };
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

  let newStatus = updated.status;
  if (allDone) {
    if (game.format === 'mexicano') {
      // For Mexicano, only auto-finish when max rounds reached
      const maxRounds = game.pairType === 'parejas' && (game.fixedPairs?.length ?? 0) > 0
        ? game.fixedPairs!.length
        : game.players.length;
      if (game.currentRound >= maxRounds) newStatus = 'finished';
      // Otherwise keep 'live' — next round generated on demand
    } else {
      newStatus = 'finished';
    }
  }

  return { ...updated, standings, status: newStatus };
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
      game.pairType,
      game.fixedPairs,
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

// ---------------------------------------------------------------------------
// 14. generateKnockoutBracketFromPairs — seeded bracket from FixedPair list
// ---------------------------------------------------------------------------

export function generateKnockoutBracketFromPairs(pairs: FixedPair[]): KnockoutBracket {
  const size = nextPowerOfTwo(pairs.length);
  const numRounds = Math.log2(size);

  const seeded: (FixedPair | null)[] = [...pairs];
  while (seeded.length < size) seeded.push(null);

  const firstRoundMatches: KnockoutMatch[] = [];
  for (let i = 0; i < size / 2; i++) {
    const fp1 = seeded[i];
    const fp2 = seeded[size - 1 - i];

    let winner: string[] | null = null;
    let status: 'pending' | 'completed' = 'pending';

    if (!fp1 && fp2) {
      winner = [fp2.player1Id, fp2.player2Id];
      status = 'completed';
    } else if (fp1 && !fp2) {
      winner = [fp1.player1Id, fp1.player2Id];
      status = 'completed';
    }

    firstRoundMatches.push({
      id: `r1-m${i + 1}`,
      pair1: fp1 ? [fp1.player1Id, fp1.player2Id] : null,
      pair2: fp2 ? [fp2.player1Id, fp2.player2Id] : null,
      pair1Score: null,
      pair2Score: null,
      winner,
      status,
    });
  }

  const rounds: KnockoutRound[] = [];
  for (let r = 0; r < numRounds; r++) {
    if (r === 0) {
      rounds.push({ name: knockoutRoundName(numRounds, r), matches: firstRoundMatches });
    } else {
      const matchCount = size / Math.pow(2, r + 1);
      const matches: KnockoutMatch[] = Array.from({ length: matchCount }, (_, i) => ({
        id: `r${r + 1}-m${i + 1}`,
        pair1: null, pair2: null, pair1Score: null, pair2Score: null,
        winner: null, status: 'pending' as const,
      }));
      rounds.push({ name: knockoutRoundName(numRounds, r), matches });
    }
  }

  // Propagate byes
  return advanceKnockoutBracket({ rounds });
}

// ---------------------------------------------------------------------------
// 15. generateKnockoutGroupStage — phase I groups for knockout tournament
// ---------------------------------------------------------------------------

export function generateKnockoutGroupStage(pairs: FixedPair[], numGroups: number, numCourts: number = 2): GroupStage {
  const groups: Group[] = Array.from({ length: numGroups }, (_, g) => ({
    id: `group-${g}`,
    name: `Grupo ${String.fromCharCode(65 + g)}`,
    playerIds: [],
    matches: [],
    standings: [],
  }));

  // Distribute snake-style for balance (same as before)
  pairs.forEach((pair, idx) => {
    const row = Math.floor(idx / numGroups);
    const col = row % 2 === 0 ? idx % numGroups : numGroups - 1 - (idx % numGroups);
    groups[col].playerIds.push(pair.player1Id, pair.player2Id);
  });

  groups.forEach(group => {
    const groupPairs = pairs.filter(fp => group.playerIds.includes(fp.player1Id));
    const G = groupPairs.length;
    if (G < 2) {
      group.standings = [];
      return;
    }

    // Circle method round-robin: G-1 rounds for even G, G rounds for odd G
    const n = G % 2 === 0 ? G : G + 1;
    let idx = Array.from({ length: n }, (_, i) => i);
    let courtCounter = 1;

    for (let r = 0; r < n - 1; r++) {
      // Generate all matches for this RR round
      for (let i = 0; i < n / 2; i++) {
        const a = idx[i];
        const b = idx[n - 1 - i];
        if (a < G && b < G) {
          group.matches.push({
            courtNum: courtCounter++,
            pair1: [groupPairs[a].player1Id, groupPairs[a].player2Id],
            pair2: [groupPairs[b].player1Id, groupPairs[b].player2Id],
            pair1Score: null,
            pair2Score: null,
            status: 'pending',
            roundNum: r + 1,
          });
        }
      }
      // Circle rotation: fix idx[0], move last to position 1
      const last = idx[n - 1];
      idx = [idx[0], last, ...idx.slice(1, n - 1)];
    }

    group.standings = groupPairs.map(fp => ({
      playerId: fp.player1Id,
      playerName: fp.name ?? `${fp.player1Name} / ${fp.player2Name}`,
      pts: 0, wins: 0, losses: 0, draws: 0, played: 0, diff: 0, pointsFor: 0, pointsAgainst: 0,
    }));
  });

  return { groups };
}

// ---------------------------------------------------------------------------
// 16. calculateGroupStandings — recalculate standings for one group
// ---------------------------------------------------------------------------

export function calculateGroupStandings(group: Group, pairs: FixedPair[]): Standing[] {
  const map = new Map<string, Standing>();
  pairs
    .filter(fp => group.playerIds.includes(fp.player1Id))
    .forEach(fp => {
      map.set(fp.player1Id, {
        playerId: fp.player1Id,
        playerName: fp.name ?? `${fp.player1Name} / ${fp.player2Name}`,
        pts: 0, wins: 0, losses: 0, draws: 0, played: 0,
        diff: 0, pointsFor: 0, pointsAgainst: 0,
        gamesFor: 0, gamesAgainst: 0, gamesDiff: 0,
      });
    });

  for (const match of group.matches) {
    if (match.status !== 'completed' || match.pair1Score === null || match.pair2Score === null) continue;
    const s1 = match.pair1Score;  // sets won by pair1
    const s2 = match.pair2Score;  // sets won by pair2
    const p1rep = match.pair1[0];
    const p2rep = match.pair2[0];

    const st1 = map.get(p1rep);
    const st2 = map.get(p2rep);

    // Accumulate set-level stats
    if (st1) {
      st1.played++;
      st1.pointsFor += s1; st1.pointsAgainst += s2; st1.diff = st1.pointsFor - st1.pointsAgainst;
      if (s1 > s2) { st1.wins++; st1.pts += 3; }
      else if (s1 === s2) { st1.draws++; st1.pts += 1; }
      else { st1.losses++; st1.pts -= 1; }
    }
    if (st2) {
      st2.played++;
      st2.pointsFor += s2; st2.pointsAgainst += s1; st2.diff = st2.pointsFor - st2.pointsAgainst;
      if (s2 > s1) { st2.wins++; st2.pts += 3; }
      else if (s2 === s1) { st2.draws++; st2.pts += 1; }
      else { st2.losses++; st2.pts -= 1; }
    }

    // Accumulate game-level stats (from sets array)
    if (match.sets && match.sets.length > 0) {
      let gf1 = 0, ga1 = 0, gf2 = 0, ga2 = 0;
      for (const s of match.sets) {
        gf1 += s.p1; ga1 += s.p2;
        gf2 += s.p2; ga2 += s.p1;
      }
      if (st1) { st1.gamesFor = (st1.gamesFor ?? 0) + gf1; st1.gamesAgainst = (st1.gamesAgainst ?? 0) + ga1; st1.gamesDiff = (st1.gamesFor ?? 0) - (st1.gamesAgainst ?? 0); }
      if (st2) { st2.gamesFor = (st2.gamesFor ?? 0) + gf2; st2.gamesAgainst = (st2.gamesAgainst ?? 0) + ga2; st2.gamesDiff = (st2.gamesFor ?? 0) - (st2.gamesAgainst ?? 0); }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts :
    b.diff !== a.diff ? b.diff - a.diff :
    (b.gamesDiff ?? 0) !== (a.gamesDiff ?? 0) ? (b.gamesDiff ?? 0) - (a.gamesDiff ?? 0) :
    (b.gamesFor ?? 0) - (a.gamesFor ?? 0)
  );
}
