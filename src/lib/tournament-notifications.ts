// Progression notifications for "Torneos clásicos" (knockout / world_cup formats).
// Mirrors the TP system: when pairs qualify to the bracket, win/advance, get eliminated, or are
// assigned a next match, their players receive an in-app notification (campana). Reuses the
// generic insert + NotifItem type from the personalizado store and the shared notifications table.

import { createNotifications, type NotifItem } from './personalizado-store';
import type { ActiveGame } from './game-engine';

export { createNotifications };

function nameOf(t: ActiveGame, id: string): string {
  const p = t.players.find(x => x.id === id);
  if (p) return p.name;
  const fp = (t.fixedPairs ?? []).find(f => f.player1Id === id || f.player2Id === id);
  if (fp) return fp.player1Id === id ? fp.player1Name : fp.player2Name;
  return 'Jugador';
}

function pairLabel(t: ActiveGame, ids: string[]): string {
  return ids.map(id => nameOf(t, id)).join(' / ');
}

const linkFor = (t: ActiveGame) => `/dashboard/player/tournaments/${t.id}`;

/** A real (non-bye, non-empty) pair of player ids. */
function isRealPair(ids: string[] | null | undefined): ids is string[] {
  return !!ids && ids.length > 0 && ids.every(id => !!id && !id.startsWith('bye'));
}

function eq(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((x, i) => x === b[i]);
}

/**
 * Notifications fired right after "Avanzar al Cuadro" builds the first bracket round from the group
 * standings: every qualified pair is told they advanced, and any first-round match with both pairs
 * set produces a "next match" notice. Dedups against `t.notifiedEvents`.
 */
export function classicAdvanceNotifications(t: ActiveGame): { items: NotifItem[]; notifiedEvents: string[] } {
  const sent = new Set(t.notifiedEvents ?? []);
  const items: NotifItem[] = [];
  const round0 = t.bracket?.rounds?.[0];
  if (!round0) return { items, notifiedEvents: [...sent] };
  const link = linkFor(t);

  for (const m of round0.matches) {
    for (const pair of [m.pair1, m.pair2]) {
      if (!isRealPair(pair)) continue;
      const key = `q:${m.id}:${pair.join('-')}`;
      if (sent.has(key)) continue;
      sent.add(key);
      for (const pid of pair) items.push({ playerId: pid, type: 'qualified', link, message: `¡Clasificaste a la fase de eliminatorias de ${t.name}!` });
    }
    if (isRealPair(m.pair1) && isRealPair(m.pair2)) {
      const nk = `nm:${m.id}`;
      if (!sent.has(nk)) {
        sent.add(nk);
        for (const [pair, rival] of [[m.pair1, m.pair2], [m.pair2, m.pair1]] as const)
          for (const pid of pair) items.push({ playerId: pid, type: 'next_match', link, message: `Tu próximo partido en ${t.name} es vs ${pairLabel(t, rival)}` });
      }
    }
  }
  return { items, notifiedEvents: [...sent] };
}

/**
 * Notifications fired after a bracket match is scored: the winner advanced (or is champion), the
 * loser is eliminated, and if the parent match now has both opponents, both get a "next match"
 * notice. Dedups against `next.notifiedEvents`.
 */
export function classicBracketNotifications(
  next: ActiveGame,
  roundIdx: number,
  matchIdx: number,
): { items: NotifItem[]; notifiedEvents: string[] } {
  const sent = new Set(next.notifiedEvents ?? []);
  const items: NotifItem[] = [];
  const rounds = next.bracket?.rounds ?? [];
  const m = rounds[roundIdx]?.matches[matchIdx];
  if (!m || m.status !== 'completed' || !isRealPair(m.winner)) return { items, notifiedEvents: [...sent] };
  const link = linkFor(next);

  const winner = m.winner;
  const loser = eq(winner, m.pair1) ? m.pair2 : m.pair1;
  const isFinal = roundIdx === rounds.length - 1;

  const wk = `adv:${roundIdx}:${matchIdx}:${winner.join('-')}`;
  if (!sent.has(wk)) {
    sent.add(wk);
    const msg = isFinal
      ? `🏆 ¡Campeones de ${next.name}!`
      : `¡Ganaron y avanzan a ${rounds[roundIdx + 1]?.name ?? 'la siguiente ronda'} en ${next.name}!`;
    for (const pid of winner) items.push({ playerId: pid, type: 'advanced', link, message: msg });
  }

  if (isRealPair(loser)) {
    const lk = `elim:${roundIdx}:${matchIdx}:${loser.join('-')}`;
    if (!sent.has(lk)) {
      sent.add(lk);
      for (const pid of loser) items.push({ playerId: pid, type: 'eliminated', link, message: `Quedaron eliminados en ${rounds[roundIdx].name} de ${next.name}. ¡Gracias por competir!` });
    }
  }

  const parent = rounds[roundIdx + 1]?.matches[Math.floor(matchIdx / 2)];
  if (parent && isRealPair(parent.pair1) && isRealPair(parent.pair2)) {
    const nk = `nm:${parent.id}`;
    if (!sent.has(nk)) {
      sent.add(nk);
      for (const [pair, rival] of [[parent.pair1, parent.pair2], [parent.pair2, parent.pair1]] as const)
        for (const pid of pair) items.push({ playerId: pid, type: 'next_match', link, message: `Tu próximo partido en ${next.name} es vs ${pairLabel(next, rival)}` });
    }
  }

  return { items, notifiedEvents: [...sent] };
}
