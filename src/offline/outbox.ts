import { http, isRetryable, isNetworkError, errorMessage } from '../services/http';
import { getDB, type Mutation, type OutboxEntry, type FailedEntry } from './db';

// ---------------------------------------------------------------------------
// Status store (consumed through useOutbox / useSyncExternalStore)
// ---------------------------------------------------------------------------

export interface OutboxStatus {
  /** Browser reports a network connection */
  online: boolean;
  /** Last request to the API got an HTTP response */
  serverReachable: boolean;
  pending: number;
  failed: FailedEntry[];
  syncing: boolean;
  lastSyncAt: number | null;
  /** Increments whenever a sync applied writes; screens refetch on change */
  syncVersion: number;
}

let status: OutboxStatus = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  serverReachable: true,
  pending: 0,
  failed: [],
  syncing: false,
  lastSyncAt: null,
  syncVersion: 0,
};

const listeners = new Set<() => void>();
type QueuedListener = (m: Mutation) => void;
const queuedListeners = new Set<QueuedListener>();

function setStatus(patch: Partial<OutboxStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export const outboxStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  getSnapshot: () => status,
};

export function onQueued(listener: QueuedListener) {
  queuedListeners.add(listener);
  return () => { queuedListeners.delete(listener); };
}

export function reportReachable(reachable: boolean) {
  if (status.serverReachable !== reachable) setStatus({ serverReachable: reachable });
}

export function isOffline() {
  return !status.online || !status.serverReachable;
}

async function refreshCounts() {
  const db = await getDB();
  const [pending, failed] = await Promise.all([db.count('outbox'), db.getAll('failed')]);
  setStatus({ pending, failed });
}

// ---------------------------------------------------------------------------
// Temp id resolution
// ---------------------------------------------------------------------------

const idmap = new Map<number, number>();

/** Maps a temporary (negative) id to its real id once synced; other ids pass through. */
export function resolveId(id: number): number {
  return id < 0 ? idmap.get(id) ?? id : id;
}

function referencesTemp(m: Mutation, temp: number): boolean {
  return ['id', 'batchId', 'itemId'].some((k) => (m as Record<string, unknown>)[k] === temp);
}

function remap(m: Mutation, temp: number, real: number): Mutation {
  const copy = { ...m } as Record<string, unknown>;
  for (const k of ['id', 'batchId', 'itemId']) {
    if (copy[k] === temp) copy[k] = real;
  }
  return copy as Mutation;
}

// ---------------------------------------------------------------------------
// Queue operations
// ---------------------------------------------------------------------------

export async function enqueue(mutation: Mutation) {
  const db = await getDB();
  await db.add('outbox', { mutation, queuedAt: new Date().toISOString(), attempts: 0 });
  await refreshCounts();
  queuedListeners.forEach((l) => l(mutation));
}

export async function listPending(): Promise<Mutation[]> {
  const db = await getDB();
  return (await db.getAll('outbox')).map((e) => e.mutation);
}

export async function hasPending(): Promise<boolean> {
  return (await (await getDB()).count('outbox')) > 0;
}

export async function dismissFailed(key: number) {
  await (await getDB()).delete('failed', key);
  await refreshCounts();
}

export async function retryFailed(key: number) {
  const db = await getDB();
  const entry = await db.get('failed', key);
  if (!entry) return;
  await db.add('outbox', { mutation: entry.mutation, queuedAt: new Date().toISOString(), attempts: 0 });
  await db.delete('failed', key);
  await refreshCounts();
  void syncNow();
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

async function execute(m: Mutation): Promise<{ id?: number } | undefined> {
  const ids = [('id' in m && m.id), ('batchId' in m && m.batchId), ('itemId' in m && m.itemId)];
  if (ids.some((v) => typeof v === 'number' && v < 0)) {
    throw new Error('Depende de um registro que não pôde ser criado');
  }
  const send = async (p: Promise<{ data: { data: { id?: number } } }>) => (await p).data.data;

  switch (m.kind) {
    case 'createBatch': return send(http.post('/batches', m.data));
    case 'updateBatch': return send(http.put(`/batches/${m.id}`, m.data));
    case 'deleteBatch': return send(http.delete(`/batches/${m.id}`));
    case 'createItem': return send(http.post(`/batches/${m.batchId}/items`, m.data));
    case 'updateItem': return send(http.put(`/items/${m.id}`, m.data));
    case 'deleteItem': return send(http.delete(`/items/${m.id}`));
    case 'createOffer': return send(http.post(`/items/${m.itemId}/offers`, m.data));
    case 'updateOffer': return send(http.put(`/offers/${m.id}`, m.data));
    case 'deleteOffer': return send(http.delete(`/offers/${m.id}`));
  }
}

let syncPromise: Promise<void> | null = null;

/** Replays queued writes in order. Safe to call often; concurrent calls share one run. */
export function syncNow(): Promise<void> {
  if (!syncPromise) {
    syncPromise = runSync().finally(() => {
      syncPromise = null;
    });
  }
  return syncPromise;
}

async function runSync() {
  if (!status.online) return;
  const db = await getDB();
  if ((await db.count('outbox')) === 0) return;

  setStatus({ syncing: true });
  let applied = 0;

  try {
    for (;;) {
      const cursor = await db.transaction('outbox').store.openCursor();
      if (!cursor) break;
      const entry: OutboxEntry = cursor.value;
      const key = entry.key!;

      try {
        const result = await execute(entry.mutation);
        reportReachable(true);
        await db.delete('outbox', key);
        applied++;

        const m = entry.mutation;
        if ('tempId' in m && result?.id) {
          const real = Number(result.id);
          idmap.set(m.tempId, real);
          await db.put('idmap', real, m.tempId);
          // Point later writes at the real id
          const tx = db.transaction('outbox', 'readwrite');
          for await (const c of tx.store) {
            if (referencesTemp(c.value.mutation, m.tempId)) {
              await c.update({ ...c.value, mutation: remap(c.value.mutation, m.tempId, real) });
            }
          }
          await tx.done;
        }
      } catch (err) {
        if (isRetryable(err)) {
          if (isNetworkError(err)) reportReachable(false);
          await db.put('outbox', { ...entry, attempts: entry.attempts + 1 });
          break; // keep order: stop and retry later
        }
        // Rejected by the server (validation, record gone...): set aside so the queue moves on.
        // The server did answer, so it is reachable.
        if (!isNetworkError(err)) reportReachable(true);
        applied++; // screens should reload: their optimistic state for this write is now wrong
        await db.delete('outbox', key);
        await db.add('failed', {
          mutation: entry.mutation,
          error: errorMessage(err),
          failedAt: new Date().toISOString(),
        });
      }
    }
  } finally {
    await refreshCounts();
    setStatus({
      syncing: false,
      lastSyncAt: Date.now(),
      syncVersion: applied > 0 ? status.syncVersion + 1 : status.syncVersion,
    });
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

let started = false;

export async function startOutbox() {
  if (started) return;
  started = true;

  const db = await getDB();
  let cursor = await db.transaction('idmap').store.openCursor();
  while (cursor) {
    idmap.set(Number(cursor.key), cursor.value);
    cursor = await cursor.continue();
  }
  await refreshCounts();

  window.addEventListener('online', () => {
    setStatus({ online: true, serverReachable: true });
    void syncNow();
  });
  window.addEventListener('offline', () => setStatus({ online: false }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow();
  });
  // Covers "browser online but API was down": retry periodically while writes are queued
  window.setInterval(() => {
    if (status.pending > 0) void syncNow();
  }, 30000);

  void syncNow();
}
