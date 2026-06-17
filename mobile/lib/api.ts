import { supabase } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://padelmgt.com';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Torneos ──────────────────────────────────────────────────────────────────

export type Tournament = {
  id: string;
  name: string;
  format: string;
  status: string;
  startDate: string;
  club?: string;
  maxTeams?: number;
  registeredTeams?: number;
  code?: string;
};

export async function getTournaments(): Promise<Tournament[]> {
  try {
    return await get<Tournament[]>('/api/tournaments');
  } catch {
    return [];
  }
}

export async function getPersonalizadoTournaments(): Promise<Tournament[]> {
  try {
    const { data, error } = await supabase
      .from('personalizado_tournaments')
      .select('id, name, status, code, categories, coCreatorIds, creatorId, createdAt')
      .order('createdAt', { ascending: false });
    if (error) return [];
    return (data ?? []).map((t: Record<string, unknown>) => ({
      id: String(t.id),
      name: String(t.name ?? 'Torneo'),
      format: 'personalizado',
      status: String(t.status ?? 'draft'),
      startDate: String(t.createdAt ?? ''),
      code: String(t.code ?? ''),
    }));
  } catch {
    return [];
  }
}

// ── Clubes ───────────────────────────────────────────────────────────────────

export type Club = {
  id: string;
  name: string;
  location?: string;
  courts?: number;
  members?: number;
  plan?: string;
  mapsUrl?: string;
  description?: string;
};

export async function getPlayerClubs(playerId: string): Promise<Club[]> {
  try {
    const { data, error } = await supabase
      .from('club_members')
      .select('clubs(id, name, location, courts, members, plan, mapsUrl, description)')
      .eq('player_id', playerId);
    if (error) return [];
    return ((data ?? []) as Array<{ clubs: Club | null }>)
      .map((r) => r.clubs)
      .filter(Boolean) as Club[];
  } catch {
    return [];
  }
}

export async function getClubRating(clubId: string): Promise<{ average: number | null; count: number; myRating: number | null }> {
  try {
    return await get(`/api/clubs/rating?clubId=${clubId}`);
  } catch {
    return { average: null, count: 0, myRating: null };
  }
}

export async function setClubRating(clubId: string, rating: number): Promise<void> {
  await post('/api/clubs/rating', { clubId, rating });
}


// ── Personalizado Pricing ────────────────────────────────────────────────────

export type PricingConfig = {
  currency: string;
  tiers: { id: string; maxTeams: number | null; price: number }[];
  promos: { id: string; code: string; displayOnPricing: boolean; displayText: string; displayBadge: string; isActive: boolean }[];
};

export async function getPricing(): Promise<PricingConfig | null> {
  try {
    return await get<PricingConfig>('/api/personalizado-pricing');
  } catch {
    return null;
  }
}

// ── Player Profile ────────────────────────────────────────────────────────────

export type PlayerProfile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  birth_date?: string;
  phone?: string;
};

export async function getProfile(): Promise<PlayerProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    return data as PlayerProfile | null;
  } catch {
    return null;
  }
}
