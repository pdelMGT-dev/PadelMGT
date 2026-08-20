// family-store.ts — Family members and family links management.
//
// localStorage is the primary store. When Supabase is configured, writes are
// also fired to the service-role API route for persistence/sync.
//
// localStorage keys:
//   padelmgt_family_members — array of ALL FamilyMember objects
//   padelmgt_family_links   — array of ALL FamilyLink objects

import { createLocalStore } from './local-store';
import { isSupabaseConfigured } from './supabase';
import { migrateFamilyMemberHistory } from './personalizado-store';

// ── Types ────────────────────────────────────────────────────────────────────

export type RelationType = 'hijo' | 'hija' | 'esposo' | 'esposa' | 'pareja' | 'dependiente';

export interface FamilyMember {
  id: string;           // "FM-XXXX-1234" format
  ownerId: string;      // playerId
  fullName: string;
  relationType: RelationType;
  sex: 'masculino' | 'femenino';
  birthDate: string;    // "YYYY-MM-DD"
  email?: string;
  linkedPlayerId?: string;
  invitationStatus: 'none' | 'invited' | 'accepted';
  createdAt: string;
}

export interface FamilyLink {
  id: string;
  fromPlayerId: string;       // who sent the request
  toPlayerId: string;         // platform user receiving it
  toPlayerEmail: string;
  fromPlayerName: string;
  relationFromTo: RelationType;  // how "from" sees "to"
  relationToFrom: RelationType;  // how "to" sees "from" (derived)
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

// ── Relation label map ───────────────────────────────────────────────────────

export const RELATION_LABELS: Record<RelationType, string> = {
  hijo: 'Hijo',
  hija: 'Hija',
  esposo: 'Esposo',
  esposa: 'Esposa',
  pareja: 'Pareja',
  dependiente: 'Dependiente',
};

/** Derive the inverse relation label for FamilyLink.relationToFrom */
export function deriveInverseRelation(rel: RelationType): RelationType {
  switch (rel) {
    case 'esposo': return 'esposa';
    case 'esposa': return 'esposo';
    case 'pareja': return 'pareja';
    // For hijo/hija/dependiente the "from" sees the other as a guardian.
    // We store 'dependiente' as a placeholder since 'guardian' is not in the enum;
    // display layer can render it as "Familiar".
    case 'hijo': return 'dependiente';
    case 'hija': return 'dependiente';
    case 'dependiente': return 'dependiente';
  }
}

// ── ID generator ─────────────────────────────────────────────────────────────

export function generateFamilyMemberId(): string {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  let letters = '';
  let nums = '';
  for (let i = 0; i < 4; i++) letters += alpha[Math.floor(Math.random() * alpha.length)];
  for (let i = 0; i < 4; i++) nums += digits[Math.floor(Math.random() * digits.length)];
  return `FM-${letters}-${nums}`;
}

// ── localStorage stores ──────────────────────────────────────────────────────

const _membersStore = createLocalStore<FamilyMember[]>('padelmgt_family_members', [], { seedOnFirstLoad: false });
const _linksStore = createLocalStore<FamilyLink[]>('padelmgt_family_links', [], { seedOnFirstLoad: false });

// ── CRUD: FamilyMember ────────────────────────────────────────────────────────

/** Return all family members belonging to a specific owner. */
export function getFamilyMembers(ownerId: string): FamilyMember[] {
  return _membersStore.load().filter(m => m.ownerId === ownerId);
}

/** Scan the local members store for a member by its ID# (across all owners). */
export function findFamilyMemberByIdLocal(id: string): FamilyMember | null {
  return _membersStore.load().find(m => m.id === id) ?? null;
}

/**
 * Look up a family member by ID#. When Supabase is configured this hits the
 * direct-lookup API route (so members of OTHER guardians are reachable);
 * otherwise it falls back to the local store.
 */
export async function lookupFamilyMember(id: string): Promise<FamilyMember | null> {
  if (!isSupabaseConfigured) {
    return findFamilyMemberByIdLocal(id);
  }
  try {
    const res = await fetch('/api/family/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familyMemberId: id }),
    });
    const json = await res.json() as {
      ok: boolean;
      member?: { id: string; fullName: string; guardianId: string; birthDate: string; sex: string };
    };
    if (!json.ok || !json.member) return findFamilyMemberByIdLocal(id);
    const m = json.member;
    return {
      id: m.id,
      ownerId: m.guardianId,
      fullName: m.fullName,
      relationType: 'dependiente',
      sex: m.sex === 'femenino' ? 'femenino' : 'masculino',
      birthDate: m.birthDate,
      invitationStatus: 'none',
      createdAt: new Date().toISOString(),
    };
  } catch (e) {
    console.warn('[Family] lookupFamilyMember:', e);
    return findFamilyMemberByIdLocal(id);
  }
}

/** Upsert a member in localStorage and fire-and-forget sync to Supabase. */
export function saveFamilyMember(member: FamilyMember): void {
  const all = _membersStore.load();
  const idx = all.findIndex(m => m.id === member.id);
  if (idx >= 0) { all[idx] = member; } else { all.push(member); }
  _membersStore.persist(all);
  void syncMemberToSupabase(member);
}

