import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// In the browser use the SSR cookie-based client so the auth session is
// stored in cookies and the middleware / route handlers can verify it
// server-side. On the server (imports from API routes / RSC) fall back to a
// plain client — server code should use supabase-server.ts for auth'd access.
function makeClient(): SupabaseClient | null {
  if (!url || !key) return null;
  if (typeof window !== 'undefined') {
    return createBrowserClient(url, key) as unknown as SupabaseClient;
  }
  return createClient(url, key);
}

export const supabase: SupabaseClient | null = makeClient();
export const isSupabaseConfigured = !!(url && key);

// ── Auth helpers ───────────────────────────────────────────────────────────────

export async function authSignUp(email: string, password: string, metadata?: Record<string, string>) {
  if (!supabase) return { data: null, error: { message: 'Supabase no configurado' } };
  return supabase.auth.signUp({ email, password, ...(metadata ? { options: { data: metadata } } : {}) });
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

export async function resetPasswordForEmail(email: string, redirectTo: string) {
  if (!supabase) return { error: { message: 'Supabase no configurado' } };
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function updateUserPassword(newPassword: string) {
  if (!supabase) return { error: { message: 'Supabase no configurado' } };
  return supabase.auth.updateUser({ password: newPassword });
}

export async function exchangeCodeForSession(code: string) {
  if (!supabase) return { data: null, error: { message: 'Supabase no configurado' } };
  return supabase.auth.exchangeCodeForSession(code);
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

/** Fetch a single tournament by its short code from the data JSONB column. */
export async function fetchTournamentByCode(code: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('tournaments')
    .select('data')
    .filter('data->>code', 'eq', code)
    .maybeSingle();
  if (error) { console.warn('[Supabase] fetchTournamentByCode:', error.message); return null; }
  return data ? (data.data as Record<string, unknown>) : null;
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

/** Fetch a single quick game by its short code from the data JSONB column. */
export async function fetchGameByCode(code: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('quick_games')
    .select('data')
    .filter('data->>code', 'eq', code)
    .maybeSingle();
  if (error) { console.warn('[Supabase] fetchGameByCode:', error.message); return null; }
  return data ? (data.data as Record<string, unknown>) : null;
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

/** Push a new join request through the service-role endpoint (anon writes on
 * join_requests are blocked by RLS). Open to guests. Fire-and-forget. */
export async function submitJoinRequestToSupabase(req: SupabaseJoinRequest): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/join-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'submit',
        request: {
          id:          req.id,
          entityId:    req.entityId,
          entityType:  req.entityType,
          playerId:    req.playerId,
          playerName:  req.playerName,
          playerEmail: req.playerEmail ?? null,
        },
      }),
    });
  } catch { /* fire-and-forget */ }
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

/** Update status through the service-role endpoint (approve / reject). Only the
 * organizer (or SA) is authorized server-side. Fire-and-forget. */
export async function updateJoinRequestInSupabase(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/join-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'update', requestId, status }),
    });
  } catch { /* fire-and-forget */ }
}

/** Delete a join request through the service-role endpoint (cancel). The request
 * owner or the organizer (or SA) is authorized server-side. Fire-and-forget. */
export async function deleteJoinRequestFromSupabase(requestId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/join-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'delete', requestId }),
    });
  } catch { /* fire-and-forget */ }
}
