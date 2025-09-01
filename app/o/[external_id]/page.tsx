
import BackButton from \"@/components/BackButton\";
import type { Metadata } from \"next\";
import { fetchByExternalId, getGallery, fetchFieldOrder, mainKeys } from \"@/app/data\";
import { prettyLabel, chunkEvenly } from \"@/lib/fields\";
import PhotoStrip from \"@/components/PhotoStrip\";

export const metadata: Metadata = {
  title: \"Витрина\",
};

const SECTION_KEYS = new Set<string>([
  \"1_lokatsiya_i_okruzhenie\",
  \"2_dostup_i_logistika\",
  \"3_kharakteristiki_pomescheniya\",
  \"4_kommunikatsii_i_tekhnicheskie_parametry\",
  \"5_marketingovye_vozmozhnosti\",
  \"6_usloviya_arendy\",
]);

// Параметры, которые нужно скрыть полностью (и их значения)
const HIDE = new Set<string>([
  \"created_at\",
  \"city\",
  \"tip_rayona_delovoykommercheskiypromyshlennyyzhiloysmeshannyy\",
  \"etazh_avito\",
  \"adres_avito\",
  \"probki_v_chasy_pik_nizkiesrednievysokie\",
  \"foto_s_avito\",
  \"updated_at\",
  \"zagolovok\",
  \"address\",
  \"disk_foto_plan\",
  \"ukazannaya_ploschad\",
  \"avito_id\",
  \"ukazannaya_stoimost_za_m2\",
  \"razreshennye_vidy_deyatelnosti\",
  \"rasstoyanie_ot_tsentra_goroda_km_min\",
  \"tekst_obyavleniya\",
  \"gorod\", // на всякий случай
]);

function Row({ label, value }: {label: string; value: any}) {
  return (
    <div className=\"grid grid-cols-[minmax(180px,1fr)_minmax(200px,1fr)] gap-4 py-1\">
      <div className=\"text-gray-600\">{label}</div>
      <div className=\"whitespace-pre-wrap\">{value ?? \"—\"}</div>
    </div>
  );
}

export default async function Page({ params }: { params: { external_id: string } }) {
  const rec = await fetchByExternalId(params.external_id);
  if (!rec) {
    return <div className=\"p-10\">Объект не найден</div>;
  }

  const id = String(rec.id ?? rec.external_id ?? \"\");
  const photos = await getGallery(id);
  const orderMap = await fetchFieldOrder();

  // Заголовок страницы
  const title = (rec[\"zagolovok\"] as string) || \"\";
  const backTitle = (rec[\"adres_avito\"] as string) || \"—\";

  // Основной блок (слева)
  const main = mainKeys(rec);
  const priceOrder = [\"price_per_m2_20\",\"price_per_m2_50\",\"price_per_m2_100\",\"price_per_m2_400\",\"price_per_m2_700\",\"price_per_m2_1500\"]
    .filter(k => k in rec);
  const kmKey = (\"km_\" in rec) ? \"km_\" : ((\"km\" in rec) ? \"km\" : null);

  // Все остальные поля (кроме скрытых/основных)
  const rest: {key: string; label: string; value: any; isSection: boolean; ord: number;}[] = [];
  for (const [key, value] of Object.entries(rec)) {
    if (main.includes(key)) continue;
    if (HIDE.has(key)) continue;
    const fo = orderMap.get(key);
    const visible = fo?.visible !== false;
    if (!visible && !SECTION_KEYS.has(key)) continue;

    const label = fo?.display_name_ru || prettyLabel(key);
    const ord = fo?.sort_order ?? 10_000;
    const isSection = SECTION_KEYS.has(key);

    // секции выводим даже с пустыми значениями
    if (isSection) {
      rest.push({ key, label, value: \"\", isSection: true, ord });
    } else if (value != null && String(value).trim() !== \"\") {
      rest.push({ key, label, value, isSection: false, ord });
    }
  }

  // сортировка по sort_order (asc), затем по label
  rest.sort((a,b) => (a.ord - b.ord) || a.label.localeCompare(b.label, \"ru\"));

  // равномерно разложим по двум правым колонкам
  const cols = chunkEvenly(rest, 2);

  return (
    <div className=\"space-y-6\">
      <div className=\"flex items-center gap-4\">
        <BackButton />
        <div className=\"text-2xl font-semibold\">{backTitle || \"—\"}</div>
      </div>

      <PhotoStrip photos={photos} />

      <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">
        {/* Левый — основной */}
        <div className=\"card\">
          <div className=\"text-lg font-semibold mb-3\">{rec[\"tip_pomescheniya\"] ?? \"—\"}</div>
          <div className=\"space-y-2\">
            {\"etazh\" in rec && <Row label=\"Этаж\" value={rec[\"etazh\"]} />}
            {\"dostupnaya_ploschad\" in rec && <Row label=\"Доступная площадь\" value={\`\${rec[\"dostupnaya_ploschad\"]} м²\`} />}
          </div>

          {priceOrder.length > 0 && (
            <div className=\"mt-4\">
              <div className=\"font-semibold mb-1\">Площадь / Цены, ₽/м²</div>
              <div className=\"grid grid-cols-2 gap-2\">
                {priceOrder.map(k => (
                  <div key={k} className=\"grid grid-cols-2\">
                    <div className=\"text-gray-600\">{prettyLabel(k)}</div>
                    <div>{rec[k]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {kmKey && <div className=\"mt-3\"><Row label=\"КМ %\" value={rec[kmKey]} /></div>}
        </div>

        {/* Средний и правый — равномерно разложенные поля */}
        {cols.map((list, idx) => (
          <div key={idx} className=\"card\">
            {list.map(item => item.isSection ? (
              <div key={item.key} className=\"pt-2 pb-1 font-semibold\">{item.label}</div>
            ) : (
              <Row key={item.key} label={item.label} value={item.value} />
            ))}
          </div>
        ))}
      </div>

      {/* Подвал: заголовок + текст объявления */}
      {(title || rec[\"tekst_obyavleniya\"]) && (
        <div className=\"card\">
          {title && <div className=\"text-xl font-semibold mb-2\">{title}</div>}
          {rec[\"tekst_obyavleniya\"] && (
            <div className=\"whitespace-pre-wrap\">{rec[\"tekst_obyavleniya\"]}</div>
          )}
        </div>
      )}
    </div>
  );
}
