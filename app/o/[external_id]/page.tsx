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
    const order = (dict as any)[key]?.sort_order ?? 9999;
    const visible = (dict as any)[key]?.visible ?? true;
    const isSection = /^\d+_/.test(key);
    const hasValue = !(val === null || val === "" || typeof val === "undefined");
    if (isSection || (visible && hasValue)) {
      entries.push([key, val as any, order]);
    }
  }
  entries.sort((a,b)=> a[2] - b[2]);

  // build labels dict and unified rows (exclude section keys)
  const labelsDict = Object.entries(dict).reduce((acc, [k, v]) => {
    if (v && typeof (v as any).display_name_ru === 'string') (acc as any)[k] = (v as any).display_name_ru as string;
    return acc;
  }, {} as Record<string, string>);

  const rows: Array<[string, any]> = entries
    .filter(([key]) => !/^\d+_/.test(String(key)))
    .map(([key, val]) => {
      const base = prettyLabel(String(key), labelsDict);
      const so = (dict as any)[String(key)]?.sort_order;
      const label = (typeof so === 'number') ? `${base} (${so})` : base;
      return [label, val];
    });

  // footer: show hidden title & description if present
  const footerTitle = rec.nazvanie_obyavleniya || rec.zagolovok_obyavleniya || null;
  const footerText = rec.tekst_obyavleniya || rec.tekst || null;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <BackButton />
        {avitoAddr && <div>Адрес Авито: {avitoAddr}</div>}
      </div>

      {!!photos.length && <PhotoStrip photos={photos} />}

      <div className="section space-y-4">
        <div className="text-lg font-semibold">Характеристики</div>
        {mainBlock.map(([k,v]) => (
          <div key={String(k)} className="grid grid-cols-[1fr_auto] gap-x-8">
            <div className="text-gray-600">{k}</div>
            <div className="font-medium">{String(v)}</div>
          </div>
        ))}
        <PriceTable rec={rec} />
        {rows.map(([label, value], i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-x-8">
            <div className="text-gray-600">{label}</div>
            <div className="font-medium">{String(value)}</div>
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
