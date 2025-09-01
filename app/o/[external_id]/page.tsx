import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";
import { prettyLabel, chunkEvenly, mainKeys } from "@/lib/fields";
import { fetchByExternalId, getGallery, fetchFieldOrder } from "@/app/data";

export const dynamic = "force-dynamic";

const HIDE = new Set([
  "external_id","id_obekta","avito","planirovka","planirovka_otkrytayakabinetnayasmeshannaya",
  "unnamed_93","unnamed_94","unnamed_95","id","nedostatki",
  "srok_dogovora_let","arendnye_kanikuly",
  "vozmozhnost_remontapereplanirovki",
  "zapreschennye_vidy_deyatelnosti_zhmykh_semena",
  "rasstoyanie_ot_tsentra_goroda_km__min",
  "created_at","updated_at"
]);

export async function generateMetadata({ params }: { params: { external_id: string } }): Promise<Metadata> {
  const rec = await fetchByExternalId(params.external_id);
  const title = (rec?.address as string) || "Объект";
  return { title };
}

export default async function Page({ params }: { params: { external_id: string } }) {
  const rec: any = await fetchByExternalId(params.external_id);
  if (!rec) return <div className="container py-6">Объект не найден</div>;

  const [photos, dict] = await Promise.all([getGallery(params.external_id), fetchFieldOrder()]);
  const avitoAddr = rec.adres_avito || rec.address;

  // Main block keys & data
  const mainBlock: Array<[string, any]> = [];
  const push = (k: string, label?: string) => {
    if (rec[k] !== null && rec[k] !== undefined && rec[k] !== "") {
      mainBlock.push([label || k, rec[k]]);
    }
  };
  push("tip_pomescheniya", "Тип помещения");
  push("etazh", "Этаж");
  if (rec.dostupnaya_ploschad) mainBlock.push(["Доступно", `${rec.dostupnaya_ploschad} м²`]);
  const kmKey = Object.keys(rec).find(k => k.toLowerCase() === 'km_' || k.toLowerCase() === 'km');
  if (kmKey) mainBlock.push(["КМ %", rec[kmKey]]);

  // gather other fields (respect order table & visibility)
  const entries: Array<[string, any, number]> = [];
  for (const [key, val] of Object.entries(rec)) {
    if (HIDE.has(key)) continue;
    if (mainKeys.includes(key)) continue;
    const order = dict[key]?.sort_order ?? 9999;
    const visible = dict[key]?.visible ?? true;
    const isSection = /^\d+_/.test(key);
    const hasValue = !(val === null || val === "" || typeof val === "undefined");
    if (isSection || (visible && hasValue)) {
      entries.push([key, val as any, order]);
    }
  }
  entries.sort((a,b)=> a[2] - b[2]);

  // convert to display tuples with labels
  const rows: Array<[string, any, boolean]> = entries.map(([key, val]) => {
    const label = prettyLabel(key, Object.fromEntries(Object.entries(dict).map(([k,v])=>[k, v.display_name_ru])));
    const isSection = /^\d+_/.test(key);
    return [label, val, isSection];
  });

  // distribute to 3 columns evenly (keeping section rows as titles in-place)
  const cols: Array<Array<[string, any, boolean]>> = [[],[],[]];
  let ci = 0;
  for (const r of rows) {
    cols[ci].push(r);
    ci = (ci + 1) % 3;
  }

  // footer: show hidden title & description if present
  const footerTitle = rec.zagolovok || rec.zagolovok_ru || null;
  const footerText = rec.tekst_obyavleniya || rec.tekst || null;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <BackButton />
        {avitoAddr && <div>Адрес Авито: {avitoAddr}</div>}
      </div>

      {!!photos.length && <PhotoStrip photos={photos} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="section space-y-4">
          <div className="text-lg font-semibold">Основное</div>
          {mainBlock.map(([k,v]) => (
            <div key={String(k)} className="grid grid-cols-[1fr_auto] gap-x-8">
              <div className="text-gray-600">{k}</div>
              <div className="font-medium">{String(v)}</div>
            </div>
          ))}
          <PriceTable rec={rec} />
        </div>

        {cols.map((col, idx) => (
          <div key={idx} className="section space-y-2">
            {col.map(([label, value, isSection], i) => isSection ? (
              <div key={i} className="pt-2 font-semibold text-gray-700">{label}</div>
            ) : (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-x-8">
                <div className="text-gray-600">{label}</div>
                <div className="font-medium">{String(value)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {(footerTitle || footerText) && (
        <div className="section space-y-2">
          {footerTitle && <div className="text-lg font-semibold">{footerTitle}</div>}
          {footerText && <div className="whitespace-pre-wrap">{footerText}</div>}
        </div>
      )}
    </div>
  );
}
