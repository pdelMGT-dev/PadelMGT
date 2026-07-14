// audit-log-store.ts — SA action audit trail

import { createLocalStore } from './local-store';

export type AuditAction =
  | 'player_created' | 'player_updated' | 'player_deleted' | 'player_plan_changed'
  | 'club_created' | 'club_updated' | 'club_deleted' | 'club_approved' | 'club_rejected' | 'club_plan_changed'
  | 'tournament_created' | 'tournament_updated' | 'tournament_deleted'
  | 'game_created' | 'game_updated' | 'game_deleted' | 'game_status_changed'
  | 'score_correction_approved' | 'score_correction_rejected'
  | 'promo_created' | 'promo_updated' | 'promo_deleted'
  | 'plan_updated'
  | 'sa_login' | 'sa_logout'
  | 'sub_admin_created' | 'sub_admin_deleted';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  actor: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: string;
  createdAt: string;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const MAX_ENTRIES = 500;

const _store = createLocalStore<AuditEntry[]>('padelmgt_sa_audit', [], { seedOnFirstLoad: false });

export function logAudit(
  action: AuditAction,
  actor: string,
  opts: { targetType?: string; targetId?: string; targetName?: string; details?: string } = {},
): void {
  const entry: AuditEntry = {
    id: generateId(),
    action,
    actor,
    ...opts,
    createdAt: new Date().toISOString(),
  };
  const all = _store.load();
  const trimmed = [entry, ...all].slice(0, MAX_ENTRIES);
  _store.persist(trimmed);
  pushAuditEntryToSupabase(entry).catch(err => console.warn('[audit-log] Supabase sync failed:', err));
}

export function getAuditLog(limit = 100): AuditEntry[] {
  return _store.load().slice(0, limit);
}

export function clearAuditLog(): void {
  _store.persist([]);
  clearAuditLogFromSupabase().catch(err => console.warn('[audit-log] Supabase clear failed:', err));
}

// ── Supabase sync ─────────────────────────────────────────────────────────────

async function pushAuditEntryToSupabase(entry: AuditEntry): Promise<void> {
  if (typeof window === 'undefined') return;
  const res = await fetch('/api/sa/audit-log', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`push audit entry failed: ${res.status}`);
}

async function clearAuditLogFromSupabase(): Promise<void> {
  const res = await fetch('/api/sa/audit-log', { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error(`clear audit log failed: ${res.status}`);
}

/** Pull the real cross-device audit trail from Supabase into the local
 * cache. Returns null on fetch failure (caller should keep showing the
 * local cache in that case). */
export async function syncAuditLogFromSupabase(limit = 200): Promise<AuditEntry[] | null> {
  try {
    const res = await fetch(`/api/sa/audit-log?limit=${limit}`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { entries: AuditEntry[] };
    _store.persist(data.entries);
    return data.entries;
  } catch { return null; }
}
