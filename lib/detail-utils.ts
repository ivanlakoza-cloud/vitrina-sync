// Utilities for detail page: filtering fields and distributing across 3 columns

export type KV = { key: string; label: string; value: any; };
export type Section = { kind: 'section', title: string };
export type Item = KV | Section;

// Keys that must never be shown in the attribute lists (handled elsewhere or hidden).
// Includes both exact column names and common aliases from the dataset.
export const HIDDEN_KEYS = new Set<string>([
  // Move-to-header/footer or internal
  'created_at','updated_at','id','external_id','id_obekta',
  'adres_23_58','disk_foto_plan','ukazannaya_ploschad','ukazannaya_stoimost_za_m2',
  'avito_id','etazh_avito','adres_avito','zagolovok','tekst_obyavleniya',
  'city',
  // explicit hide
  'razreshennye_vidy_deyatelnosti',
  'rasstoyanie_ot_tsentra_goroda_km_min',
  'probki_v_chasy_pik_nizkiesrednievysokie',
  'foto_s_avito',
  'tip_rayona_delovoykommercheskiypromyshlennyyzhiloysmeshannyy',
  // already displayed in main block
  'tip_pomescheniya','km_',
]);

export const SECTION_KEYS: Record<string, string> = {
  '1_lokatsiya_i_okruzhenie': 'Локация и окружение',
  '2_dostup_i_logistika': 'Доступ и логистика',
  '3_kharakteristiki_pomescheniya': 'Характеристики помещения',
  '4_kommunikatsii_i_tekhnicheskie_parametry': 'Коммуникации и технические параметры',
  '5_marketingovye_vozmozhnosti': 'Маркетинговые возможности',
  '6_usloviya_arendy': 'Условия аренды',
};

// Pretty-fy a raw DB key when no DB comment available
export function humanLabel(key: string) {
  return key
    .replaceAll('_', ' ')
    .replaceAll(' m2', ' м²')
    .replaceAll(' m', ' м')
    .replace(/\bkm\b/i, 'KM %')
    .trim();
}

// Build a list of items (sections + kv) in a stable order and split into 3 columns
export function buildColumns(rec: Record<string, any>, labels: Record<string, string | null>): [Item[], Item[], Item[]] {
  const items: Item[] = [];

  // Insert sections in desired order
  for (const [k, title] of Object.entries(SECTION_KEYS)) {
    items.push({ kind: 'section', title });
    // Collect entries that belong to this section by prefix match or explicit map if you have one
    // Here we just rely on presence of such "section marker" keys; values are usually null.
  }

  // Collect the rest of non-hidden fields (excluding main block fields) in a stable order
  for (const [key, value] of Object.entries(rec)) {
    if (HIDDEN_KEYS.has(key)) continue;
    if (key in SECTION_KEYS) continue; // section markers are already rendered as headers
    if (value === null || value === '' || value === undefined) continue;

    const label = labels[key] ?? humanLabel(key);
    items.push({ key, label, value });
  }

  // Round-robin distribute across 3 columns (keeping relative order)
  const colA: Item[] = [], colB: Item[] = [], colC: Item[] = [];
  let i = 0;
  for (const it of items) {
    if (i % 3 === 0) colA.push(it);
    else if (i % 3 === 1) colB.push(it);
    else colC.push(it);
    i++;
  }
  return [colA, colB, colC];
}
