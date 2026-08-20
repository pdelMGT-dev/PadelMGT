// family-approval-store.ts — Guardian approval requests for family-member
// participation in games/tournaments invited by someone other than the guardian.
//
// localStorage is the primary store. When Supabase is configured, writes are
// fired (fire-and-forget) to the `family_approvals` table for persistence/sync.
//
// localStorage key:
//   padelmgt_family_approvals — array of ALL FamilyApprovalRequest objects

import { createLocalStore } from './local-store';
import { supabase, isSupabaseConfigured } from './supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FamilyApprovalRequest {
  id: string;
  guardianId: string;            // the player who must approve
  familyMemberId: string;        // FM-XXXX
  familyMemberName: string;
  context: 'quick_game' | 'tournament' | 'personalizado';
  entityId: string;              // gameId / tournamentId
  entityName: string;
  entityDate?: string;
  fromPlayerId: string;          // who invited the minor
  fromPlayerName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  respondedAt?: string;
}

// ── ID generator ─────────────────────────────────────────────────────────────

function generateApprovalId(): string {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  let letters = '';
  let nums = '';
  for (let i = 0; i < 4; i++) letters += alpha[Math.floor(Math.random() * alpha.length)];
  for (let i = 0; i < 4; i++) nums += digits[Math.floor(Math.random() * digits.length)];
  return `FA-${letters}-${nums}`;
}

// ── localStorage store ───────────────────────────────────────────────────────

const _store = createLocalStore<FamilyApprovalRequest[]>('padelmgt_family_approvals', [], { seedOnFirstLoad: false });

// ── Supabase sync helper (no-ops gracefully when not configured) ─────────────

function approvalToRow(r: FamilyApprovalRequest): Record<string, unknown> {
  return {
    id: r.id,
    guardian_id: r.guardianId,
    family_member_id: r.familyMemberId,
    family_member_name: r.familyMemberName,
    context: r.context,
    entity_id: r.entityId,
    entity_name: r.entityName,
    entity_date: r.entityDate ?? null,
    from_player_id: r.fromPlayerId,
    from_player_name: r.fromPlayerName,
    status: r.status,
    created_at: r.createdAt,
    responded_at: r.respondedAt ?? null,
  };
}

async function syncApprovalToSupabase(req: FamilyApprovalRequest): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { error } = await supabase
      .from('family_approvals')
      .upsert(approvalToRow(req), { onConflict: 'id' });
    if (error) console.warn('[FamilyApproval] sync:', error.message);
  } catch (e) {
    console.warn('[FamilyApproval] sync:', e);
  }
}

function rowToApproval(r: Record<string, unknown>): FamilyApprovalRequest {
  return {
    id: r.id as string,
    guardianId: r.guardian_id as string,
    familyMemberId: r.family_member_id as string,
    familyMemberName: r.family_member_name as string,
    context: r.context as FamilyApprovalRequest['context'],
    entityId: r.entity_id as string,
    entityName: r.entity_name as string,
    entityDate: (r.entity_date as string) ?? undefined,
    fromPlayerId: r.from_player_id as string,
    fromPlayerName: r.from_player_name as string,
    status: r.status as FamilyApprovalRequest['status'],
    createdAt: r.created_at as string,
    respondedAt: (r.responded_at as string) ?? undefined,
  };
}

/** Pull this guardian's real approval requests from Supabase and merge into
 * the local cache. Returns null on fetch failure (caller should keep
 * showing the local cache in that case). */
export async function fetchApprovalsForGuardianFromSupabase(guardianId: string): Promise<FamilyApprovalRequest[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.from('family_approvals').select('*').eq('guardian_id', guardianId);
    if (error) { console.warn('[FamilyApproval] fetch:', error.message); return null; }
    const remote = (data ?? []).map(rowToApproval);
    const others = _store.load().filter(r => r.guardianId !== guardianId);
    _store.persist([...others, ...remote]);
    return remote;
  } catch (e) {
    console.warn('[FamilyApproval] fetch:', e);
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/** All approval requests (pending + resolved) where the player is the guardian. */
export function getApprovalsForGuardian(guardianId: string): FamilyApprovalRequest[] {
  return _store.load().filter(r => r.guardianId === guardianId);
}

/** Only pending approval requests for the guardian. */
export function getPendingApprovalsForGuardian(guardianId: string): FamilyApprovalRequest[] {
  return _store.load().filter(r => r.guardianId === guardianId && r.status === 'pending');
}

/** Upsert an approval request in localStorage and fire-and-forget to Supabase. */
export function saveApprovalRequest(req: FamilyApprovalRequest): void {
  const all = _store.load();
  const idx = all.findIndex(r => r.id === req.id);
  if (idx >= 0) { all[idx] = req; } else { all.push(req); }
  _store.persist(all);
  void syncApprovalToSupabase(req);
}

/** Create a new pending approval request with a generated id and persist it. */
export function createApprovalRequest(
  data: Omit<FamilyApprovalRequest, 'id' | 'status' | 'createdAt'>,
): FamilyApprovalRequest {
  const req: FamilyApprovalRequest = {
    id: generateApprovalId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...data,
  };
  saveApprovalRequest(req);
  return req;
}

/**
 * Respond to an approval request (approve/reject). Updates status + respondedAt,
 * persists, and returns the updated request so the caller can propagate the
 * outcome to the underlying game/tournament.
 */
export function respondToApproval(
  id: string,
  response: 'approved' | 'rejected',
): { ok: boolean; request?: FamilyApprovalRequest } {
  const all = _store.load();
  const idx = all.findIndex(r => r.id === id);
  if (idx < 0) return { ok: false };
  const updated: FamilyApprovalRequest = {
    ...all[idx],
    status: response,
    respondedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  _store.persist(all);
  void syncApprovalToSupabase(updated);
  return { ok: true, request: updated };
}
