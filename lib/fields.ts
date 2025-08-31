export type DomusRecord = Record<string, any> & {
  id?: number | string;
  external_id: string;
  city?: string | null;
  zagolovok?: string | null;
  adres_23_58?: string | null;
  adres_avito?: string | null;
  tip_pomescheniya?: string | null;
  etazh?: string | null;
  dostupnaya_ploschad?: string | null;
  disk_foto_plan?: string | null;
  ot_20?: string | null;
  ot_50?: string | null;
  ot_100?: string | null;
  ot_400?: string | null;
  ot_700?: string | null;
  ot_1500?: string | null;
  tekst_obyavleniya?: string | null;
};

export const prettyLabels: Record<string,string> = {
  external_id: "Внешний ID",
  city: "Город",
  zagolovok: "Заголовок",
  tip_pomescheniya: "Тип помещения",
  etazh: "Этаж",
  dostupnaya_ploschad: "Доступная площадь",
  adres_23_58: "Адрес",
  adres_avito: "Адрес (Avito)",
  ot_20: "Цена от 20 м², ₽/м²",
  ot_50: "Цена от 50 м², ₽/м²",
  ot_100: "Цена от 100 м², ₽/м²",
  ot_400: "Цена от 400 м², ₽/м²",
  ot_700: "Цена от 700 м², ₽/м²",
  ot_1500: "Цена от 1500 м², ₽/м²",
  tekst_obyavleniya: "Описание",
};

const PRICE_FIELDS = ["ot_20","ot_50","ot_100","ot_400","ot_700","ot_1500"] as const;
export type PriceKey = typeof PRICE_FIELDS[number];

export function shortAddress(r: DomusRecord): string {
  return (r.adres_23_58 || r.adres_avito || "").trim();
}

export function pricePairs(r: DomusRecord): {label: string, key: PriceKey, value: string}[] {
  const map: Record<PriceKey,string> = {
    ot_20: "от 20",
    ot_50: "от 50",
    ot_100: "от 100",
    ot_400: "от 400",
    ot_700: "от 700",
    ot_1500: "от 1500",
  };
  const out: {label: string, key: PriceKey, value: string}[] = [];
  (Object.keys(map) as PriceKey[]).forEach((k) => {
    const v = (r[k] || "").toString().trim();
    if (v) out.push({ label: map[k], key: k, value: v });
  });
  return out;
}

export function titleOf(r: DomusRecord): string {
  return r.zagolovok || `${r.tip_pomescheniya || "Помещение"} — ${shortAddress(r)}`;
}
