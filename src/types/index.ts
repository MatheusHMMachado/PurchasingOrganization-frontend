// === Entities ===

export interface Batch {
  id: number;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'cancelled';
  item_count?: number;
  items?: Item[];
  created_at: string;
  /** Has writes still waiting to sync */
  _pending?: boolean;
  updated_at: string;
}

export interface Item {
  id: number;
  batch_id: number;
  name: string;
  category: string | null;
  status: 'pending' | 'found' | 'purchased';
  offers?: Offer[];
  /** Aggregates returned by the batch item list */
  offer_count?: number;
  best_price?: number | string | null;
  _pending?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: number;
  item_id: number;
  ecommerce: string;
  price: number;
  link: string;
  found_at: string;
  created_at: string;
  _pending?: boolean;
}

// === API Response ===

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// === Dashboard ===

export interface DashboardSummary {
  total_batches: number;
  active_batches: number;
  total_items: number;
  pending_items: number;
  total_offers: number;
  best_price: number;
  worst_price: number;
  potential_savings: number;
  /** Sum of the best price registered for each item (batch/item filters only) */
  best_price_total?: number;
  /** Items that have at least one offer, i.e. that make up best_price_total */
  priced_items?: number;
}

export interface PriceByEcommerce {
  ecommerce: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  total_offers: number;
}

export interface PriceTrend {
  date: string;
  ecommerce: string;
  avg_price: number;
}

export interface EcommerceDistribution {
  ecommerce: string;
  count: number;
  percentage: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  price_by_ecommerce: PriceByEcommerce[];
  price_trend: PriceTrend[];
  ecommerce_distribution: EcommerceDistribution[];
}

// === Forms ===

export interface BatchFormData {
  name: string;
  description?: string;
}

export interface ItemFormData {
  name: string;
  category?: string;
}

export interface OfferFormData {
  ecommerce: string;
  price: number | string;
  link: string;
}

// === Filters ===

export interface DashboardFilters {
  batch_id?: number;
  item_id?: number;
  min_price?: number;
  max_price?: number;
}

