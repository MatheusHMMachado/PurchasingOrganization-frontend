/*
 * Parses what the Android share sheet sends to the Web Share Target (/share?title&text&url).
 *
 * Each app shares differently, e.g.:
 *   Amazon:        text="Confira este produto: Fone Bluetooth XYZ https://a.co/d/abc123"
 *   Mercado Livre: text="Olha o que encontrei no Mercado Livre: Fone XYZ https://mercadolivre.com/sec/abc"
 *   Shopee:        text="Confira Fone XYZ por R$ 99,90. Compre agora! https://s.shopee.com.br/abc"
 *   Browsers:      title="Fone XYZ | Amazon.com.br", url="https://www.amazon.com.br/..."
 */

const URL_RE = /https?:\/\/\S+/i;

export interface SharedProduct {
  link: string;
  name: string;
  /** Price found in the shared text ("R$ 99,90"), when the app includes one */
  priceText: string;
}

function extractLink(fields: string[]): string {
  for (const f of fields) {
    const match = f.match(URL_RE);
    if (match) return match[0].replace(/[).,;!?"']+$/, '');
  }
  return '';
}

function extractPrice(fields: string[]): string {
  for (const f of fields) {
    const match = f.match(/R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/);
    if (match) return match[1];
  }
  return '';
}

/** Common share boilerplate in pt-BR/en, removed from the product name */
const NOISE: RegExp[] = [
  /^.*?\b(?:encontrei|achei|vi|found)\b[^:]*:\s*/i, // "Olha o que encontrei no Mercado Livre: "
  /^(?:confira|veja|olha|d[aá] uma olhada(?: n[oa])?|check out|look at)(?: (?:este|esse|this))?(?: produto| product)?\s*[:\-–]?\s*/i,
  /\s*\bpor\s+R\$\s?[\d.,]+.*$/i, // " por R$ 99,90. Compre agora!"
  /\s*\b(?:compre agora|buy now|aproveite)\b.*$/i,
  /\s*\b(?:na|no|on|at)\s+(?:a\s+)?(?:amazon|mercado livre|shopee|magalu|magazine luiza|americanas|casas bahia|aliexpress|kabum)\b.*$/i,
  /\s*[|\-–]\s*(?:amazon(?:\.com)?(?:\.br)?|mercado livre|shopee(?: brasil)?|magazine luiza|magalu|americanas|casas bahia|aliexpress|kabum!?)\s*$/i,
];

const STORE_ONLY =
  /^(?:www\.)?(?:amazon|mercado ?livre|shopee|magazine luiza|magalu|americanas|casas bahia|aliexpress|kabum)(?:\.com)?(?:\.br)?!?$/i;

function cleanName(raw: string): string {
  let s = raw.replace(URL_RE, ' ').replace(/\s+/g, ' ').trim();
  for (const re of NOISE) s = s.replace(re, '').trim();
  s = s.replace(/^["'“”]+|["'“”:.\-–!]+$/g, '').trim();
  return s.length > 255 ? `${s.slice(0, 252)}...` : s;
}

export function parseSharedProduct(params: URLSearchParams): SharedProduct {
  const title = params.get('title') ?? '';
  const text = params.get('text') ?? '';
  const url = params.get('url') ?? '';

  const link = extractLink([url, text, title]);

  // Some apps send only the store/app name as title ("Amazon.com.br"): ignore it and keep
  // whichever candidate actually describes the product (the longer one)
  const candidates = [cleanName(title), cleanName(text)].filter((c) => c && !STORE_ONLY.test(c));
  const name = candidates.sort((a, b) => b.length - a.length)[0] ?? '';

  return { link, name, priceText: extractPrice([text, title]) };
}
