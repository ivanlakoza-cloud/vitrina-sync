import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";
import { fetchByExternalId, getGallery, fetchFieldOrder } from "@/app/data";

export const dynamic = "force-dynamic";

// Никогда не показываем как параметры
const HIDE_KEYS = new Set<string>([
  "external_id","id_obekta","avito","planirovka","planirovka_otkrytayakabinetnayasmeshannaya",
  "unnamed_93","unnamed_94","unnamed_95","id","nedostatki",
  "srok_dogovora_let","arendnye_kanikuly",
  "vozmozhnost_remontapereplanirovki",
  "zapreschennye_vidy_deyatelnosti_zhmykh_semena",
  "rasstoyanie_ot_tsentra_goroda_km__min",
  "created_at","updated_at",
  // legacy/удалённые по словам заказчика
  "probki_v_chasy_pik_nizkiesrednievysokie",
  "infrastruktura_poblizosti_magaziny_banki_kafe_bts_gosuchrezhden",
  "imidzh_rayona"
]);

const BLOCK1 = [85,84,21,22,23,24,25,26,27];
const BLOCK2 = [36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59];
const BLOCK3 = [60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,82,85,86];
const FOOTER = [3,29];

function hasValue(v: any): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}

export async function generateMetadata({ params }: { params: { external_id: string } }): Promise<Metadata> {
  const rec: any = await fetchByExternalId(params.external_id);
  const title = (rec?.address as string) || "Объект";
  return { title };
}

export default async function Page({ params }: { params: { external_id: string } }) {
  const rec: any = await fetchByExternalId(params.external_id);
  if (!rec) return <div className="container py-6">Объект не найден</div>;

  const [photos, dict] = await Promise.all([getGallery(params.external_id), fetchFieldOrder()]);
  const d: Record<string, { sort_order?: number; display_name_ru?: string; visible?: boolean }> = dict as any;

  const byOrder = new Map<number, string[]>();
  for (const [key, meta] of Object.entries(d)) {
    if (!meta || typeof meta.sort_order !== "number") continue;
    if (HIDE_KEYS.has(key)) continue;
    if (meta.visible === false) continue;
    const list = byOrder.get(meta.sort_order) || [];
    list.push(key);
    byOrder.set(meta.sort_order, list);
  }

  function rowsFor(orders: number[], excludeOrders: number[] = []): Array<[string, any]> {
    const rows: Array<[string, any]> = [];
    const used = new Set<string>();
    const exclude = new Set<number>(excludeOrders);
    for (const so of orders) {
      if (exclude.has(so)) continue;
      const keys = byOrder.get(so) || [];
      for (const k of keys) {
        if (used.has(k)) continue;
        if (HIDE_KEYS.has(k)) continue;
        const v = (rec as any)[k];
        if (!hasValue(v)) continue;
        const ru = d[k]?.display_name_ru;
        const label = (typeof ru === "string" && ru.trim()) ? ru : k;
        rows.push([label, v]);
        used.add(k);
      }
    }
    return rows;
  }

  const mainBlock: Array<[string, any]> = [];
  const push = (k: string, fallback: string) => {
    const v = (rec as any)[k];
    if (hasValue(v)) {
      const ru = d[k]?.display_name_ru;
      mainBlock.push([(typeof ru === "string" && ru.trim()) ? ru : fallback, v]);
    }
  };
  push("tip_pomescheniya", "Тип помещения");
  push("etazh", "Этаж");
  if (hasValue(rec.dostupnaya_ploschad)) mainBlock.push([d["dostupnaya_ploschad"]?.display_name_ru || "Доступная площадь", `${rec.dostupnaya_ploschad} м²`]);
  const kmKey = Object.keys(rec).find(k => k.toLowerCase() === "km_" || k.toLowerCase() === "km");
  if (kmKey && hasValue((rec as any)[kmKey])) mainBlock.push([d[kmKey!]?.display_name_ru || "КМ %", (rec as any)[kmKey!]]);

  const block1Tail = rowsFor(BLOCK1);
  const block2Rows = rowsFor(BLOCK2, [48]);
  const block3Rows = rowsFor(BLOCK3, [85]);
  const footerRows = rowsFor(FOOTER);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <BackButton />
      </div>

      {!!photos.length && <PhotoStrip photos={photos} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="section space-y-4">
          <div className="text-lg font-semibold">Основное</div>

          {mainBlock.map(([k,v]) => (
            <div key={String(k)} className="grid grid-cols-[1fr_auto] gap-x-8">
              <div className="font-semibold text-gray-800">{k}</div>
              <div>{String(v)}</div>
            </div>
          ))}

          <PriceTable rec={rec} />

          {block1Tail.map(([label, value], i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-x-8">
              <div className="font-semibold text-gray-800">{label}</div>
              <div>{String(value)}</div>
            </div>
          ))}
        </div>

        <div className="section space-y-2">
          <div className="text-lg font-semibold">Блок 2</div>
          {block2Rows.map(([label, value], i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-x-8">
              <div className="font-semibold text-gray-800">{label}</div>
              <div>{String(value)}</div>
            </div>
          ))}
        </div>

        <div className="section space-y-2">
          <div className="text-lg font-semibold">Блок 3</div>
          {block3Rows.map(([label, value], i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-x-8">
              <div className="font-semibold text-gray-800">{label}</div>
              <div>{String(value)}</div>
            </div>
          ))}
        </div>
      </div>

      {footerRows.length > 0 && (
        <div className="section space-y-2">
          {footerRows.map(([_, value], i) => (
            <div key={i} className="whitespace-pre-wrap">{String(value)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
