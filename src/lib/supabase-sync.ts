// supabase-sync.ts — Syncs all Supabase tables to localStorage on dashboard load.
// Runs at most once every 30 seconds to avoid hammering the DB.

import {
  getSAPlayersFromSupabase, saveSAPlayers, getSAPlayers,
  getSAClubsFromSupabase,   saveSAClubs,   getSAClubs,
  getSATournamentsFromSupabase, saveSATournaments, getSATournaments,
  getSAGamesFromSupabase,   saveSAGames,   getSAGames,
} from './superadmin-data';
import { getAllPlayers } from './player-store';
import { fetchTournamentsByCreator, fetchGamesByCreator } from './supabase';
import { getAllTournaments, saveTournament } from './tournament-store';
import type { Tournament } from './tournament-store';
import { getAllGames, saveGame } from './game-store';
import type { ActiveGame } from './game-engine';

const SYNC_TS_KEY = 'padelmgt_last_sync';
const SYNC_TTL_MS = 30_000;

function needsSync(): boolean {
  if (typeof window === 'undefined') return false;
  const last = parseInt(localStorage.getItem(SYNC_TS_KEY) ?? '0', 10);
  return Date.now() - last > SYNC_TTL_MS;
}

function markSynced(): void {
  if (typeof window !== 'undefined') localStorage.setItem(SYNC_TS_KEY, String(Date.now()));
}

// ── Players ───────────────────────────────────────────────────────────────────

async function syncPlayers(): Promise<void> {
  const sbPlayers = await getSAPlayersFromSupabase();
  if (!sbPlayers || sbPlayers.length === 0) return;

  // 1. Update SA players store (used by SA panel, ranking, player search)
  const local = getSAPlayers();
  const localMap = Object.fromEntries(local.map(p => [p.id, p]));
  const sbIds = new Set(sbPlayers.map(p => p.id));
  const merged = sbPlayers.map(sb => ({ ...(localMap[sb.id] ?? {}), ...sb }));
  const localOnly = local.filter(p => !sbIds.has(p.id));
  saveSAPlayers([...merged, ...localOnly]);

  // 2. Refresh ranking/level/city on registered players (player-facing store)
  const registered = getAllPlayers();
  const sbByEmail = Object.fromEntries(sbPlayers.map(p => [p.email.toLowerCase(), p]));
  const updatedRegistered = registered.map(rp => {
    const sb = sbByEmail[rp.email.toLowerCase()];
    if (!sb) return rp;
    return {
      ...rp,
      ...(sb.ranking > 0       ? { ranking: sb.ranking } : {}),
      ...(sb.rankingPoints > 0 ? { rankingPoints: sb.rankingPoints } : {}),
      ...(sb.level             ? { level: sb.level } : {}),
      ...(sb.city              ? { city: sb.city } : {}),
      ...(sb.country           ? { country: sb.country } : {}),
      ...(sb.plan              ? { plan: sb.plan }   : {}),
    };
  });
  // Also update padelmgt_user session plan if it belongs to one of the synced players
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (raw) {
        const session = JSON.parse(raw) as { id?: string; email?: string; plan?: string };
        const match = updatedRegistered.find(
          p => p.id === session.id || p.email.toLowerCase() === (session.email ?? '').toLowerCase()
        );
        if (match?.plan && match.plan !== session.plan) {
          localStorage.setItem('padelmgt_user', JSON.stringify({ ...session, plan: match.plan }));
        }
      }
    } catch { /* silent */ }
  }
  localStorage.setItem('padelmgt_registered_players', JSON.stringify(updatedRegistered));
}

// ── Clubs ─────────────────────────────────────────────────────────────────────

