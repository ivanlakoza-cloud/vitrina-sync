// @ts-nocheck
import BackButton from "@/components/BackButton";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";
import { fetchByExternalId, getGallery, fetchColumnLabels } from "@/app/data";
import { HIDDEN_KEYS, HEADING_KEYS, labelFor, isEmpty } from "@/lib/fields";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Объект",
};

type Item =
  | { type: "section"; key: string; label: string }
  | { type: "row"; key: string; label: string; value: any };

const PRICE_KEYS = new Set([
  "price per m2 20","price_per_m2_20",
  "price per m2 50","price_per_m2_50",
  "price per m2 100","price_per_m2_100",
  "price per m2 400","price_per_m2_400",
  "price per m2 700","price_per_m2_700",
  "price per m2 1500","price_per_m2_1500",
]);

const MAIN_KEYS = ["tip_pomescheniya","etazh","dostupnaya_ploschad","address"];

function chunkBySections(items: Item[]): [Item[], Item[], Item[]] {
  // pack section+rows blocks to the shortest column to keep balance and preserve grouping
  const cols: [Item[], Item[], Item[]] = [[],[],[]];
  const sizes = [0,0,0];
  let buf: Item[] = [];

  const flush = () => {
    if (!buf.length) return;
    let best = 0;
    if (sizes[1] < sizes[best]) best = 1;
    if (sizes[2] < sizes[best]) best = 2;
    cols[best].push(...buf);
    sizes[best] += buf.length;
    buf = [];
  };

  for (const it of items) {
    if (it.type === "section") flush();
    buf.push(it);
  }
  flush();
  return cols;
}

export default async function Page({ params }: { params: { external_id: string } }) {
  const rec = await fetchByExternalId(params.external_id);
  if (!rec) return <div className="p-6">Объект не найден</div>;
  const labels = await fetchColumnLabels();

  const gallery = await getGallery(rec);

  // MAIN block
  const mainRows: Item[] = [];
  for (const k of MAIN_KEYS) {
    if (rec[k] !== undefined && !isEmpty(rec[k])) {
      mainRows.push({ type: "row", key: k, label: labelFor(k, labels), value: rec[k] });
    }
  }

  // OTHER fields -> list with section headings
  const items: Item[] = [];
  // Always show section headers (even if empty)
  for (const hk of HEADING_KEYS) {
    items.push({ type: "section", key: hk, label: labelFor(hk, labels) });
  }

  for (const [k,v] of Object.entries(rec)) {
    if (HIDDEN_KEYS.has(k)) continue;
    if (MAIN_KEYS.includes(k)) continue;
    if (PRICE_KEYS.has(k)) continue;
    if (HEADING_KEYS.includes(k)) continue;
    if (isEmpty(v)) continue;
    items.push({ type: "row", key: k, label: labelFor(k, labels), value: v });
  }

  // Balance across 3 columns
  const [colA, colB, colC] = chunkBySections(items);

  // "КМ %" under price table
  const kmVal = rec["km %"] ?? rec["km_"] ?? rec["km"] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton/>
        <h1 className="text-2xl font-semibold">
          {rec.address || "Объект"}
        </h1>
      </div>

      <PhotoStrip images={gallery} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column (main) */}
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="space-y-3">
            {mainRows.map((r) => (
              <div key={r.key} className="grid grid-cols-2 gap-3">
                <div className="font-semibold">{r.label}</div>
                <div>{String(r.value)}</div>
              </div>
            ))}
            <PriceTable rec={rec} />
            {kmVal !== null && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="font-semibold">КМ %</div>
                <div>{String(kmVal)}</div>
              </div>
            )}
            {colA.map((it, idx) => (
              it.type === "section" ? (
                <div key={`sA${idx}`} className="pt-4 text-gray-500 font-semibold">{it.label}</div>
              ) : (
                <div key={`rA${idx}`} className="grid grid-cols-2 gap-3">
                  <div className="font-semibold">{it.label}</div>
                  <div>{String(it.value)}</div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Middle column */}
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="space-y-3">
            {colB.map((it, idx) => (
              it.type === "section" ? (
                <div key={`sB${idx}`} className="pt-4 text-gray-500 font-semibold">{it.label}</div>
              ) : (
                <div key={`rB${idx}`} className="grid grid-cols-2 gap-3">
                  <div className="font-semibold">{it.label}</div>
                  <div>{String(it.value)}</div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="space-y-3">
            {colC.map((it, idx) => (
              it.type === "section" ? (
                <div key={`sC${idx}`} className="pt-4 text-gray-500 font-semibold">{it.label}</div>
              ) : (
                <div key={`rC${idx}`} className="grid grid-cols-2 gap-3">
                  <div className="font-semibold">{it.label}</div>
                  <div>{String(it.value)}</div>
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
