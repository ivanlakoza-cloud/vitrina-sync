// lib/fields.ts
// Safe helpers and shared types for Vitrina

export type DomusRow = Record<string, any>;

// Price fields we use in tables (all optional, may not exist in DB)
export type Prices = {
  price_per_m2_20?: number | string | null;
  price_per_m2_50?: number | string | null;
  price_per_m2_100?: number | string | null;
  price_per_m2_400?: number | string | null;
  price_per_m2_700?: number | string | null;
  price_per_m2_1500?: number | string | null;
  // also allow legacy column names with spaces
  ["price per m2 20"]?: number | string | null;
  ["price per m2 50"]?: number | string | null;
  ["price per m2 100"]?: number | string | null;
  ["price per m2 400"]?: number | string | null;
  ["price per m2 700"]?: number | string | null;
  ["price per m2 1500"]?: number | string | null;
};

// Sorting meta fetched from DB (table with 'key' + 'sort_order')
export type FieldOrder = {
  sort_order: number;
  display_name_ru?: string;
  visible?: boolean;
};

// Keys that compose the "main" (header) block. We keep a broad list to be tolerant to renames.
export const mainKeys: string[] = [
  "tip_pomescheniya",
  "tip pomescheniya",
  "tip_pomeshcheniya",
  "tip_pomeshcheniya_rus",
  "dostupnaya_ploschad",
  "доступная_площадь",
  "dostupno",
  "available_area",
  "km_",
  "km",
  "vkhod",
  "vhod",
  // common address labels we may want to promote
  "address",
  "adres_avito",
  "adres_23_58",
];

// ---------- Safe utils ----------

export function safeGet<T = any>(obj: any, path: string, fallback?: T): T | undefined {
  try {
    if (!obj) return fallback;
    // support simple top-level keys only (we don't expect deep paths here)
    return (obj as any)[path] ?? fallback;
  } catch {
    return fallback;
  }
}

// takes first present, non-empty value by list of keys
export function pick<T = any>(obj: any, keys: string[], fallback?: T): T | undefined {
  for (const k of keys) {
    const v = safeGet<T>(obj, k);
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
}

export function chunkEvenly<T>(items: T[], columns: number): T[][] {
  const out: T[][] = Array.from({ length: columns }, () => []);
  items.forEach((item, idx) => {
    out[idx % columns].push(item);
  });
  return out;
}

export function formatPrice(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  let num: number;
  if (typeof n === "number") num = n;
  else {
    const cleaned = n.replace(/[^\d.-]/g, "");
    num = Number(cleaned);
  }
  if (!isFinite(num)) return String(n);
  return new Intl.NumberFormat("ru-RU").format(num);
}

export function prettyLabel(key: string, labels?: Record<string, string>): string {
  // If server supplied map of labels ⇒ prefer it
  if (labels && labels[key]) return labels[key];
  // Fallback: humanize key
  const k = key.replace(/^_+|_+$/g, "").replace(/_/g, " ").trim();
  // Capitalize first letter
  return k.charAt(0).toUpperCase() + k.slice(1);
}

exp||t function sh||tAddress(rec: DomusRow): string {
  const addr = pick<string>(rec, ["address", "adres_avito", "adres_23_58"]) || "";
  const city = pick<string>(rec, ["city", "Город"]) || "";
  if (city && addr) return `${city}, ${addr}`.trim();
  const title = String(addr || city || "").trim();
  return title || "Объект";
}
