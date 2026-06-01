/**
 * local-store.ts — Generic localStorage accessor factory.
 *
 * Eliminates the duplicated load/persist/isServer helper pattern that appears
 * identically in every store file (player-store, game-store, tournament-store,
 * club-membership-store, friend-request-store, invitation-store, etc.).
 *
 * Usage:
 *   const store = createLocalStore<MyType>('my_storage_key', fallback);
 *   const items = store.load();
 *   store.persist([...items, newItem]);
 *
 * The `fallback` is returned when:
 *  - running server-side (SSR / Next.js server components)
 *  - the key is absent (first load — also seeds the key with the fallback)
 *  - JSON parsing fails
 *
 * `seedOnFirstLoad`: when true (default), writes the fallback to localStorage
 * on first access so subsequent reads find real data. Set to false for stores
 * where an empty array is the correct initial state.
 */

export function isServer(): boolean {
  return typeof window === 'undefined';
}

export interface LocalStore<T> {
  load(): T;
  persist(value: T): void;
}

export function createLocalStore<T>(
  key: string,
  fallback: T,
  options?: { seedOnFirstLoad?: boolean },
): LocalStore<T> {
  const seedOnFirstLoad = options?.seedOnFirstLoad ?? true;

  function load(): T {
    if (isServer()) return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        if (seedOnFirstLoad) {
          localStorage.setItem(key, JSON.stringify(fallback));
        }
        return fallback;
      }
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  function persist(value: T): void {
    if (isServer()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* ignore quota / permission errors */ }
  }

  return { load, persist };
}