/** Remove a member from localStorage (and optionally Supabase via API). */
export function deleteFamilyMember(memberId: string, ownerId: string): void {
  const all = _membersStore.load().filter(m => !(m.id === memberId && m.ownerId === ownerId));
  _membersStore.persist(all);
  if (isSupabaseConfigured) {
    void fetch('/api/family/member', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ownerId, memberId }),
    }).catch(e => console.warn('[Family] deleteMember API:', e));
  }
}

async function syncMemberToSupabase(member: FamilyMember): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await fetch('/api/family/member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ownerId: member.ownerId, member }),
    });
  } catch (e) {
    console.warn('[Family] syncMember:', e);
  }
}

// ── CRUD: FamilyLink ──────────────────────────────────────────────────────────

/** Return all family links where the player is either sender or receiver. */
export function getFamilyLinks(playerId: string): FamilyLink[] {
  return _linksStore.load().filter(l => l.fromPlayerId === playerId || l.toPlayerId === playerId);
}

/** Upsert a link in localStorage and fire-and-forget sync to Supabase. */
export function saveFamilyLink(link: FamilyLink): void {
  const all = _linksStore.load();
  const idx = all.findIndex(l => l.id === link.id);
  if (idx >= 0) { all[idx] = link; } else { all.push(link); }
  _linksStore.persist(all);
}

// ── Cross-device sync (pull) ──────────────────────────────────────────────────

/** Pull this owner's real family members from Supabase and merge into the
 * local cache. Returns null on fetch failure (caller should keep showing
 * the local cache in that case). */
export async function fetchFamilyMembersFromSupabase(ownerId: string): Promise<FamilyMember[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const res = await fetch(`/api/family/member?ownerId=${encodeURIComponent(ownerId)}`);
    if (!res.ok) return null;
    const data = await res.json() as { members: FamilyMember[] };
    const others = _membersStore.load().filter(m => m.ownerId !== ownerId);
    _membersStore.persist([...others, ...data.members]);
    return data.members;
  } catch { return null; }
}

/** Pull this player's real family links (sent + received) from Supabase and
 * merge into the local cache. Returns null on fetch failure. */
export async function fetchFamilyLinksFromSupabase(playerId: string): Promise<FamilyLink[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const res = await fetch(`/api/family/link?playerId=${encodeURIComponent(playerId)}`);
    if (!res.ok) return null;
    const data = await res.json() as { links: FamilyLink[] };
    const others = _linksStore.load().filter(l => l.fromPlayerId !== playerId && l.toPlayerId !== playerId);
    _linksStore.persist([...others, ...data.links]);
    return data.links;
  } catch { return null; }
}

// ── High-level async operations ───────────────────────────────────────────────

/** Create a new family member with a generated ID and persist it. */
export async function createFamilyMember(
  ownerId: string,
  data: Omit<FamilyMember, 'id' | 'ownerId' | 'invitationStatus' | 'createdAt'>,
): Promise<FamilyMember> {
  const member: FamilyMember = {
    id: generateFamilyMemberId(),
    ownerId,
    invitationStatus: 'none',
    createdAt: new Date().toISOString(),
    ...data,
  };
  saveFamilyMember(member);
  return member;
}

/** Update fields on an existing family member. */
export async function updateFamilyMember(
  memberId: string,
  ownerId: string,
  patch: Partial<FamilyMember>,
): Promise<{ ok: boolean; error?: string }> {
  const all = _membersStore.load();
  const idx = all.findIndex(m => m.id === memberId && m.ownerId === ownerId);
  if (idx < 0) return { ok: false, error: 'Miembro no encontrado' };
  const previous = all[idx];
  const updated = { ...previous, ...patch, id: memberId, ownerId };
  all[idx] = updated;
  _membersStore.persist(all);
  void syncMemberToSupabase(updated);

  // If this member just got linked to a real platform account, carry their
  // tournament history (registered under their FM-id) over to the new account.
  if (updated.linkedPlayerId && updated.linkedPlayerId !== previous.linkedPlayerId) {
    void migrateFamilyMemberHistory(memberId, updated.linkedPlayerId, updated.fullName);
  }

  return { ok: true };
}

/**
 * Request a family link with another platform user.
 * If Supabase is configured, calls the API route which looks up the user and sends the email.
 * Otherwise saves a pending link locally.
 */
export async function requestFamilyLink(
  from: { id: string; name: string; email: string },
  toEmail: string,
  relationFromTo: RelationType,
): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch('/api/family/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          fromPlayerId: from.id,
          fromPlayerName: from.name,
          toPlayerEmail: toEmail,
          relationFromTo,
        }),
      });
      const json = await res.json() as { ok: boolean; error?: string; link?: FamilyLink };
      if (json.ok && json.link) {
        saveFamilyLink(json.link);
      }
      return { ok: json.ok, error: json.error };
    } catch (e) {
      console.warn('[Family] requestFamilyLink:', e);
      return { ok: false, error: 'Error de conexión' };
    }
  }

  // Offline/dev fallback — save pending link locally
  const link: FamilyLink = {
    id: `link-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    fromPlayerId: from.id,
    fromPlayerName: from.name,
    toPlayerId: '',          // unknown without Supabase lookup
    toPlayerEmail: toEmail,
    relationFromTo,
    relationToFrom: deriveInverseRelation(relationFromTo),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  saveFamilyLink(link);
  return { ok: true };
}
