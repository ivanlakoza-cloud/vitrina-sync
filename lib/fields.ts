
export function titleCase(s: string) {
  return s.replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|\s|-|\/)\p{L}/gu, (m) => m.toUpperCase());
}

export function prettyLabel(key: string, labels?: Record<string, string | undefined>): string {
  const direct = labels?.[key];
  if (direct) return direct;
  // fallback from machine -> readable (ru translit friendly)
  const cleaned = key
    .replace(/__/g, "_")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return titleCase(cleaned);
}

export function shortAddress(rec: Record<string, any>): string {
  const addr = (rec.address || rec.adres_avito || "").toString().trim();
  if (!addr) return "Объект";
  // короткий вид: без страны, иногда без города если дублируется
  return addr.replace(/^Россия,\s*/i, "");
}

// разбиваем элементы равномерно по N колонкам (round-robin)
export function chunkEvenly<T>(items: T[], cols: number): T[][] {
  const res = Array.from({ length: cols }, () => [] as T[]);
  items.forEach((it, i) => res[i % cols].push(it));
  return res;
}
