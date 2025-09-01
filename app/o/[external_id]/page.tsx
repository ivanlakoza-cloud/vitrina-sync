import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";
import { prettyLabel, mainKeys } from "@/lib/fields";
import { fetchByExternalId, getGallery, fetchFieldOrder } from "@/app/data";

export const dynamic = "force-dynamic";

const HIDE_KEYS = new Set<string>([
  "external_id","id_obekta","avito","planirovka","planirovka_otkrytayakabinetnayasmeshannaya",
  "unnamed_93","unnamed_94","unnamed_95","id","nedostatki",
  "srok_dogovora_let","arendnye_kanikuly",
  "vozmozhnost_remontapereplanirovki",
  "zapreschennye_vidy_deyatelnosti_zhmykh_semena",
  "rasstoyanie_ot_tsentra_goroda_km__min",
  "created_at","updated_at"
]);

const HIDE_ORDER = new Set<number>([3,6,13,14,15,17,18,19,20,32,33,38,39,40,41,49,51,57,79,87,89,98,100]);

export async function generateMetadata({ params }: { params: { external_id: string } }): Promise<Metadata> {
  const rec: any = await fetchByExternalId(params.external_id);
  const title = (rec?.address as string) || "Объект";
  return { title };
}

export default async function Page({ params }: { params: { external_id: string } }) {
  const rec: any = await fetchByExternalId(params.external_id);
  if (!rec) return <div className="container py-6">Объект не найден</div>;

  const [photos, dict] = await Promise.all([getGallery(params.external_id), fetchFieldOrder()]);

  // "Основное"
  const mainBlock: Array<[string, any]> = [];
  const push = (k: string, label?: string) => {
    if (rec[k] !== null && rec[k] !== undefined && String(rec[k]).trim() !== "") {
      mainBlock.push([label || k, rec[k]]);
    }
  };
  push("tip_pomescheniya", "Тип помещения");
  push("etazh", "Этаж");
  if (rec.dostupnaya_ploschad) mainBlock.push(["Доступно", `${rec.dostupnaya_ploschad} м²`]);
  const kmKey = Object.keys(rec).find(k => k.toLowerCase() === "km_" || k.toLowerCase() === "km");
  if (kmKey) mainBlock.push(["КМ %", rec[kmKey as keyof typeof rec]]);

  // Остальные поля
  type Row = [string, any, number];
  const all: Row[] = [];
  for (const [key, val] of Object.entries(rec)) {
    if (HIDE_KEYS.has(key)) continue;
    if (mainKeys.includes(key)) continue;
    const hasValue = !(val === null || val === undefined || String(val).trim() === "");
    const so: number = (dict as any)[key]?.sort_order ?? 9999;
    const visible: boolean = (dict as any)[key]?.visible ?? true;
    const isSection = /^\d+_/.test(key);
    if (isSection) continue; // никаких секций — единый блок
    if (!visible || !hasValue) continue;
    if (HIDE_ORDER.has(so)) continue; // пользовательский blacklist
    all.push([key, val, so]);
  }
  all.sort((a,b) => a[2] - b[2]);

  // Подписи: prefer display_name_ru
  const rows = all.map(([key, val, so]) => {
    const ru = (dict as any)[key]?.display_name_ru;
    const base = (typeof ru === "string" && ru.trim()) ? ru : prettyLabel(key);
    const label = typeof so === "number" ? `${base} (${so})` : base;
    return [label, val] as [string, any];
  });

  const footerTitle = rec.nazvanie_obyavleniya || rec.zagolovok_obyavleniya || null;
  const footerText = rec.tekst_obyavleniya || rec.tekst || null;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <BackButton />
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
