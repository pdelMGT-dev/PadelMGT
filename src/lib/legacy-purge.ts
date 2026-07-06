// legacy-purge.ts — one-time cleanup of demo/seed data left in a browser's
// localStorage from before the app went Supabase-first. Runs once per browser
// (guarded by a version flag); bump PURGE_VERSION to re-run after a new wave.

const PURGE_FLAG = 'padelmgt_purge_version';
const PURGE_VERSION = '2';

// Caches that are now fully Supabase-authoritative: safe to drop entirely, they
// re-populate from the server on next load/sync. Any demo/ghost rows die here.
const CACHES_TO_CLEAR = [
  'padelmgt_games',                    // quick games (had 13 demo fixtures g1..g13)
  'padelmgt_tournaments',              // classic tournaments (ghosts from deleted rows)
  'padelmgt_tournaments_v2',           // SA tournaments cache
  'padelmgt_sa_players',               // SA players cache (re-pulls from Supabase)
  'padelmgt_friend_requests',          // rebuilt from Supabase (Phase 2)
  'padelmgt_friendships',              // rebuilt from Supabase (Phase 2)
  'padelmgt_sa_player_relationships',  // orphaned SA-only mirror
  'padelmgt_last_sync',                // force a fresh sync after clearing
];

export function purgeLegacyLocalData(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(PURGE_FLAG) === PURGE_VERSION) return;

    for (const key of CACHES_TO_CLEAR) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    }

    // Registered players: keep only real (Supabase-registered) records. Demo
    // seeds carry a plaintext `password` field; real rows never do.
    try {
      const raw = localStorage.getItem('padelmgt_registered_players');
      if (raw) {
        const arr = JSON.parse(raw) as Array<{ password?: string; email?: string }>;
        const real = arr.filter(p => !p.password && !(p.email ?? '').endsWith('@padelmgt.com'));
        if (real.length !== arr.length) {
          localStorage.setItem('padelmgt_registered_players', JSON.stringify(real));
        }
      }
    } catch { /* ignore malformed */ }

    localStorage.setItem(PURGE_FLAG, PURGE_VERSION);
  } catch { /* localStorage unavailable — nothing to purge */ }
}
