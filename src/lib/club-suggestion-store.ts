// club-suggestion-store.ts
// Handles the public "¿No encuentras tu club?" suggestion flow.
//
// A suggestion is just a club row created with status='pending'. It is written
// to BOTH:
//   1. localStorage `padelmgt_club_requests` — so a Super Admin reviewing on the
//      same browser sees it immediately in the existing "Solicitudes Pendientes"
//      queue (getSAClubs reads this key), with every field (incl. the website/
//      maps link used for verification).
//   2. Supabase `clubs` table (best-effort) — so the suggestion reaches the SA
//      across devices. The SA clubs page polls Supabase and merges new pending
//      rows. The website/maps link rides along in the `maps_url` column
//      (migration 008). If that migration hasn't been applied yet, the Supabase
//      write degrades gracefully (the localStorage path still works).
//
// The SA must APPROVE a suggestion before it ever becomes visible publicly —
// the public /clubs page only shows clubs with status='active'.

import { supabase } from './supabase';

export interface ClubSuggestionInput {
  name: string;
  country: string;
  city: string;
  courts: number;
  /** Website OR Google Maps link — used by the SA to verify the club exists. */
  website: string;
  /** Optional contact email of the person suggesting (for follow-up). */
  contactEmail?: string;
}

const REQUESTS_KEY = 'padelmgt_club_requests';

function makeId(): string {
  return `CR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Persist the suggestion locally (same-browser SA review). */
function writeLocal(id: string, input: ClubSuggestionInput): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(localStorage.getItem(REQUESTS_KEY) ?? '[]') as unknown[];
    const entry = {
      id,
      clubName: input.name,
      clubType: 'Sugerido por jugador',
      country: input.country,
      city: input.city,
      address: '',
      description: '',
      courtsCount: input.courts,
      courtTypes: [],
      amenities: [],
      ownerName: '',
      ownerEmail: input.contactEmail ?? '',
      ownerPhone: '',
      adminEmail: input.contactEmail ?? '',
      mapsUrl: input.website,
      message: input.website ? `Web/Maps: ${input.website}` : '',
      source: 'player_suggestion',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(REQUESTS_KEY, JSON.stringify([...existing, entry]));
  } catch (err) {
    console.warn('[club-suggestion] writeLocal failed:', err);
  }
}

/** Best-effort cross-device delivery to the SA via Supabase. */
async function writeSupabase(id: string, input: ClubSuggestionInput): Promise<void> {
  if (!supabase) return;
  const now = new Date().toISOString();
  // Try the full row first (requires migration 008). If the extra columns are
  // missing, fall back to the core columns so the suggestion still arrives.
  const full = {
    id,
    name: input.name,
    city: input.city,
    country: input.country,
    courts: input.courts || 0,
    members: 0,
    status: 'pending' as const,
    plan: 'free' as const,
    admin_email: input.contactEmail ?? null,
    maps_url: input.website || null,
    club_type: 'Sugerido por jugador',
    source: 'player_suggestion',
    joined_at: now,
  };
  let { error } = await supabase.from('clubs').upsert(full);
  if (error) {
    // Retry with only the columns guaranteed by the base schema.
    const core = {
      id, name: input.name, city: input.city, country: input.country,
      courts: input.courts || 0, members: 0, status: 'pending' as const,
      plan: 'free' as const, admin_email: input.contactEmail ?? null, joined_at: now,
    };
    ({ error } = await supabase.from('clubs').upsert(core));
    if (error) console.warn('[club-suggestion] Supabase upsert failed:', error.message);
  }
}

/**
 * Submit a club suggestion. Resolves once the local write is done; the Supabase
 * write happens best-effort in the background. Returns the tracking id.
 */
export async function submitClubSuggestion(input: ClubSuggestionInput): Promise<string> {
  const id = makeId();
  writeLocal(id, input);
  void writeSupabase(id, input); // fire-and-forget; never blocks the UI
  return id;
}
