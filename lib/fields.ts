export type DomusRecord = Record<string, any>;
export const prettyLabels: Record<string,string> = {"external_id": "Внешний ID", "id_obekta": "ID объекта", "otobrazit_vse": "Город", "adres_23_58": "Адрес (23/58)", "zagolovok": "Заголовок", "tip_pomescheniya": "Тип помещения", "dostupnaya_ploschad": "Доступная площадь", "etazh": "Этаж", "ot_20": "от 20", "ot_50": "от 50", "ot_100": "от 100", "ot_400": "от 400", "ot_700": "от 700", "ot_1500": "от 1500", "km": "КМ %", "parkovka": "Парковка", "vysota_potolkov": "Высота потолков", "blizost_obschestvennogo_transporta": "Близость общественного транспорта", "infrastruktura_poblizosti_magaziny_banki_kafe_bc_gosuchrezhdeni": "Инфраструктура поблизости (магазины, банки, кафе, БЦ, госучреждения)", "tip_zdaniya": "Тип здания", "planirovka": "Планировка", "transportnaya_dostupnost_magistrali_razvyazki": "Транспортная доступность (магистрали, развязки)", "probki_v_chasy_pik_nizkie_srednie_vysokie": "Пробки в часы пик (низкие/средние/высокие)", "imidzh_raiona": "Имидж района", "otdelka": "Отделка"};

export function pricePairs(rec: any): Array<{ label: string; value: string }> {
  const keys: Array<[string,string]> = [
    ["ot_20","от 20"],["ot_50","от 50"],["ot_100","от 100"],
    ["ot_400","от 400"],["ot_700","от 700"],["ot_1500","от 1500"],
  ];
  const out: Array<{label: string; value: string}> = [];
  for (const [k, label] of keys) {
    const v = rec?.[k];
    if (v !== null && v !== undefined && String(v).trim() !== "") out.push({ label, value: String(v) });
  }
  return out;
}
export function shortAddress(rec: any): string {
  const city = rec?.otobrazit_vse || rec?.city || "";
  const addr = (rec?.adres_23_58) || ((rec?.adres_avito || "").replace(/^([^,]+),\s*/, ""));
  return [city, addr].filter(Boolean).join(", ");
}
