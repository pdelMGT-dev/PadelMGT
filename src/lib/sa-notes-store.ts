// sa-notes-store.ts — Private SA notes on players, clubs, tournaments.
// Local cache is instant-paint only; sa_notes in Supabase (service-role via
// /api/sa/notes) is the source of truth so a note added by one SA/device is
// visible to every other.

import { createLocalStore } from './local-store';

export type NoteTargetType = 'player' | 'club' | 'tournament';

export interface SANote {
  id: string;
  targetType: NoteTargetType;
  targetId: string;
  targetName: string;
  note: string;
  createdAt: string;
  createdBy: string;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const _store = createLocalStore<SANote[]>('padelmgt_sa_notes', [], { seedOnFirstLoad: false });

export function getSANotes(targetType: NoteTargetType, targetId: string): SANote[] {
  return _store.load().filter(n => n.targetType === targetType && n.targetId === targetId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addSANote(
  targetType: NoteTargetType,
  targetId: string,
  targetName: string,
  note: string,
  createdBy = 'Super Admin',
): SANote {
  const newNote: SANote = {
    id: generateId(),
    targetType,
    targetId,
    targetName,
    note: note.trim(),
    createdAt: new Date().toISOString(),
    createdBy,
  };
  const all = _store.load();
  _store.persist([newNote, ...all]);
  addSANoteToSupabase(newNote).catch(err => console.error('[sa-notes] Supabase sync failed:', err));
  return newNote;
}

export function deleteSANote(id: string): void {
  const all = _store.load().filter(n => n.id !== id);
  _store.persist(all);
  deleteSANoteFromSupabase(id).catch(err => console.error('[sa-notes] Supabase delete failed:', err));
}

export function getAllSANotes(): SANote[] {
  return _store.load().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Supabase sync ─────────────────────────────────────────────────────────────

/** Pull notes for one target from Supabase and merge into the local cache
 * (replacing any stale local entries for that target). Returns null on
 * fetch failure — caller should keep showing the local cache in that case. */
export async function fetchSANotesFromSupabase(targetType: NoteTargetType, targetId: string): Promise<SANote[] | null> {
  try {
    const res = await fetch(`/api/sa/notes?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { notes: SANote[] };
    const others = _store.load().filter(n => !(n.targetType === targetType && n.targetId === targetId));
    _store.persist([...others, ...data.notes]);
    return data.notes;
  } catch { return null; }
}

async function addSANoteToSupabase(note: SANote): Promise<void> {
  const res = await fetch('/api/sa/notes', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  });
  if (!res.ok) throw new Error(`add note failed: ${res.status}`);
}

async function deleteSANoteFromSupabase(id: string): Promise<void> {
  const res = await fetch(`/api/sa/notes?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error(`delete note failed: ${res.status}`);
}
