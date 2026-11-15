import type {
  ApiResponse,
  Batch,
  Item,
  Offer,
  DashboardData,
  BatchFormData,
  ItemFormData,
  OfferFormData,
  DashboardFilters,
} from '../types';
import { http, isNetworkError, isUnauthorized } from './http';
import { newTempId, type Mutation } from '../offline/db';
import {
  enqueue,
  hasPending,
  isOffline,
  listPending,
  reportReachable,
  resolveId,
  syncNow,
} from '../offline/outbox';
import { overlayBatch, overlayBatches, overlayItems, overlayOffers } from '../offline/overlay';

/*
 * Reads go to the network (the service worker answers from cache when offline) and are
 * then merged with writes still waiting in the offline queue.
 *
 * Writes go straight to the API when possible. When offline, when the API is unreachable,
 * or when earlier writes are still queued (to preserve order), they are queued instead
 * and an optimistic result is returned.
 */

async function read<T>(url: string): Promise<T> {
  try {
    const { data, headers } = await http.get<ApiResponse<T>>(url);
    // The service worker answered from cache because the API is unreachable
    reportReachable(headers['x-from-sw-cache'] !== '1');
    return data.data;
  } catch (err) {
    if (isNetworkError(err)) reportReachable(false);
    throw err;
  }
}

async function mutate<T>(mutation: Mutation, online: () => Promise<T>, optimistic: () => T): Promise<T> {
  if (isOffline() || (await hasPending())) {
    await enqueue(mutation);
    void syncNow();
    return optimistic();
  }
  try {
    const result = await online();
    reportReachable(true);
    return result;
  } catch (err) {
    if (isUnauthorized(err)) {
      // Session expired mid-use: keep the write; it is sent after the next login
      await enqueue(mutation);
      return optimistic();
    }
    if (!isNetworkError(err)) throw err;
    reportReachable(false);
    await enqueue(mutation);
    return optimistic();
  }
}

const body = async <T>(p: Promise<{ data: ApiResponse<T> }>) => (await p).data.data;
const stamp = () => new Date().toISOString();

// === Batches ===

export const getBatches = async (): Promise<Batch[]> => {
  const batches = await read<Batch[]>('/batches');
  return overlayBatches(batches, await listPending());
};

export const getBatch = async (id: number): Promise<Batch> => {
  const realId = resolveId(id);
  const batch = realId < 0 ? null : await read<Batch>(`/batches/${realId}`);
  const result = overlayBatch(batch, id, await listPending());
  if (!result) throw new Error('Remessa não encontrada');
  return result;
};

export const createBatch = (formData: BatchFormData): Promise<Batch> => {
  const tempId = newTempId();
  return mutate(
    { kind: 'createBatch', tempId, data: formData },
    () => body(http.post<ApiResponse<Batch>>('/batches', formData)),
    () => ({
      id: tempId, name: formData.name, description: formData.description ?? null,
      status: 'active', item_count: 0, created_at: stamp(), updated_at: stamp(), _pending: true,
    }),
  );
};

export const updateBatch = (id: number, formData: Partial<BatchFormData & { status: string }>): Promise<Batch> =>
  mutate(
    { kind: 'updateBatch', id: resolveId(id), data: formData },
    () => body(http.put<ApiResponse<Batch>>(`/batches/${resolveId(id)}`, formData)),
    () => ({ id, ...formData, _pending: true }) as Batch,
  );

export const deleteBatch = (id: number): Promise<void> =>
  mutate(
    { kind: 'deleteBatch', id: resolveId(id) },
    async () => { await http.delete(`/batches/${resolveId(id)}`); },
    () => undefined,
  );

// === Items ===

export const getItems = async (batchId: number): Promise<Item[]> => {
  const realId = resolveId(batchId);
  const items = realId < 0 ? [] : await read<Item[]>(`/batches/${realId}/items`);
  return overlayItems(items, batchId, await listPending());
};

export const getItem = async (id: number): Promise<Item> => read<Item>(`/items/${resolveId(id)}`);

export const createItem = (batchId: number, formData: ItemFormData): Promise<Item> => {
  const tempId = newTempId();
  const realBatch = resolveId(batchId);
  return mutate(
    { kind: 'createItem', tempId, batchId: realBatch, data: formData },
    () => body(http.post<ApiResponse<Item>>(`/batches/${realBatch}/items`, formData)),
    () => ({
      id: tempId, batch_id: batchId, name: formData.name, category: formData.category ?? null,
      status: 'pending', created_at: stamp(), updated_at: stamp(), _pending: true,
    }),
  );
};

export const updateItem = (id: number, formData: Partial<ItemFormData & { status: string }>): Promise<Item> =>
  mutate(
    { kind: 'updateItem', id: resolveId(id), data: formData },
    () => body(http.put<ApiResponse<Item>>(`/items/${resolveId(id)}`, formData)),
    () => ({ id, ...formData, _pending: true }) as Item,
  );

export const deleteItem = (id: number): Promise<void> =>
  mutate(
    { kind: 'deleteItem', id: resolveId(id) },
    async () => { await http.delete(`/items/${resolveId(id)}`); },
    () => undefined,
  );

// === Offers ===

export const getOffers = async (itemId: number): Promise<Offer[]> => {
  const realId = resolveId(itemId);
  const offers = realId < 0 ? [] : await read<Offer[]>(`/items/${realId}/offers`);
  return overlayOffers(offers, itemId, await listPending());
};

export const createOffer = (itemId: number, formData: OfferFormData): Promise<Offer> => {
  const tempId = newTempId();
  const realItem = resolveId(itemId);
  return mutate(
    { kind: 'createOffer', tempId, itemId: realItem, data: formData },
    () => body(http.post<ApiResponse<Offer>>(`/items/${realItem}/offers`, formData)),
    () => ({
      id: tempId, item_id: itemId, ecommerce: formData.ecommerce, price: Number(formData.price),
      link: formData.link, found_at: stamp(), created_at: stamp(), _pending: true,
    }),
  );
};

export const updateOffer = (id: number, formData: OfferFormData, itemId: number): Promise<Offer> =>
  mutate(
    { kind: 'updateOffer', id: resolveId(id), itemId: resolveId(itemId), data: formData },
    () => body(http.put<ApiResponse<Offer>>(`/offers/${resolveId(id)}`, formData)),
    () => ({ id, item_id: itemId, ...formData, price: Number(formData.price), _pending: true }) as Offer,
  );

export const deleteOffer = (id: number, itemId: number): Promise<void> =>
  mutate(
    { kind: 'deleteOffer', id: resolveId(id), itemId: resolveId(itemId) },
    async () => { await http.delete(`/offers/${resolveId(id)}`); },
    () => undefined,
  );

// === Dashboard ===

export const getDashboard = async (filters?: DashboardFilters): Promise<DashboardData> => {
  const params = new URLSearchParams();
  if (filters?.batch_id) params.append('batch_id', String(filters.batch_id));
  if (filters?.item_id) params.append('item_id', String(filters.item_id));
  if (filters?.min_price) params.append('min_price', String(filters.min_price));
  if (filters?.max_price) params.append('max_price', String(filters.max_price));

  return read<DashboardData>(`/dashboard?${params.toString()}`);
};

export default http;
