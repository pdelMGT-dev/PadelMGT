import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient | null = (url && key) ? createClient(url, key) : null;
export const isSupabaseConfigured = !!(url && key);

// ── Auth helpers ───────────────────────────────────────────────────────────────

export async function authSignUp(email: string, password: string) {
  if (!supabase) return { data: null, error: { message: 'Supabase no configurado' } };
  return supabase.auth.signUp({ email, password });
}

export async function authSignIn(email: string, password: string) {
  if (!supabase) return { data: null, error: { message: 'Supabase no configurado' } };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function authSignOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getAuthUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** Fetch a player record from Supabase by their auth user_id. */
export async function fetchPlayerByUserId(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.warn('[Supabase] fetchPlayerByUserId:', error.message); return null; }
  return data as Record<string, unknown> | null;
}

/** Fetch a player record from Supabase by email. */
export async function fetchPlayerByEmail(email: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) { console.warn('[Supabase] fetchPlayerByEmail:', error.message); return null; }
  return data as Record<string, unknown> | null;
}

/** Fetch all tournaments created by a player (by their string player ID). */
export async function fetchTournamentsByCreator(creatorPlayerId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('tournaments')
    .select('data')
    .eq('creator_player_id', creatorPlayerId)
    .order('created_at', { ascending: false });
  if (error) { console.warn('[Supabase] fetchTournamentsByCreator:', error.message); return null; }
  return (data ?? []).map((r: Record<string, unknown>) => r.data as Record<string, unknown>).filter(Boolean);
}

/** Fetch all quick games created by a player (by their string player ID). */
export async function fetchGamesByCreator(creatorPlayerId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('quick_games')
    .select('data')
    .eq('creator_player_id', creatorPlayerId)
    .order('created_at', { ascending: false });
  if (error) { console.warn('[Supabase] fetchGamesByCreator:', error.message); return null; }
  return (data ?? []).map((r: Record<string, unknown>) => r.data as Record<string, unknown>).filter(Boolean);
}
