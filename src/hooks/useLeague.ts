'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { getLeagueByOwner, saveLeague, type ManagedLeague } from '@/lib/league-store';
import { getTeamsByLeague, type LeagueTeam } from '@/lib/team-store';
import { getMatchesBySeason, computeStandings, type LeagueMatch, type TeamStanding } from '@/lib/league-match-store';
import { getSeasonsByLeague, getActiveSeason, type LeagueSeason } from '@/lib/league-season-store';

export interface LeagueContext {
  league: ManagedLeague | null;
  teams: LeagueTeam[];
  activeSeason: LeagueSeason | null;
  seasons: LeagueSeason[];
  matches: LeagueMatch[];
  standings: TeamStanding[];
  refresh: () => void;
  updateLeague: (updates: Partial<ManagedLeague>) => void;
  ready: boolean;
}

export function useLeague(): LeagueContext {
  const { user } = useCurrentUser();
  const [league, setLeague] = useState<ManagedLeague | null>(null);
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [activeSeason, setActiveSeason] = useState<LeagueSeason | null>(null);
  const [seasons, setSeasons] = useState<LeagueSeason[]>([]);
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    if (!user) return;
    const l = getLeagueByOwner(user.id);
    setLeague(l);
    if (l) {
      const t = getTeamsByLeague(l.id);
      const as = getActiveSeason(l.id);
      const ss = getSeasonsByLeague(l.id);
      const ms = as ? getMatchesBySeason(l.id, as.year) : [];
      setTeams(t);
      setActiveSeason(as);
      setSeasons(ss);
      setMatches(ms);
      setStandings(computeStandings(ms, t));
    } else {
      setTeams([]); setActiveSeason(null); setSeasons([]); setMatches([]); setStandings([]);
    }
    setReady(true);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateLeague = useCallback((updates: Partial<ManagedLeague>) => {
    setLeague(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      saveLeague(updated);
      return updated;
    });
  }, []);

  return { league, teams, activeSeason, seasons, matches, standings, refresh, updateLeague, ready };
}
