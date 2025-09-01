export type Prices = {
  price_per_m2_20?: number | null;
  price_per_m2_50?: number | null;
  price_per_m2_100?: number | null;
  price_per_m2_400?: number | null;
  price_per_m2_700?: number | null;
  price_per_m2_1500?: number | null;
};

export function prettyLabel(key: string, order?: Record<string, any>): string {
  const fromDb = order?.[key]?.display_name_ru as string | undefined;
  if (fromDb && fromDb.trim()) return fromDb;
  return key
    .replace(/_/g, " ")
    .replace(/\b([a-zа-яё])/gi, (m) => m.toUpperCase());
}

export function shortAddress(rec: any): string {
  return (
    (rec?.address as string) ||
    (rec?.adres_avito as string) ||
    [rec?.city, rec?.address].filter(Boolean).join(", ") ||
    "Объект"
  );
}

export function chunkEvenly<T>(arr: T[], n: number): T[][] {
  const buckets: T[][] = Array.from({ length: n }, () => []);
  arr.forEach((item, i) => buckets[i % n].push(item));
  return buckets;
}