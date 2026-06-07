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
}

export function getAuditLog(limit = 100): AuditEntry[] {
  return _store.load().slice(0, limit);
}

export function clearAuditLog(): void {
  _store.persist([]);
}
