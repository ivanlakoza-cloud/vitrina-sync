export type FieldOrder = {
  column_name: string;
  display_name_ru: string | null;
  sort_order: number | null;
  visible: boolean | null;
};

export function prettyLabel(key: string, dict?: Record<string, string | null>): string {
  if (dict && dict[key]) return String(dict[key]);
  // fallbacks
  const normalized = key
    .replace(/^\d+_/, '') // drop numeric prefixes
    .replace(/_/g, ' ')
    .trim();
  // Uppercase first letter
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// split array in N nearly-equal chunks
export function chunkEvenly<T>(arr: T[], n: number): T[][] {
  const out: T[][] = Array.from({ length: n }, () => []);
  arr.forEach((item, i) => out[i % n].push(item));
  return out;
}

// keys for the main (left) block
export const mainKeys = [
  'tip_pomescheniya',
  'etazh',
  'dostupnaya_ploschad',
  'km_',
];
