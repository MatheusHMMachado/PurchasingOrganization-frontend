import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BatchFormData, ItemFormData, OfferFormData } from '../types';

/**
 * A write the user made while offline (or while earlier writes were still queued).
 * Entities created offline get a negative temporary id; later mutations may reference it
 * and are rewritten with the real id once the create reaches the server.
 */
export type Mutation =
  | { kind: 'createBatch'; tempId: number; data: BatchFormData }
  | { kind: 'updateBatch'; id: number; data: Partial<BatchFormData & { status: string }> }
  | { kind: 'deleteBatch'; id: number }
  | { kind: 'createItem'; tempId: number; batchId: number; data: ItemFormData }
  | { kind: 'updateItem'; id: number; data: Partial<ItemFormData & { status: string }> }
  | { kind: 'deleteItem'; id: number }
  | { kind: 'createOffer'; tempId: number; itemId: number; data: OfferFormData }
  | { kind: 'updateOffer'; id: number; itemId: number; data: OfferFormData }
  | { kind: 'deleteOffer'; id: number; itemId: number };

export interface OutboxEntry {
  key?: number;
  mutation: Mutation;
  queuedAt: string;
  attempts: number;
}

export interface FailedEntry {
  key?: number;
  mutation: Mutation;
  error: string;
  failedAt: string;
}

interface OfflineDB extends DBSchema {
  outbox: { key: number; value: OutboxEntry };
  failed: { key: number; value: FailedEntry };
  /** temporary id → real id, so screens holding a temp id keep working after sync */
  idmap: { key: number; value: number };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>('purchasing-offline', 1, {
      upgrade(db) {
        db.createObjectStore('outbox', { keyPath: 'key', autoIncrement: true });
        db.createObjectStore('failed', { keyPath: 'key', autoIncrement: true });
        db.createObjectStore('idmap');
      },
    });
  }
  return dbPromise;
}

let lastTemp = 0;
/** Unique negative id for entities created offline. */
export function newTempId(): number {
  const t = -Date.now();
  lastTemp = t < lastTemp ? t : lastTemp - 1;
  return lastTemp;
}
