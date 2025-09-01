
import BackButton from "@/components/BackButton";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";
import { fetchByExternalId, getGallery, fetchFieldOrder, mainKeys } from "@/app/data";
import { prettyLabel, chunkEvenly } from "@/lib/fields";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { external_id: string } }): Promise<Metadata> {
  try {
    const rec: any = await fetchByExternalId(params.external_id);
    const title = (rec?.address as string) || "Объект";
    return { title };
  } catch {
    return { title: "Объект" };
  }
}

const SECTION_KEYS = [
  "1_lokatsiya_i_okruzhenie",
  "2_dostup_i_logistika",
  "3_kharakteristiki_pomescheniya",
  "4_kommunikatsii_i_tekhnicheskie_parametry",
  "5_marketingovye_vozmozhnosti",
  "6_usloviya_arendy",
];

const HIDE = new Set([
  "external_id","id_obekta","avito","planirovka","unnamed_94","unnamed_95","id","nedostatki",
  "srok_dogovora_let","arendnye_kanikuly","unnamed_93","vozmozhnost_remontapereplanirovki",
  "zapreschennye_vidy_deyatelnosti_zhmykh_semena","rasstoyanie_ot_tsentra_goroda_km__min",
  "created_at","updated_at","foto_s_avito","city","adres_avito","zagolovok","tekst_obyavleniya"
]);

export default async function Page({ params }: { params: { external_id: string }}) {
  const rec: any = await fetchByExternalId(params.external_id);
  if (!rec) {
    return <div className="p-6">Объект не найден</div>;
  }
  const gallery = await getGallery(rec.external_id);
  const metas = await fetchFieldOrder();
  const labelMap: Record<string, string> = {};
  const orderMap: Record<string, number> = {};
  metas.forEach(m => {
    if (m.column_name) {
      if (m.description) labelMap[m.column_name] = m.description;
      if (m.sort_order != null) orderMap[m.column_name] = Number(m.sort_order);
    }
  });

  // header (back + title + avito address)
  const title = (rec.address as string) || "Объект";
  const avitoAddr = (rec.adres_avito as string) || "";

  // Build main block
  const mainPairs: Array<[string,string]> = [];
  const labelTip = labelMap["tip_pomescheniya"] || "Тип помещения";
  mainPairs.push([labelTip, rec.tip_pomescheniya || "—"]);
  if (rec.etazh) mainPairs.push([labelMap["etazh"] || "Этаж", String(rec.etazh)]);
  if (rec.dostupnaya_ploschad) mainPairs.push([labelMap["dostupnaya_ploschad"] || "Доступно", `${rec.dostupnaya_ploschad} м²`]);

  // Price rows are shown by PriceTable

  // Build "rest" fields (including section headers as items without values)
  type Item = { key: string; label: string; value?: string | number | null; isSection?: boolean; order?: number };
  const items: Item[] = [];

  // Section headers (always show, no value)
  SECTION_KEYS.forEach(k => {
    items.push({ key: k, label: prettyLabel(k, labelMap), isSection: true, order: orderMap[k] ?? 999999 });
  });

  // Regular fields
  Object.entries(rec).forEach(([k, v]) => {
    if (mainKeys.includes(k)) return;
    if (HIDE.has(k)) return;
    if (SECTION_KEYS.includes(k)) return; // already as headers
    if (v === null || v === undefined || String(v).trim() === "") return;
    const label = prettyLabel(k, labelMap);
    const order = orderMap[k] ?? 999999;
    items.push({ key: k, label, value: v as any, order });
  });

  // Sort by sort_order asc, then by label
  items.sort((a,b) => (a.order! - b.order!) || a.label.localeCompare(b.label, "ru"));

  // Distribute evenly into 3 columns
  const cols = chunkEvenly(items, 3);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <BackButton />
        <div className="text-2xl font-semibold">{title}</div>
        {avitoAddr && <div className="text-sm text-muted-foreground">Адрес Авито: {avitoAddr}</div>}
      </div>

      {gallery?.length ? <PhotoStrip photos={gallery} /> : null}

      {/* Основное */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-2xl p-4 space-y-3">
          <div className="text-lg font-semibold">Основное</div>
          <div className="grid grid-cols-[1fr_auto] gap-y-2">
            {mainPairs.map(([k,v]) => (<><div className="font-medium">{k}</div><div className="text-right">{v}</div></>))}
          </div>
          <PriceTable rec={rec} />
        </div>

        {cols.map((arr, i) => (
          <div key={i} className="border rounded-2xl p-4 space-y-2">
            {arr.map((it) => it.isSection ? (
              <div key={it.key} className="mt-2 mb-1 text-base font-semibold">{it.label}</div>
            ) : (
              <div key={it.key} className="grid grid-cols-[1fr_auto] gap-y-1">
                <div className="text-gray-500">{it.label}</div>
                <div className="text-right">{String(it.value)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer: Заголовок + Текст объявления */}
      {(rec.zagolovok || rec.tekst_obyavleniya) && (
        <div className="border rounded-2xl p-4 space-y-2">
          {rec.zagolovok && <div className="text-lg font-semibold">{rec.zagolovok}</div>}
          {rec.tekst_obyavleniya && <div className="whitespace-pre-wrap leading-relaxed">{rec.tekst_obyavleniya}</div>}
        </div>
      )}
    </div>
  );
}
