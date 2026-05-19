// invitation-store.ts — Direct player invitations for Quick Games

const STORAGE_KEY = 'padelmgt_invitations_v2';

export interface Invitation {
  id: string;
  gameId: string;
  gameName: string;
  gameDate: string;
  gameTime: string;
  gameClub: string;
  gameCity: string;
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  toPlayerEmail?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  respondedAt?: string;
}

function isServer(): boolean {
  return typeof window === 'undefined';
}

function load(): Invitation[] {
  if (isServer()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Invitation[]) : [];
  } catch {
    return [];
  }
}

function persist(items: Invitation[]): void {
  if (isServer()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getAllInvitations(): Invitation[] {
  return load();
}

export function getInvitationsForPlayer(playerId: string): Invitation[] {
  return load().filter((i) => i.toPlayerId === playerId);
}

export function getPendingInvitationsForPlayer(playerId: string): Invitation[] {
  return load().filter((i) => i.toPlayerId === playerId && i.status === 'pending');
}

export function getInvitationsSentByPlayer(playerId: string): Invitation[] {
  return load().filter((i) => i.fromPlayerId === playerId);
}

export function getInvitationsForGame(gameId: string): Invitation[] {
  return load().filter((i) => i.gameId === gameId);
}

export function createInvitation(params: Omit<Invitation, 'id' | 'status' | 'createdAt'>): Invitation {
  const inv: Invitation = {
    ...params,
    id: generateId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const all = load();
  all.push(inv);
  persist(all);
  return inv;
}

export function respondToInvitation(
  invitationId: string,
  response: 'accepted' | 'rejected',
): Invitation | null {
  const all = load();
  const idx = all.findIndex((i) => i.id === invitationId);
  if (idx < 0) return null;
  all[idx] = {
    ...all[idx],
    status: response,
    respondedAt: new Date().toISOString(),
  };
  persist(all);
  return all[idx];
}

export function deleteInvitationsForGame(gameId: string): void {
  const all = load().filter((i) => i.gameId !== gameId);
  persist(all);
}
