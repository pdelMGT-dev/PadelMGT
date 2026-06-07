// sa-notes-store.ts — Private SA notes on players, clubs, tournaments

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
  return newNote;
}

export function deleteSANote(id: string): void {
  const all = _store.load().filter(n => n.id !== id);
  _store.persist(all);
}

export function getAllSANotes(): SANote[] {
  return _store.load().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
