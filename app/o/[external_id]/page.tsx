import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import { fetchByExternalId, getGallery, fetchFieldOrder, mainKeys } from "@/app/data";
import { prettyLabel, chunkEvenly } from "@/lib/fields";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { external_id: string } }): Promise<Metadata> {
  const rec: any = await fetchByExternalId(params.external_id);
  const title = (rec?.address as string) || "Объект";
  return { title };
}

const HIDE = new Set<string>([
  "created_at","city","etazh_avito","adres_avito","probki_v_chasy_pik_nizkiesrednievysokie",
  "foto_s_avito","updated_at","zagolovok","address","disk_foto_plan","ukazannaya_ploschad",
  "avito_id","ukazannaya_stoimost_za_m2","razreshennye_vidy_deyatelnosti",
  "rasstoyanie_ot_tsentra_goroda_km_min","tekst_obyavleniya","tip_rayona_delovoykommercheskiypromyshlennyyzhiloysmeshannyy"
]);

export default async function ObjectPage({ params }: { params: { external_id: string } }) {
  const rec: any = await fetchByExternalId(params.external_id);
  const photos = await getGallery(params.external_id);
  const order = await fetchFieldOrder();
  const main = mainKeys();

  // Собираем пары ключ-значение, кроме основных и скрытых
  const entries = Object.entries(rec || {})
    .filter(([k, v]) => !main.includes(k) && !HIDE.has(k))
    .map(([k, v]) => ({
      key: k,
      label: prettyLabel(k, order),
      value: (v === null || v === undefined || String(v).toLowerCase() === "null") ? "" : String(v),
      sort: order?.[k]?.sort_order ?? 9999
    }))
    .sort((a, b) => (a.sort - b.sort) || a.label.localeCompare(b.label, "ru"));

  // Вставляем разделители-заголовки из order, даже если значения пустые
  const sectionKeys = Object.keys(order).filter(k => /^[1-6]_/.test(k));
  for (const sk of sectionKeys) {
    entries.push({ key: sk, label: order[sk].display_name_ru || prettyLabel(sk), value: "", sort: order[sk].sort_order ?? 0 });
  }
  entries.sort((a, b) => (a.sort - b.sort) || a.label.localeCompare(b.label, "ru"));

  // Разбиваем оставшееся на две колонки равномерно
  const cols = chunkEvenly(entries, 2);

  return (
    <div className="space-y-6">
      <BackButton />
      {photos?.length ? <PhotoStrip photos={photos} /> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Основной блок */}
        <div className="card p-5 space-y-3">
          <div className="text-muted-foreground">Тип помещения</div>
          <div className="text-2xl font-semibold">{rec.tip_pomescheniya ?? "—"}</div>

          <div className="mt-4 grid grid-cols-2 gap-y-2">
            <div className="text-muted-foreground">Этаж</div>
            <div>{rec.etazh ?? "—"}</div>

            <div className="text-muted-foreground">Доступная площадь</div>
            <div>{rec.dostupnaya_ploschad ? `${rec.dostupnaya_ploschad} м²` : "—"}</div>
          </div>

          <div className="mt-4">
            <PriceTable rec={rec} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-y-2">
            <div className="text-muted-foreground">КМ %</div>
            <div>{rec.km_ ?? "—"}</div>
          </div>
        </div>

        {/* Остальные параметры 2 колонки */}
        {cols.map((list, i) => (
          <div key={i} className="card p-5 space-y-3">
            {list.map(row => (
              /^[1-6]_/.test(row.key)
                ? <div key={row.key} className="pt-4 text-lg font-semibold">{row.label}</div>
                : (
                  <div key={row.key} className="grid grid-cols-2 gap-y-1">
                    <div className="text-muted-foreground">{row.label}</div>
                    <div className="whitespace-pre-wrap break-words">{row.value || "—"}</div>
                  </div>
                )
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}