async function syncClubs(): Promise<void> {
  const sbClubs = await getSAClubsFromSupabase();
  if (!sbClubs || sbClubs.length === 0) return;

  const local = getSAClubs();
  const sbIds = new Set(sbClubs.map(c => c.id));

  // Keep local data for fields not in Supabase (mapsUrl, description, courtTypes…)
  const localMap = Object.fromEntries(local.map(c => [c.id, c]));
  const merged = sbClubs.map(sb => ({ ...sb, ...(localMap[sb.id] ?? {}) }));
  const localOnly = local.filter(c => !sbIds.has(c.id));
  saveSAClubs([...merged, ...localOnly]);
}

// ── Tournaments ───────────────────────────────────────────────────────────────

async function syncTournaments(): Promise<void> {
  const sbT = await getSATournamentsFromSupabase();
  if (!sbT || sbT.length === 0) return;

  const local = getSATournaments();
  const localIds = new Set(local.map(t => t.id));
  const newFromSb = sbT.filter(t => !localIds.has(t.id));
  if (newFromSb.length > 0) {
    saveSATournaments([...local, ...newFromSb]);
  }
}

// ── Quick Games ───────────────────────────────────────────────────────────────

async function syncGames(): Promise<void> {
  const sbGames = await getSAGamesFromSupabase();
  if (!sbGames || sbGames.length === 0) return;

  const local = getSAGames();
  const localIds = new Set(local.map(g => g.id));
  const newFromSb = sbGames.filter(g => !localIds.has(g.id));
  if (newFromSb.length > 0) {
    saveSAGames([...local, ...newFromSb]);
  }
}

// ── User-scoped tournament sync (called on login) ─────────────────────────────

/**
 * Fetch all tournaments created by this player from Supabase and merge them
 * into the local tournament store. Called after login to restore data across
 * devices — uses creator_player_id for efficient single-user queries.
 */
export async function syncUserTournaments(creatorPlayerId: string): Promise<void> {
  const rows = await fetchTournamentsByCreator(creatorPlayerId);
  if (!rows || rows.length === 0) return;

  const localIds = new Set(getAllTournaments().map(t => t.id as string));
  for (const raw of rows) {
    if (!raw || !raw.id) continue;
    if (!localIds.has(raw.id as string)) {
      // New tournament from Supabase — normalize array fields so pages that
      // iterate players/standings never crash on a partial row
      const r = raw as Record<string, unknown>;
      const normalized = {
        ...r,
        players:        Array.isArray(r.players)        ? r.players        : [],
        invitedPlayers: Array.isArray(r.invitedPlayers) ? r.invitedPlayers : [],
        standings:      Array.isArray(r.standings)      ? r.standings      : [],
        rounds:         Array.isArray(r.rounds)         ? r.rounds         : [],
      };
      saveTournament(normalized as unknown as Tournament);
    }
    // Already exists locally — local is source of truth (most recent edit wins)
  }
}

// ── User-scoped game sync (called on login) ───────────────────────────────────

/**
 * Fetch all quick games created by this player from Supabase and merge them
 * into the local game store. Called after login alongside syncUserTournaments.
 */
export async function syncUserGames(creatorPlayerId: string): Promise<void> {
  const rows = await fetchGamesByCreator(creatorPlayerId);
  if (!rows || rows.length === 0) return;

  const localIds = new Set(getAllGames().map(g => g.id as string));
  for (const raw of rows) {
    if (!raw || !raw.id) continue;
    if (!localIds.has(raw.id as string)) {
      const r = raw as Record<string, unknown>;
      const normalized = {
        ...r,
        players:        Array.isArray(r.players)        ? r.players        : [],
        invitedPlayers: Array.isArray(r.invitedPlayers) ? r.invitedPlayers : [],
        standings:      Array.isArray(r.standings)      ? r.standings      : [],
        rounds:         Array.isArray(r.rounds)         ? r.rounds         : [],
      };
      saveGame(normalized as unknown as ActiveGame);
    }
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function syncAllFromSupabase(): Promise<void> {
  if (!needsSync()) return;
  markSynced(); // mark before await so concurrent calls don't double-fire
  await Promise.allSettled([
    syncPlayers(),
    syncClubs(),
    syncTournaments(),
    syncGames(),
  ]);
}
