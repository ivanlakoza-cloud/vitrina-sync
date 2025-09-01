export type DomusRow = Record<string, any>;

export const priceKeys = [
  "price_per_m2_20",
  "price_per_m2_50",
  "price_per_m2_100",
  "price_per_m2_400",
  "price_per_m2_700",
  "price_per_m2_1500",
];

export const prettyLabels: Record<string, string> = {
  city: "Город",
  address: "Адрес (23/58)",
  zagolovok: "Заголовок",
  dostupnaya_ploschad: "Доступная площадь",
  km: "KM %",
  km_: "KM %",
  gde: "Где",
  parkovka: "Парковка",
  vysota_potolkov: "Высота потолков (м)",
  disk_foto_plan: "Диск (фото, план)",
  avito_id: "Авито ID",
  etazh_avito: "Этаж Авито",
  ukazannaya_ploschad: "Указанная площадь",
  ukazannaya_stoimost_za_m2: "Указанная стоимость за м2",
  tip_zdaniya: "Тип здания",
  probki_v_chasy_pik_nizkiesrednievysokie: "Пробки в часы пик",
  imidzh_rayona: "Имидж района",
  vozmozhnost_deleniyaobedineniya_pomescheniy: "Возможность деления/объединения помещений",
  planirovka_otkrytayakabinetnayasmeshannaya: "Планировка (открытая/кабинетная/смешанная)",
  sostoyanie_gotovo_k_vezduremontshellcore: "Состояние (готово к въезду/ремонт/shell&core)",
  kakoy_pol: "Какой пол",
  vitriny_danet: "Витрины (да/нет)",
  pomeschenie_otaplivaemoe_danet: "Помещение отапливаемое (да/нет)",
  temperatura_pomescheniya_zimoy: "Температура помещения зимой",
  sostoyanie_krovli: "Состояние кровли",
  iz_chego_karkas_zdaniya: "Из чего каркас здания",
  perekrykryya_mu_etazhami_iz_chego: "Перекрыкрыя м/у этажами (из чего)",
  vorota_nalichie_kolichestvo_razmery_: "Ворота. Наличие, количество, размеры",
  okna_kakoe_osveshchenie_prioritet_estestvennoe: "Окна, какое освещение, приоритет естественное",
  zony_razgruzkipogruzki: "Зоны разгрузки/погрузки",
  voda_danet_rasstoyanie_do_mokroy_tochki: "Вода (да/нет, расстояние до мокрой точки)",
  kanalizatsiya_tsentralnayaavtonomnaya: "Канализация (центральная/автономная)",
  sistema_okhrany_videonablyudeniya: "Система охраны, видеонаблюдения",
  pozharnaya_signalizatsiya: "Пожарная сигнализация",
  vidimost_s_dorogipeshekhodnykh_marshrutov: "Видимость с дороги/пешеходных маршрутов",
  opexkommunalnye_platezhi: "OPEX/коммунальные платежи",
  razreshennye_vidy_deyatelnosti: "Разрешённые виды деятельности",
  foto_s_avito: "Фото с Авито",
};

export function shortAddress(rec: DomusRow): string {
  const parts: string[] = [];
  if (rec.city) parts.push(rec.city);
  if (rec.address) parts.push(String(rec.address));
  else if (rec.adres || rec["adres (23/58)"]) parts.push(String(rec.adres || rec["adres (23/58)"]));
  else if (rec.zagolovok) parts.push(String(rec.zagolovok));
  return parts.join(", ");
}

export function humanLabel(key: string, labelsFromDb?: Record<string,string>) {
  if (labelsFromDb && labelsFromDb[key]) return labelsFromDb[key];
  if (prettyLabels[key]) return prettyLabels[key];
  return key.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}
