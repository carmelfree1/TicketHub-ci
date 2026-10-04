import type { TicketRecord } from '@/services/api';

/**
 * The last successfully loaded wallet is kept in IndexedDB so a traveler can still show a ticket without network
 * (a bus station often has none). It is private data: it is replaced on every successful load and removed on
 * logout. Every operation is best effort because IndexedDB can be unavailable (private windows, blocked storage).
 */
const DB_NAME = 'tickethub-offline';
const STORE = 'wallet';
const KEY = 'tickets';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveOfflineTickets(tickets: TicketRecord[]): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.put({ tickets, savedAt: Date.now() }, KEY));
  } catch {
    // Offline copy is a convenience only.
  }
}

export async function loadOfflineTickets(): Promise<{ tickets: TicketRecord[]; savedAt: number } | null> {
  try {
    const stored = await withStore<{ tickets: TicketRecord[]; savedAt: number } | undefined>('readonly', (store) => store.get(KEY));
    return stored && Array.isArray(stored.tickets) ? stored : null;
  } catch {
    return null;
  }
}

export async function clearOfflineTickets(): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(KEY));
  } catch {
    // Nothing to clear.
  }
}
