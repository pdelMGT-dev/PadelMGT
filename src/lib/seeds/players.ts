/**
 * seeds/players.ts
 *
 * Demo seed data for the registered-player store and related fixtures.
 * Extracted from player-store.ts and friend-request-store.ts so store files
 * remain free of hard-coded data arrays.
 *
 * NOTE: Types are defined inline here (not imported from the stores) to avoid
 * circular module dependencies. Keep these in sync with player-store.ts and
 * friend-request-store.ts.
 */

// Inline minimal types to avoid circular imports
type PlayerLevel = '1.0' | '1.5' | '2.0' | '2.5' | '3.0' | '3.5' | '4.0' | '4.5' | '5.0' | '5.5' | '6.0' | '7.0';
type PlayerSex   = 'M' | 'F';

interface RegisteredPlayer {
  id: string; shortId: string; name: string; email: string;
  password?: string; sex?: PlayerSex; country?: string; city?: string;
  level?: PlayerLevel; photoUrl?: string; ranking: number; rankingPoints: number;
  profileCompleted?: boolean; plan?: string;
}

interface FriendRequest {
  id: string; fromId: string; fromName: string;
  toId: string; toName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

// ── No seed data ──────────────────────────────────────────────────────────────
// The app is live: players, friendships and friend requests come exclusively
// from Supabase. These exports are kept (empty) only so existing importers keep
// compiling; nothing seeds demo data into any browser anymore.

export const SEED_PLAYERS: RegisteredPlayer[] = [];

export const SEED_FRIENDSHIPS: Record<string, string[]> = {};

export const SEED_FRIEND_REQUESTS: FriendRequest[] = [];
