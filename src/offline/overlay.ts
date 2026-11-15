/**
 * Applies queued (not yet synced) writes on top of data read from the API or the
 * service worker cache, so screens reflect what the user did while offline.
 * Every function is pure: (server data, pending mutations) → what the user should see.
 */
import type { Batch, Item, Offer } from '../types';
import type { Mutation } from './db';
import { resolveId } from './outbox';

const now = () => new Date().toISOString();
const sameId = (a: number, b: number) => resolveId(a) === resolveId(b);

export function overlayBatches(batches: Batch[], pending: Mutation[]): Batch[] {
  let result = batches.map((b) => ({ ...b }));
  for (const m of pending) {
    if (m.kind === 'createBatch') {
      result.unshift({
        id: m.tempId,
        name: m.data.name,
        description: m.data.description ?? null,
        status: 'active',
        item_count: 0,
        created_at: now(),
        updated_at: now(),
        _pending: true,
      });
    } else if (m.kind === 'updateBatch') {
      result = result.map((b) =>
        sameId(b.id, m.id) ? { ...b, ...(m.data as Partial<Batch>), _pending: true } : b,
      );
    } else if (m.kind === 'deleteBatch') {
      result = result.filter((b) => !sameId(b.id, m.id));
    } else if (m.kind === 'createItem') {
      result = result.map((b) =>
        sameId(b.id, m.batchId) ? { ...b, item_count: (b.item_count ?? 0) + 1 } : b,
      );
    }
  }
  return result;
}

export function overlayBatch(batch: Batch | null, batchId: number, pending: Mutation[]): Batch | null {
  const base = batch ? [batch] : [];
  return overlayBatches(base, pending).find((b) => sameId(b.id, batchId)) ?? null;
}

export function overlayItems(items: Item[], batchId: number, pending: Mutation[]): Item[] {
  let result = items.map((i) => ({ ...i }));

  for (const m of pending) {
    switch (m.kind) {
      case 'createItem':
        if (sameId(m.batchId, batchId)) {
          result.unshift({
            id: m.tempId,
            batch_id: batchId,
            name: m.data.name,
            category: m.data.category ?? null,
            status: 'pending',
            offer_count: 0,
            best_price: null,
            created_at: now(),
            updated_at: now(),
            _pending: true,
          });
        }
        break;
      case 'updateItem':
        result = result.map((i) =>
          sameId(i.id, m.id) ? { ...i, ...(m.data as Partial<Item>), _pending: true } : i,
        );
        break;
      case 'deleteItem':
        result = result.filter((i) => !sameId(i.id, m.id));
        break;
      case 'createOffer':
        result = result.map((i) => {
          if (!sameId(i.id, m.itemId)) return i;
          const price = Number(m.data.price);
          const best = i.best_price === null || i.best_price === undefined ? price : Math.min(Number(i.best_price), price);
          return {
            ...i,
            offer_count: (i.offer_count ?? 0) + 1,
            best_price: best,
            // Mirrors the backend: a pending item with an offer becomes "found"
            status: i.status === 'pending' ? 'found' : i.status,
            _pending: true,
          };
        });
        break;
      case 'deleteOffer':
        result = result.map((i) =>
          sameId(i.id, m.itemId)
            ? { ...i, offer_count: Math.max(0, (i.offer_count ?? 1) - 1), _pending: true }
            : i,
        );
        break;
      case 'updateOffer':
        result = result.map((i) => (sameId(i.id, m.itemId) ? { ...i, _pending: true } : i));
        break;
    }
  }
  return result;
}

export function overlayOffers(offers: Offer[], itemId: number, pending: Mutation[]): Offer[] {
  let result = offers.map((o) => ({ ...o }));
  for (const m of pending) {
    if (m.kind === 'createOffer' && sameId(m.itemId, itemId)) {
      result.push({
        id: m.tempId,
        item_id: itemId,
        ecommerce: m.data.ecommerce,
        price: Number(m.data.price),
        link: m.data.link,
        found_at: now(),
        created_at: now(),
        _pending: true,
      });
    } else if (m.kind === 'updateOffer') {
      result = result.map((o) =>
        sameId(o.id, m.id) ? { ...o, ...m.data, price: Number(m.data.price), _pending: true } : o,
      );
    } else if (m.kind === 'deleteOffer') {
      result = result.filter((o) => !sameId(o.id, m.id));
    }
  }
  return result.sort((a, b) => Number(a.price) - Number(b.price));
}
