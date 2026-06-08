'use client';

import { getAllGames } from './game-store';
import { getAllTournaments } from './tournament-store';
import type { ActiveGame } from './game-engine';
import type { Tournament } from './tournament-store';

export type MatchEntry = {
  id: string;
  date: string;
  time?: string;
  gameName: string;
  gameId: string;
  entityType: 'game' | 'tournament';
  roundNum: number;
  partner: string;
  opponents: string;
  userScore: number;
  opponentScore: number;
  result: 'V' | 'D' | 'T';
  scoreLabel: string;
};

function playerName(players: { id: string; name: string }[], id: string): string {
  return players.find(p => p.id === id)?.name ?? id;
}

function extractFromEntity(
  userId: string,
  entityId: string,
  entityType: 'game' | 'tournament',
  name: string,
  date: string,
  time: string | undefined,
  rounds: { num: number; status: string; courts: { courtNum: number; pair1: string[]; pair2: string[]; pair1Score: number | null; pair2Score: number | null; status: string }[] }[],
  players: { id: string; name: string }[],
): MatchEntry[] {
  const entries: MatchEntry[] = [];
  for (const round of rounds) {
    for (const court of round.courts) {
      if (court.pair1Score === null || court.pair2Score === null) continue;
      const inPair1 = court.pair1.includes(userId);
      const inPair2 = court.pair2.includes(userId);
      if (!inPair1 && !inPair2) continue;

      const myPair = inPair1 ? court.pair1 : court.pair2;
      const theirPair = inPair1 ? court.pair2 : court.pair1;
      const myScore = inPair1 ? court.pair1Score : court.pair2Score;
      const theirScore = inPair1 ? court.pair2Score : court.pair1Score;

      const partnerIds = myPair.filter(id => id !== userId);
      const partnerName = partnerIds.length > 0 ? playerName(players, partnerIds[0]) : '—';
      const opponentNames = theirPair.map(id => playerName(players, id)).join(' / ');

      const result: 'V' | 'D' | 'T' = myScore > theirScore ? 'V' : myScore < theirScore ? 'D' : 'T';

      entries.push({
        id: `${entityId}-r${round.num}-c${court.courtNum}`,
        date,
        time,
        gameName: name,
        gameId: entityId,
        entityType,
        roundNum: round.num,
        partner: partnerName,
        opponents: opponentNames,
        userScore: myScore,
        opponentScore: theirScore,
        result,
        scoreLabel: `${myScore} – ${theirScore}`,
      });
    }
  }
  return entries;
}

export function getMatchHistoryForPlayer(userId: string): MatchEntry[] {
  const entries: MatchEntry[] = [];

  for (const game of getAllGames()) {
    const gPlayers = Array.isArray(game.players) ? game.players : [];
    if (!gPlayers.some(p => p.id === userId)) continue;
    entries.push(
      ...extractFromEntity(userId, game.id, 'game', game.name, game.date, game.time, game.rounds as never, gPlayers)
    );
  }

  for (const t of getAllTournaments()) {
    const tPlayers = Array.isArray(t.players) ? t.players : [];
    if (!tPlayers.some(p => p.id === userId)) continue;
    entries.push(
      ...extractFromEntity(userId, t.id, 'tournament', t.name, t.date, t.time, t.rounds as never, tPlayers)
    );
  }

  // Sort most recent first (by date desc, then round desc)
  entries.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.roundNum - a.roundNum;
  });

  return entries;
}

export type UpcomingEvent = {
  id: string;
  name: string;
  date: string;
  time: string;
  club: string;
  city: string;
  format: string;
  players: number;
  maxPlayers: number;
  entityType: 'game' | 'tournament';
};

export function getNextEventForPlayer(userId: string): UpcomingEvent | null {
  const events: (UpcomingEvent & { sortKey: string })[] = [];

  for (const game of getAllGames()) {
    if (game.cancelledAt) continue;
    if (game.status === 'finished') continue;
    const gPlayers = Array.isArray(game.players) ? game.players : [];
    if (!gPlayers.some(p => p.id === userId) && game.creatorId !== userId) continue;
    events.push({
      id: game.id, name: game.name, date: game.date, time: game.time,
      club: game.club, city: game.city, format: game.format,
      players: gPlayers.length, maxPlayers: game.maxPlayers,
      entityType: 'game',
      sortKey: `${game.date}${game.time ?? ''}`,
    });
  }

  for (const t of getAllTournaments()) {
    if (t.cancelledAt) continue;
    if (t.status === 'finished') continue;
    const tPlayers = Array.isArray(t.players) ? t.players : [];
    if (!tPlayers.some(p => p.id === userId) && t.creatorId !== userId) continue;
    events.push({
      id: t.id, name: t.name, date: t.date, time: t.time ?? '',
      club: t.club, city: t.city, format: t.format,
      players: tPlayers.length, maxPlayers: t.maxPlayers,
      entityType: 'tournament',
      sortKey: `${t.date}${t.time ?? ''}`,
    });
  }

  events.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  if (events.length === 0) return null;
  const { sortKey: _sk, ...rest } = events[0];
  return rest;
}

export function getActiveEventsForPlayer(userId: string): {
  id: string; name: string; date: string; time: string; club: string; city: string;
  status: string; format: string; players: number; maxPlayers: number;
  entityType: 'game' | 'tournament'; isCreator: boolean;
}[] {
  const result = [];

  for (const game of getAllGames()) {
    if (game.cancelledAt) continue;
    if (game.status === 'finished') continue;
    const players = Array.isArray(game.players) ? game.players : [];
    const isCreator = game.creatorId === userId || players.some(p => p.id === userId && p.isCreator);
    const isPlayer = players.some(p => p.id === userId);
    if (!isCreator && !isPlayer) continue;
    result.push({
      id: game.id, name: game.name, date: game.date, time: game.time,
      club: game.club, city: game.city, status: game.status, format: game.format,
      players: players.length, maxPlayers: game.maxPlayers,
      entityType: 'game' as const, isCreator,
    });
  }

  for (const t of getAllTournaments()) {
    if (t.cancelledAt) continue;
    if (t.status === 'finished') continue;
    const tPlayers = Array.isArray(t.players) ? t.players : [];
    const isCreator = t.creatorId === userId;
    const isPlayer = tPlayers.some(p => p.id === userId);
    if (!isCreator && !isPlayer) continue;
    result.push({
      id: t.id, name: t.name, date: t.date, time: t.time ?? '',
      club: t.club, city: t.city, status: t.status, format: t.format,
      players: tPlayers.length, maxPlayers: t.maxPlayers,
      entityType: 'tournament' as const, isCreator,
    });
  }

  result.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return result;
}
