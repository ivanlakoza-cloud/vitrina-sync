
// Labels & helpers used across pages

export type DomusRow = Record<string, any>;
export type DomusRecord = DomusRow;

export const prettyLabels: Record<string,string> = {
  tip_pomescheniya: "Тип помещения",
  "tip pomescheniya": "Тип помещения",
  etazh: "Этаж",
  dostupnaya_ploschad: "Доступная площадь",
  address: "Адрес",
  gde: "Где",
  km: "КМ %",
  "km %": "КМ %",
  "km_": "КМ %",
  planirovka: "Планировка",
  "vysota potolkov": "Высота потолков",
  vysota_potolkov: "Высота потолков",
  parkovka: "Парковка",
  // цены
  "price per m2 20": "от 20",
  "price per m2 50": "от 50",
  "price per m2 100": "от 100",
  "price per m2 400": "от 400",
  "price per m2 700": "от 700",
  "price per m2 1500": "от 1500",
  price_per_m2_20: "от 20",
  price_per_m2_50: "от 50",
  price_per_m2_100: "от 100",
  price_per_m2_400: "от 400",
  price_per_m2_700: "от 700",
  price_per_m2_1500: "от 1500",
};

export function labelFor(key: string): string {
  return prettyLabels[key] || key.replace(/[._]+/g, " ");
}

export function shortAddress(rec: DomusRow): string {
  const parts = [];
  if (rec.city) parts.push(String(rec.city));
  const addr = rec.address || rec.adres || rec.adres_avito || rec.adres_23_58;
  if (addr) parts.push(String(addr));
  const out = parts.join(", ");
  return out || (rec.zagolovok ? String(rec.zagolovok) : "Объект");
}

// keys to hide in details
export const HIDDEN_KEYS = new Set<string>([
  "srok_dogovora_let",
  "obespechitelnyy_platezh",
  "vozmozhnost_remontapereplanirovki",
  "ssylka_na_obyavlenie",
  "arendnye_kanikuly",
]);

// section heading keys
export const HEADING_KEYS: Array<{key:string; title:string}> = [
  { key: "1_lokatsiya_i_okruzhenie", title: "Локация и окружение" },
  { key: "2_dostup_i_logistika", title: "Доступ и логистика" },
  { key: "3_kharakteristiki_pomescheniya", title: "Характеристики помещения" },
  { key: "4_kommunikatsii_i_tekhnicheskie_parametry", title: "Коммуникации и технические параметры" },
  { key: "5_marketingovye_vozmozhnosti", title: "Маркетинговые возможности" },
  { key: "6_usloviya_arendy", title: "Условия аренды" },
];

export function isEmpty(v: any): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}
