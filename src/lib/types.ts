export type UserRole = 'player' | 'club_manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  country?: string;
  city?: string;
  ranking?: number;
  points?: number;
}

export interface TournamentFormat {
  id: string;
  name: string;
  slug: string;
  description: string;
  maxPlayers: number;
  minPlayers: number;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels';
  type: 'Americano' | 'Mexicano' | 'Round Robin' | 'Knockout' | 'Swiss';
  icon: string;
  rules: string[];
  pros: string[];
  idealFor: string;
}

export interface Tournament {
  id: string;
  name: string;
  format: string;
  formatSlug: string;
  status: 'ongoing' | 'upcoming' | 'completed';
  startDate: string;
  endDate: string;
  club: string;
  city: string;
  country: string;
  players: number;
  maxPlayers: number;
  category: string;
  prize?: string;
  level: string;
}

export interface League {
  id: string;
  name: string;
  organizer: string;
  country: string;
  city: string;
  season: string;
  status: 'active' | 'upcoming' | 'completed';
  teams: number;
  players: number;
  startDate: string;
  endDate: string;
  category: string;
  level: string;
  description: string;
}

export interface Club {
  id: string;
  name: string;
  country: string;
  city: string;
  address: string;
  courts: number;
  members: number;
  rating: number;
  amenities: string[];
  image?: string;
  phone?: string;
  email?: string;
}

export interface Match {
  id: string;
  team1: [string, string];
  team2: [string, string];
  score?: string;
  status: 'live' | 'upcoming' | 'completed';
  court: string;
  time: string;
  tournamentName?: string;
}

export interface PlayerStats {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
  ranking: number;
  points: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  bestResult: string;
  currentStreak: number;
}
