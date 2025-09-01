
// Lightweight helpers for field labels and formatting.
// We try to be resilient to column name changes.

export function toTitle(s: string): string {
  if (!s) return "";
  // replace underscores and collapse spaces
  const cleaned = s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  // keep common lowercase prepositions
  return cleaned
    .split(" ")
    .map((w, i) => (i > 0 && ["и","в","на","за","по","от","до"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

// Fallback pretty label when we don't have a DB-provided display name
export function prettyLabel(column: string): string {
  // try to convert translit-looking names into spaced words
  if (!column) return "";
  // special cases
  const map: Record<string,string> = {
    "km": "КМ %",
    "km_": "КМ %",
    "etazh": "Этаж",
    "city": "Город",
    "dostupnaya_ploschad": "Доступная площадь",
    "tip_pomescheniya": "Тип помещения",
    "price_per_m2_20": "от 20",
    "price_per_m2_50": "от 50",
    "price_per_m2_100": "от 100",
    "price_per_m2_400": "от 400",
    "price_per_m2_700": "от 700",
    "price_per_m2_1500": "от 1500",
  };
  if (map[column]) return map[column];
  return toTitle(column);
}

export function chunkEvenly<T>(arr: T[], n: number): T[][] {
  const out: T[][] = Array.from({length: n}, () => []);
  arr.forEach((item, i) => out[i % n].push(item));
  return out;
}
