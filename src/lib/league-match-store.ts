import { createLocalStore } from './local-store';

export interface LeagueMatch {
  id: string;
  leagueId: string;
  season: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  venue: string;
  status: 'scheduled' | 'played' | 'cancelled';
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  club: string;
  pj: number;
  pg: number;
  pp: number;
  pe: number;
  gf: number;
  gc: number;
  dif: number;
  pts: number;
}

const _store = createLocalStore<LeagueMatch[]>('padelmgt_league_matches', [], { seedOnFirstLoad: false });

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `lm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getMatchesByLeague(leagueId: string): LeagueMatch[] {
  return _store.load().filter(m => m.leagueId === leagueId);
}

export function getMatchesBySeason(leagueId: string, season: string): LeagueMatch[] {
  return _store.load().filter(m => m.leagueId === leagueId && m.season === season);
}

export function saveMatch(match: LeagueMatch): void {
  const all = _store.load();
  const idx = all.findIndex(m => m.id === match.id);
  if (idx >= 0) all[idx] = match; else all.push(match);
  _store.persist(all);
}

export function createMatch(params: Omit<LeagueMatch, 'id'>): LeagueMatch {
  const match: LeagueMatch = { ...params, id: generateId() };
  saveMatch(match);
  return match;
}

export function deleteMatch(id: string): void {
  _store.persist(_store.load().filter(m => m.id !== id));
}

export function computeStandings(
  matches: LeagueMatch[],
  teams: { id: string; name: string; club: string }[],
): TeamStanding[] {
  const map = new Map<string, TeamStanding>();
  for (const t of teams) {
    map.set(t.id, { teamId: t.id, teamName: t.name, club: t.club, pj: 0, pg: 0, pp: 0, pe: 0, gf: 0, gc: 0, dif: 0, pts: 0 });
  }

  for (const m of matches) {
    if (m.status !== 'played' || m.homeScore === null || m.awayScore === null) continue;
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;

    home.pj++; away.pj++;
    home.gf += m.homeScore; home.gc += m.awayScore;
    away.gf += m.awayScore; away.gc += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.pg++; home.pts += 3; away.pp++;
    } else if (m.awayScore > m.homeScore) {
      away.pg++; away.pts += 3; home.pp++;
    } else {
      home.pe++; home.pts += 1; away.pe++; away.pts += 1;
    }

    home.dif = home.gf - home.gc;
    away.dif = away.gf - away.gc;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dif !== a.dif) return b.dif - a.dif;
    return b.gf - a.gf;
  });
}
