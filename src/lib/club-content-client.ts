// club-content-client.ts — shared fetch/push helpers for the club-manager
// dashboard's per-club content (gallery/courts/announcements/roster/
// invitations). The caller's own club is resolved server-side from their
// session (see /api/club-content) — never client-supplied.

export type ClubContentType = 'gallery' | 'courts' | 'announcements' | 'roster';

export async function fetchClubContent<T>(contentType: ClubContentType): Promise<T | null> {
  try {
    const res = await fetch(`/api/club-content?contentType=${contentType}`, { credentials: 'include' });
    if (!res.ok) return null;
    const json = await res.json() as { data: T | null };
    return json.data;
  } catch { return null; }
}

export async function pushClubContent(contentType: ClubContentType, data: unknown): Promise<void> {
  const res = await fetch('/api/club-content', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType, data }),
  });
  if (!res.ok) throw new Error(`push ${contentType} failed: ${res.status}`);
}
