
import type { DomusRow } from "./fields";
import { priceKeys, humanLabel } from "./fields";

export const SECTION_TITLES: Record<string,string> = {
  "1_lokatsiya_i_okruzhenie": "Локация и окружение",
  "2_dostup_i_logistika": "Доступ и логистика",
  "3_kharakteristiki_pomescheniya": "Характеристики помещения",
  "4_kommunikatsii_i_tekhnicheskie_parametry": "Коммуникации и технические параметры",
  "5_marketingovye_vozmozhnosti": "Маркетинговые возможности",
  "6_usloviya_arendy": "Условия аренды",
};

export const HIDE_KEYS = new Set<string>([
  "srok_dogovora_let",
  "obespechitelnyy_platezh",
  "vozmozhnost_remontapereplanirovki",
  "ssylka_na_obyavlenie",
  "arendnye_kanikuly",
]);

export function isSectionKey(k: string) {
  return k in SECTION_TITLES;
}

export type DetailItem = { key: string; label: string; value: any; isSection?: boolean };

export function buildDetailItems(rec: DomusRow, labelsFromDb?: Record<string,string>): DetailItem[] {
  const items: DetailItem[] = [];
  for (const [k, v] of Object.entries(rec)) {
    const key = k as string;
    if (HIDE_KEYS.has(key)) continue;
    if (priceKeys.includes(key)) continue;
    if (key === "id" || key === "external_id") continue;
    if (key === "tip_pomeshcheniya" || key === "etazh" || key === "dostupnaya_ploschad" || key === "km" || key === "km_") continue;

    if (isSectionKey(key)) {
      items.push({ key, label: SECTION_TITLES[key], value: "", isSection: true });
      continue;
    }

    const val = v as any;
    if (val === null || val === undefined) continue;
    const s = String(val).trim();
    if (!s || s.toLowerCase() === "null" || s === "-") continue;

    items.push({
      key,
      label: humanLabel(key, labelsFromDb),
      value: val,
    });
  }
  return items;
}

export function splitIntoN<T>(arr: T[], n: number): T[][] {
  const out: T[][] = Array.from({length: n}, () => []);
  arr.forEach((val, i) => {
    out[i % n].push(val);
  });
  return out;
}
