export const ECOMMERCE_OPTIONS = [
  'Amazon',
  'Mercado Livre',
  'Shopee',
  'Magazine Luiza',
  'Americanas',
  'Casas Bahia',
  'AliExpress',
  'Kabum',
  'Outro',
] as const;

/** Domain fragments used to guess the store from a pasted link. */
const DOMAIN_MAP: Array<[string, string]> = [
  ['amazon.', 'Amazon'],
  ['amzn.', 'Amazon'],
  ['mercadolivre.', 'Mercado Livre'],
  ['mercadolibre.', 'Mercado Livre'],
  ['shopee.', 'Shopee'],
  ['magazineluiza.', 'Magazine Luiza'],
  ['magalu.', 'Magazine Luiza'],
  ['americanas.', 'Americanas'],
  ['casasbahia.', 'Casas Bahia'],
  ['aliexpress.', 'AliExpress'],
  ['kabum.', 'Kabum'],
];

/** Returns the hostname of a URL, or null if it is not a valid URL. */
export function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * True only for http(s) links with a host. Anything else (javascript:, data:...) must never
 * become a clickable href, even if it is already stored in the database.
 */
export function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname !== '';
  } catch {
    return false;
  }
}

/** Guesses the e-commerce from a URL. Returns null when unknown. */
export function detectEcommerce(url: string): string | null {
  const host = safeHostname(url.trim());
  if (!host) return null;
  // Amazon app share links use the short domain a.co (exact match: "a.co" is a substring of many hosts)
  if (host === 'a.co') return 'Amazon';
  const match = DOMAIN_MAP.find(([fragment]) => host.includes(fragment));
  return match ? match[1] : null;
}

export function formatBRL(value: number | string | null | undefined): string {
  const n = Number(value);
  if (value === null || value === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Parses a price typed in Brazilian or international format.
 * "1.299,90" → 1299.9 · "1299.90" → 1299.9 · "R$ 49,90" → 49.9
 */
export function parsePrice(input: string): number | null {
  let s = input.replace(/[^\d.,]/g, '');
  if (!s) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.299" in pt-BR means one thousand two hundred ninety-nine
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
