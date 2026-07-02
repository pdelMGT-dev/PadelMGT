// ranking-store.ts — Quick Game ranking adjustments (actual +/- delta)

import type { ActiveGame, Standing } from './game-engine';
import { calculateStandings } from './game-engine';
import type { Tournament } from './tournament-store';
import { updatePlayerRankingPoints } from './player-store';
import { createLocalStore } from './local-store';
import { getGlobalRankingConfig } from './ranking-config-store';
import type { PersonalizadoTournament, PersonalizadoMatch, BracketMatch, MatchResult } from './personalizado-store';
export type { RankingTableConfig as RankingConfig } from './ranking-config-store';

const _store = createLocalStore<RankingEntry[]>('padelmgt_ranking_history', [], { seedOnFirstLoad: false });

export type RankingResult = 'win' | 'draw' | 'loss';

export interface RankingEntry {
  id: string;
  gameId: string;
  gameName: string;
  gameDate: string;
  playerId: string;
  playerName: string;
  result: RankingResult;
  delta: number;
  newTotal: number;
  createdAt: string;
  leagueId?: string;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getPlayerCurrentPoints(playerId: string): number {
  try {
    const raw = localStorage.getItem('padelmgt_registered_players') ?? '[]';
    const players: Array<{ id: string; rankingPoints: number }> = JSON.parse(raw);
    return players.find((p) => p.id === playerId)?.rankingPoints ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Determine ranking result for a player from standings.
 * Top third = win, middle = draw, bottom third = loss.
 */
function deriveResult(playerId: string, standings: Standing[]): RankingResult {
  if (standings.length === 0) return 'draw';
  const pos = standings.findIndex((s) => s.playerId === playerId);
  if (pos < 0) return 'draw';
  const n = standings.length;
  if (pos === 0) return 'win';
  if (pos === n - 1) return 'loss';
  if (pos < Math.ceil(n / 3)) return 'win';
  if (pos >= n - Math.floor(n / 3)) return 'loss';
  return 'draw';
}

/**
 * Apply game results to all confirmed players and persist the entries.
 */
export function applyGameRankingResults(game: ActiveGame, leagueId?: string): RankingEntry[] {
  const all = _store.load();
  const created: RankingEntry[] = [];
  const isTraditional = game.scoreConfig?.type === 'traditional';
  const cfg = getGlobalRankingConfig();

  for (const player of game.players) {
    if (all.some((e) => e.gameId === game.id && e.playerId === player.id)) continue;

    const s = game.standings.find(st => st.playerId === player.id);
    let delta = 0;
    if (s) {
      if (isTraditional) {
        delta = s.pointsFor * cfg.pointsWin - s.pointsAgainst * Math.abs(cfg.pointsLoss);
      } else {
        delta = s.wins * cfg.pointsWin + s.draws * cfg.pointsDraw + s.losses * cfg.pointsLoss;
      }
    }

    const result: RankingResult = delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw';
    const current = getPlayerCurrentPoints(player.id);
    const newTotal = Math.max(0, current + delta);

    const entry: RankingEntry = {
      id: generateId(),
      gameId: game.id,
      gameName: game.name,
      gameDate: game.date,
      playerId: player.id,
      playerName: player.name,
      result,
      delta,
      newTotal,
      createdAt: new Date().toISOString(),
      ...(leagueId ? { leagueId } : {}),
    };

    all.push(entry);
    created.push(entry);
    updatePlayerRankingPoints(player.id, delta);
  }

  _store.persist(all);
  return created;
}

/**
 * Apply tournament final standings to ranking and persist entries.
 */
export function applyTournamentRankingResults(tournament: Tournament, leagueId?: string): RankingEntry[] {
  const all = _store.load();
  const created: RankingEntry[] = [];

  if (all.some((e) => e.gameId === tournament.id)) return [];

  const standings = calculateStandings(tournament);
  const cfg = getGlobalRankingConfig();

  for (const standing of standings) {
    const player = tournament.players.find((p) => p.id === standing.playerId);
    if (!player) continue;

    const wins = standing.wins;
    const draws = standing.draws ?? 0;
    const losses = standing.losses ?? (standing.played - wins - draws);
    const delta = wins * cfg.pointsWin + draws * cfg.pointsDraw + losses * cfg.pointsLoss;
    const result: RankingResult = delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw';

    const current = getPlayerCurrentPoints(player.id);
    const newTotal = Math.max(0, current + delta);

    const entry: RankingEntry = {
      id: generateId(),
      gameId: tournament.id,
      gameName: tournament.name,
      gameDate: tournament.date,
      playerId: player.id,
      playerName: player.name,
      result,
      delta,
      newTotal,
      createdAt: new Date().toISOString(),
      ...(leagueId ? { leagueId } : {}),
    };

    all.push(entry);
    created.push(entry);
    updatePlayerRankingPoints(player.id, delta);
  }

  _store.persist(all);
  return created;
}

interface TeamRecord { wins: number; draws: number; losses: number; }

/** Tally one match's outcome (win/draw/loss) into both teams' running records. */
function tallyMatchResult(
  result: MatchResult,
  teamAId: string,
  teamBId: string,
  records: Map<string, TeamRecord>,
): void {
  const recA = records.get(teamAId);
  const recB = records.get(teamBId);
  if (!recA || !recB) return;

  if (result.walkover) {
    const winner = result.winnerId === teamAId ? recA : recB;
    const loser  = result.winnerId === teamAId ? recB : recA;
    winner.wins++;
    loser.losses++;
    return;
  }

  let setsA = 0, setsB = 0;
  for (const s of result.sets) {
    if (s.a > s.b) setsA++;
    else if (s.b > s.a) setsB++;
  }
  if (setsA > setsB) { recA.wins++; recB.losses++; }
  else if (setsB > setsA) { recB.wins++; recA.losses++; }
  else { recA.draws++; recB.draws++; }
}

/**
 * Apply PERSONALIZADO (TP) tournament results to ranking and persist entries.
 *
 * TP has no single flat standings list like classic tournaments — instead each
 * team plays across a per-category group stage and (optionally) a knockout
 * bracket. This aggregates a team's win/draw/loss record across ALL of its
 * matches (group ∪ bracket, every category) and applies the SAME per-match
 * point formula used everywhere else (getGlobalRankingConfig), crediting BOTH
 * players on the team with the identical delta — the pairing is TP's team
 * model, mirroring how classic tournaments credit each individual player.
 * Idempotent: dedups via the same gameId-based check as the other apply* fns,
 * so calling this repeatedly for an already-processed tournament is a no-op.
 */
export function applyPersonalizadoRankingResults(tournament: PersonalizadoTournament): RankingEntry[] {
  const all = _store.load();
  if (all.some((e) => e.gameId === tournament.id)) return [];

  const created: RankingEntry[] = [];
  const cfg = getGlobalRankingConfig();

  // Same "still counts" status set used by calculateGroupStandings.
  const countedTeams = tournament.teams.filter(t => t.status === 'pending' || t.status === 'confirmed');
  const records = new Map<string, TeamRecord>();
  for (const team of countedTeams) records.set(team.id, { wins: 0, draws: 0, losses: 0 });

  const groupMatches: PersonalizadoMatch[] = tournament.config?.matches ?? [];
  const bracketMatches: BracketMatch[] = tournament.config?.bracketMatches ?? [];

  for (const m of groupMatches) {
    if (!m.result) continue;
    tallyMatchResult(m.result, m.teamAId, m.teamBId, records);
  }
  for (const m of bracketMatches) {
    if (!m.result || !m.teamAId || !m.teamBId) continue;
    tallyMatchResult(m.result, m.teamAId, m.teamBId, records);
  }

  for (const team of countedTeams) {
    const rec = records.get(team.id);
    if (!rec || rec.wins + rec.draws + rec.losses === 0) continue; // never took the court

    const delta = rec.wins * cfg.pointsWin + rec.draws * cfg.pointsDraw + rec.losses * cfg.pointsLoss;
    const result: RankingResult = delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw';

    const players: Array<{ id?: string; name?: string }> = [
      { id: team.player1Id, name: team.player1Name },
      { id: team.player2Id, name: team.player2Name },
    ];
    for (const p of players) {
      if (!p.id) continue; // no linked account (e.g. guest-only registration) — nothing to credit
      const current = getPlayerCurrentPoints(p.id);
      const newTotal = Math.max(0, current + delta);
      const entry: RankingEntry = {
        id: generateId(),
        gameId: tournament.id,
        gameName: tournament.name,
        gameDate: tournament.date,
        playerId: p.id,
        playerName: p.name ?? '',
        result,
        delta,
        newTotal,
        createdAt: new Date().toISOString(),
      };
      all.push(entry);
      created.push(entry);
      updatePlayerRankingPoints(p.id, delta);
    }
  }

  _store.persist(all);
  return created;
}

export function getRankingHistoryForPlayer(playerId: string): RankingEntry[] {
  return _store.load().filter((e) => e && e.playerId === playerId);
}

export function getRankingHistoryForGame(gameId: string): RankingEntry[] {
  return _store.load().filter((e) => e && e.gameId === gameId);
}
