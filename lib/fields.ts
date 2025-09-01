// Helper utilities & types for Vitrina UI
// Designed to be resilient to missing/renamed columns.

export type DomusRow = Record<string, any>;

// Keep a light Prices type to satisfy components; all fields optional.
export interface Prices {
  price_per_m2_20?: number | null;
  price_per_m2_50?: number | null;
  price_per_m2_100?: number | null;
  price_per_m2_400?: number | null;
  price_per_m2_700?: number | null;
  price_per_m2_1500?: number | null;
  // older / alternative column names with spaces (after the recent rename)
  "price per m2 20"?: number | null;
  "price per m2 50"?: number | null;
  "price per m2 100"?: number | null;
  "price per m2 400"?: number | null;
  "price per m2 700"?: number | null;
  "price per m2 1500"?: number | null;
}

// Known Russian labels (fallback). If DB provides a "Description" mapping,
// prefer that externally; this is only a safety net.
export const RU_FALLBACK_LABELS: Record<string, string> = {
  city: "Город",
  address: "Адрес",
  tip_pomescheniya: "Тип помещения",
  tip_pomeshcheniya: "Тип помещения",
  dostupnaya_ploschad: "Доступно",
  dostupno: "Доступно",
  km_: "КМ %",
  km: "КМ %",
  "price per m2 20": "Цена, ₽/м² (от 20)",
  "price per m2 50": "Цена, ₽/м² (от 50)",
  "price per m2 100": "Цена, ₽/м² (от 100)",
  "price per m2 400": "Цена, ₽/м² (от 400)",
  "price per m2 700": "Цена, ₽/м² (от 700)",
  "price per m2 1500": "Цена, ₽/м² (от 1500)",
  price_per_m2_20: "Цена, ₽/м² (от 20)",
  price_per_m2_50: "Цена, ₽/м² (от 50)",
  price_per_m2_100: "Цена, ₽/м² (от 100)",
  price_per_m2_400: "Цена, ₽/м² (от 400)",
  price_per_m2_700: "Цена, ₽/м² (от 700)",
  price_per_m2_1500: "Цена, ₽/м² (от 1500)",
};

/** Return a pretty Russian label for a key.
 * Priority: provided labels map (from DB) -> fallback dict -> humanized key.
 */
export function prettyLabel(key: string, labels?: Record<string, string>): string {
  if (!key) return "";
  if (labels && Object.prototype.hasOwnProperty.call(labels, key)) {
    const val = labels[key];
    if (val && String(val).trim().length) return String(val).trim();
  }
  if (Object.prototype.hasOwnProperty.call(RU_FALLBACK_LABELS, key)) {
    return RU_FALLBACK_LABELS[key];
  }
  // Humanize
  const s = key.replace(/_{1,}/g, " ").replace(/\s{2,}/g, " ").trim();
  // Uppercase first letter
  return s ? s[0].toUpperCase() + s.slice(1) : key;
}

/** Compose a short address/title */
export function shortAddress(rec: DomusRow): string {
  const cands = [
    rec?.address,
    rec?.adres_avito,
    rec?.adres_23_58,
    rec?.["Адрес"],
    rec?.city,
    rec?.["Город"],
  ];
  const v = cands.find((x) => x && String(x).trim().length);
  return (v ? String(v) : "Объект").trim();
}

/** Safe split of an array of items into N columns with near-equal length */
export function chunkEvenly<T>(items: T[], columns = 3): T[][] {
  const cols: T[][] = Array.from({ length: Math.max(columns, 1) }, () => []);
  if (!Array.isArray(items) || items.length === 0) return cols;
  items.forEach((item, idx) => {
    cols[idx % cols.length].push(item);
  });
  return cols;
}

/** Return a first non-empty property among candidate keys */
export function pick<T extends object = DomusRow>(obj: T, keys: string[]): any {
  if (!obj) return null;
  for (const k of keys) {
    // eslint-disable-next-line no-prototype-builtins
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      // @ts-ignore
      const v = (obj as any)[k];
      if (v !== undefined && v !== null && String(v).trim?.() !== "") return v;
    }
  }
  return null;
}

export function safeNum(n: any): number | null {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

export function formatPrice(v: any): string {
  const n = safeNum(v);
  return n == null ? "—" : n.toLocaleString("ru-RU");
}

// Guarded accessor that never throws
export function safeGet<T = any>(obj: any, path: string | string[], fallback?: T): T {
  try {
    const parts = Array.isArray(path) ? path : String(path).split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return (fallback as T);
      cur = cur[p];
    }
    return (cur === undefined ? (fallback as T) : (cur as T));
  } catch {
    return (fallback as T);
  }
}
