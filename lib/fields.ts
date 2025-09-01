// @ts-nocheck
export const HIDDEN_KEYS = new Set([
  "srok_dogovora_let",
  "obespechitelnyy_platezh",
  "vozmozhnost_remontapereplanirovki",
  "ssylka_na_obyavlenie",
  "arendnye_kanikuly",
  "created_at","updated_at","id","external_id"
]);

export const HEADING_KEYS: string[] = [
  "1_lokatsiya_i_okruzhenie",
  "2_dostup_i_logistika",
  "3_kharakteristiki_pomescheniya",
  "4_kommunikatsii_i_tekhnicheskie_parametry",
  "5_marketingovye_vozmozhnosti",
  "6_usloviya_arendy",
];

export function humanizeKey(k: string) {
  return k.replace(/_/g," ").replace(/\s+/g," ").trim();
}

export function labelFor(key: string, labels: Record<string,string>) {
  if (labels && labels[key]) return labels[key];
  return humanizeKey(key);
}

export function isEmpty(v: any) {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  if (s === "") return true;
  if (s.toLowerCase() === "null") return true;
  return false;
}
