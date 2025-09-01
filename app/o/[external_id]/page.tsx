import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";
import { fetchByExternalId, getGallery, fetchFieldOrder } from "@/app/data";

export const dynamic = "force-dynamic";

// Поля, которые никогда не показываем как строки параметров
const HIDE_KEYS = new Set<string>([
  "external_id","id_obekta","avito","planirovka","planirovka_otkrytayakabinetnayasmeshannaya",
  "unnamed_93","unnamed_94","unnamed_95","id","nedostatki",
  "srok_dogovora_let","arendnye_kanikuly",
  "vozmozhnost_remontapereplanirovki",
  "zapreschennye_vidy_deyatelnosti_zhmykh_semena",
  "rasstoyanie_ot_tsentra_goroda_km__min",
  "created_at","updated_at",
  // legacy/удалённые
  "probki_v_chasy_pik_nizkiesrednievysokie",
  "infrastruktura_poblizosti_magaziny_banki_kafe_bts_gosuchrezhden",
  "imidzh_rayona"
]);

// Порядок блоков
const BLOCK1 = [85,84,21,22,23,24,25,26,27];
const BLOCK2 = [36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59];
const BLOCK3 = [60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,82,85,86];
const FOOTER = [3,29];

// Глобально скрываем строки по sort_order
const HIDE_ORDERS = new Set<number>([20]); // заголовок берём из adres_avito, сам 20-й не показываем

// Для каких sort_order лейблы НЕ серые даже при пустом значении
const EMPH_ORDERS = new Set<number>([36,42,49,66,79,83]);

function hasValue(v: any): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "" && v.trim() !== "—";
  return true;
}

async function getTitleParts(external_id: string) {
  const [rec, dict] = await Promise.all([fetchByExternalId(external_id), fetchFieldOrder()]);
  // Полный адрес из domus_export.adres_avito
  let header = (rec?.adres_avito as string) || "";
  if (!hasValue(header)) {
    header = (rec?.address as string) || (rec?.zagolovok as string) || "Объект";
  }
  const finalTitle = `${header} — Витрина Глобал`;
  return { rec, dict, header, finalTitle };
}

export async function generateMetadata({ params }: { params: { external_id: string } }): Promise<Metadata> {
  const { finalTitle } = await getTitleParts(params.external_id);
  return { title: finalTitle, icons: { icon: "/icon.svg" } };
}

export default async function Page({ params }: { params: { external_id: string } }) {
  const { rec, dict, header } = await getTitleParts(params.external_id);
  if (!rec) return <div className="container py-6">Объект не найден</div>;

  const photos = await getGallery(params.external_id);
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

  type RowT = [label: string, value: any, ok: boolean, sortOrder?: number];

  function rowsFor(orders: number[], excludeOrders: number[] = []): Array<RowT> {
    const rows: Array<RowT> = [];
    const used = new Set<string>();
    const exclude = new Set<number>(excludeOrders);
    for (const so of orders) {
      if (exclude.has(so) || HIDE_ORDERS.has(so)) continue;
      const keys = byOrder.get(so) || [];
      for (const k of keys) {
        if (used.has(k)) continue;
        if (HIDE_KEYS.has(k)) continue;
        const v = (rec as any)[k];
        const ru = d[k]?.display_name_ru;
        const label = (typeof ru === "string" && ru.trim()) ? ru : k;
        const hv = hasValue(v);
        rows.push([label, hv ? v : "—", hv, d[k]?.sort_order]);
        used.add(k);
      }
    }
    return rows;
  }

  // Основное
  const mainBlock: Array<RowT> = [];
  const push = (k: string, fallback: string) => {
    const v = (rec as any)[k];
    const ru = d[k]?.display_name_ru;
    const label = (typeof ru === "string" && ru.trim()) ? ru : fallback;
    const hv = hasValue(v);
    mainBlock.push([label, hv ? v : "—", hv, d[k]?.sort_order]);
  };
  push("tip_pomescheniya", "Тип помещения");
  push("etazh", "Этаж");
  if (d["dostupnaya_ploschad"]) {
    const v = rec.dostupnaya_ploschad;
    const hv = hasValue(v);
    mainBlock.push([d["dostupnaya_ploschad"]?.display_name_ru || "Доступная площадь", hv ? `${v} м²` : "—", hv, d["dostupnaya_ploschad"]?.sort_order]);
  }
  const kmKey = Object.keys(rec).find(k => k.toLowerCase() === "km_" || k.toLowerCase() === "km");
  if (kmKey) {
    const v = (rec as any)[kmKey];
    const hv = hasValue(v);
    // @ts-ignore
    mainBlock.push([d[kmKey]?.display_name_ru || "КМ %", hv ? v : "—", hv, d[kmKey as string]?.sort_order]);
  }

  const block1Tail = rowsFor(BLOCK1);
  const block2Rows = rowsFor(BLOCK2, [48]);
  const block3Rows = rowsFor(BLOCK3, [85]);
  const footerRows = rowsFor(FOOTER);

  const Label = ({text, ok, order}: {text: string, ok: boolean, order?: number}) => {
    const forceEmph = order !== undefined && EMPH_ORDERS.has(order);
    const cls = (ok || forceEmph) ? "font-semibold text-gray-800 leading-snug break-words" : "font-semibold text-gray-300 opacity-60 leading-snug break-words";
    return <div className={cls}>{text}</div>;
  };
  const Value = ({text, ok}: {text: any, ok: boolean}) => (
    <div className={(ok ? "text-right " : "text-right text-gray-300 opacity-60 ") + "whitespace-pre-wrap break-words"}>
      {String(text)}
    </div>
  );

  // Адаптивная строка: узкий авто-лейбл + гибкое значение
  const Row = ({label, v, ok, order, keyId}:{label:string; v:any; ok:boolean; order?:number; keyId:string|number}) => (
    <div key={String(keyId)} className="grid grid-cols-[auto,1fr] gap-x-8 items-start">
      <Label text={label} ok={ok} order={order} />
      <Value text={v} ok={ok} />
    </div>
  );

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <BackButton />
        </div>
        <div className="text-2xl font-bold text-right">{header}</div>
      </div>

      {!!photos.length && <PhotoStrip photos={photos} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="section space-y-4">
          {mainBlock.map(([label,v,ok,order], i) => (
            <Row keyId={i} label={label} v={v} ok={ok} order={order} />
          ))}

          <PriceTable rec={rec} />

          {block1Tail.map(([label,v,ok,order], i) => (
            <Row keyId={`b1-${i}`} label={label} v={v} ok={ok} order={order} />
          ))}
        </div>

        <div className="section space-y-2">
          {block2Rows.map(([label,v,ok,order], i) => (
            <Row keyId={`b2-${i}`} label={label} v={v} ok={ok} order={order} />
          ))}
        </div>

        <div className="section space-y-2">
          {block3Rows.map(([label,v,ok,order], i) => (
            <Row keyId={`b3-${i}`} label={label} v={v} ok={ok} order={order} />
          ))}
        </div>
      </div>

      {footerRows.length > 0 && (
        <div className="section space-y-2">
          {footerRows.map(([_, v, ok], i) => (
            <div key={i} className={(ok ? "" : "text-gray-300 opacity-60 ") + "whitespace-pre-wrap"}>{String(v)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
