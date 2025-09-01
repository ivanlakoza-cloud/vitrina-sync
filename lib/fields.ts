export type DomusRow = Record<string, any>;

export const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";

// Keys to hide on the detail page
export const hiddenKeys = new Set<string>([
  "srok_dogovora_let",
  "obespechitelnyy_platezh",
  "vozmozhnost_remontapereplanirovki",
  "ssylka_na_obyavlenie",
  "arendnye_kanikuly",
  "created_at",
  "updated_at",
  "id",
  "external_id",
]);

// Section header fields (show as headings even if value is empty)
export const SECTION_FIELDS: Record<string, string> = {
  "1_lokatsiya_i_okruzhenie": "Локация и окружение",
  "2_dostup_i_logistika": "Доступ и логистика",
  "3_kharakteristiki_pomescheniya": "Характеристики помещения",
  "4_kommunikatsii_i_tekhnicheskie_parametry": "Коммуникации и технические параметры",
  "5_marketingovye_vozmozhnosti": "Маркетинговые возможности",
  "6_usloviya_arendy": "Условия аренды",
};

// Fallback labels if SQL comments are unavailable
export const prettyLabels: Record<string, string> = {
  tip_pomescheniya: "Тип помещения",
  etazh: "Этаж",
  dostupnaya_ploschad: "Доступно",
  km_: "КМ %",
  address: "Адрес",
  gde: "Где",
};

// Order for prices, with human labels
export const PRICE_KEYS: Array<{key: string; label: string}> = [
  { key: "price_per_m2_20", label: "от 20" },
  { key: "price_per_m2_50", label: "от 50" },
  { key: "price_per_m2_100", label: "от 100" },
  { key: "price_per_m2_400", label: "от 400" },
  { key: "price_per_m2_700", label: "от 700" },
  { key: "price_per_m2_1500", label: "от 1500" },
];

export function shortAddress(rec: DomusRow): string {
  return (
    rec["zagolovok"] ||
    rec["address"] ||
    rec["adres_avito"] ||
    (rec["city"] ? `${rec["city"]}${rec["address"] ? ", " + rec["address"] : ""}` : "") ||
    "—"
  );
}

export function isSectionField(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(SECTION_FIELDS, key);
}
