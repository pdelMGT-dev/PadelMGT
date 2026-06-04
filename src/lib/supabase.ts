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

// ── Join Requests ──────────────────────────────────────────────────────────────

export interface SupabaseJoinRequest {
  id: string;
  entityId: string;
  entityType: 'game' | 'tournament';
  playerId: string;
  playerName: string;
  playerEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

function rowToJoinRequest(r: Record<string, unknown>): SupabaseJoinRequest {
  return {
    id:          r.id as string,
    entityId:    r.entity_id as string,
    entityType:  r.entity_type as 'game' | 'tournament',
    playerId:    r.player_id as string,
    playerName:  r.player_name as string,
    playerEmail: r.player_email as string | undefined,
    status:      r.status as 'pending' | 'approved' | 'rejected',
    createdAt:   r.created_at as string,
  };
}

/** Push a new join request to Supabase (upsert to handle retries). */
export async function submitJoinRequestToSupabase(req: SupabaseJoinRequest): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('join_requests').upsert({
    id:           req.id,
    entity_id:    req.entityId,
    entity_type:  req.entityType,
    player_id:    req.playerId,
    player_name:  req.playerName,
    player_email: req.playerEmail ?? null,
    status:       'pending',
  }, { onConflict: 'id' });
  if (error) console.warn('[Supabase] submitJoinRequest:', error.message);
}

/** Fetch all join requests for an entity (used by creator's management page). */
export async function fetchJoinRequestsForEntity(entityId: string): Promise<SupabaseJoinRequest[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('join_requests')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true });
  if (error) { console.warn('[Supabase] fetchJoinRequestsForEntity:', error.message); return null; }
  return (data ?? []).map(r => rowToJoinRequest(r as Record<string, unknown>));
}

/** Fetch a single player's request for an entity (used by submitter to check status). */
export async function fetchMyJoinRequestFromSupabase(entityId: string, playerId: string): Promise<SupabaseJoinRequest | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('join_requests')
    .select('*')
    .eq('entity_id', entityId)
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) { console.warn('[Supabase] fetchMyJoinRequest:', error.message); return null; }
  return data ? rowToJoinRequest(data as Record<string, unknown>) : null;
}

/** Update status in Supabase (approve / reject). */
export async function updateJoinRequestInSupabase(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('join_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) console.warn('[Supabase] updateJoinRequest:', error.message);
}

/** Delete a join request in Supabase (cancel). */
export async function deleteJoinRequestFromSupabase(requestId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('join_requests').delete().eq('id', requestId);
  if (error) console.warn('[Supabase] deleteJoinRequest:', error.message);
}
