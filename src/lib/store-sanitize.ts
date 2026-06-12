// store-sanitize.ts — Defensive normalization for game/tournament records.
//
// Rows synced from Supabase (jsonb columns) can arrive with null entries
// inside players/standings/invitedPlayers/rounds, or as partial objects.
// Pages iterate these arrays during render (p.id, s.playerId, …), so a single
// null entry crashes the whole route. Sanitizing once at the store boundary
// protects every consumer.

function cleanObjectArray(v: unknown): unknown[] {
  if (!Array.isArray(v)) return [];
  return v.filter(x => !!x && typeof x === 'object');
}

export function sanitizeGameRecords<T>(list: unknown): T[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object' && typeof (g as { id?: unknown }).id === 'string')
    .map(g => ({
      ...g,
      players:        cleanObjectArray(g.players),
      invitedPlayers: cleanObjectArray(g.invitedPlayers),
      standings:      cleanObjectArray(g.standings),
      rounds:         cleanObjectArray(g.rounds),
    })) as T[];
}
