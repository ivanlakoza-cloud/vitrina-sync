import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import { fetchByExternalId, getGallery, loadColumnLabels } from "@/app/data";
import PriceTable from "@/components/PriceTable";
import { prettyLabels, SECTION_FIELDS, hiddenKeys, isSectionField, shortAddress } from "@/lib/fields";

type Props = { params: { external_id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const rec = await fetchByExternalId(params.external_id);
  const title = rec ? shortAddress(rec) : "Объект";
  return { title };
}

function asPairs(obj: Record<string, any>): Array<[string, any]> {
  return Object.entries(obj).filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== "");
}

export default async function Page({ params }: Props) {
  const rec = await fetchByExternalId(params.external_id);
  if (!rec) return <div className="p-6">Объект не найден</div>;

  const id = String(rec.id ?? rec.external_id ?? "");
  const gallery = await getGallery(id);

  // load labels from DB comments; merge with fallbacks
  const fromDb = await loadColumnLabels();
  const labels: Record<string, string> = { ...prettyLabels, ...fromDb };

  // Main block keys
  const mainKeys: Array<[string, string]> = [
    ["tip_pomescheniya", labels["tip_pomescheniya"] || "Тип помещения"],
    ["etazh", labels["etazh"] || "Этаж"],
    ["dostupnaya_ploschad", labels["dostupnaya_ploschad"] || "Доступно"],
  ];

  // Prepare other fields, grouped by sections and filtered
  const pairs = Object.keys(rec)
    .filter((k) => !mainKeys.map(([key]) => key).includes(k))
    .filter((k) => !hiddenKeys.has(k))
    .map((k) => [k, rec[k]] as [string, any]);

  // Build rows with section headers
  const rows: Array<{ type: "section" | "row"; key: string; label: string; value?: string }> = [];
  for (const [k, v] of pairs) {
    if (isSectionField(k)) {
      rows.push({ type: "section", key: k, label: SECTION_FIELDS[k] });
      continue;
    }
    const label = labels[k] || k.replace(/_/g, " ");
    rows.push({ type: "row", key: k, label, value: String(v) });
  }

  // Evenly distribute rows across two right columns
  const mid = Math.ceil(rows.length / 2);
  const colA = rows.slice(0, mid);
  const colB = rows.slice(mid);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BackButton /> <div className="text-2xl font-semibold">{shortAddress(rec)}</div>
      </div>

      {/* gallery */}
      {gallery && gallery.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {gallery.map((src) => (
            <img key={src} src={src} alt="Фото" className="w-full aspect-[4/3] object-cover rounded" />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* left: main block */}
        <div className="card p-5 space-y-3">
          {mainKeys.map(([k, l]) => (
            <div key={k} className="grid grid-cols-[220px,1fr] gap-3">
              <div className="text-gray-600">{l}</div>
              <div className="font-medium">
                {k === "dostupnaya_ploschad" && rec[k] ? `${rec[k]} м²` : rec[k] ?? "—"}
              </div>
            </div>
          ))}
          <PriceTable rec={rec} />
          {"km_" in rec ? (
            <div className="grid grid-cols-[220px,1fr] gap-3">
              <div className="text-gray-600">{labels["km_"] || "КМ %"}</div>
              <div className="font-medium">{rec["km_"] ?? "—"}</div>
            </div>
          ) : null}
        </div>

        {/* middle column */}
        <div className="card p-5 space-y-2">
          {colA.map((it) =>
            it.type === "section" ? (
              <div key={it.key} className="pt-2 font-semibold text-gray-800">
                {it.label}
              </div>
            ) : (
              <div key={it.key} className="grid grid-cols-[220px,1fr] gap-3">
                <div className="text-gray-600">{it.label}</div>
                <div className="font-medium">{it.value}</div>
              </div>
            )
          )}
        </div>

        {/* right column */}
        <div className="card p-5 space-y-2">
          {colB.map((it) =>
            it.type === "section" ? (
              <div key={it.key} className="pt-2 font-semibold text-gray-800">
                {it.label}
              </div>
            ) : (
              <div key={it.key} className="grid grid-cols-[220px,1fr] gap-3">
                <div className="text-gray-600">{it.label}</div>
                <div className="font-medium">{it.value}</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
