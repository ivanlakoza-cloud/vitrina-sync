import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import { fetchByExternalId, getGallery } from "@/app/data";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";
import { prettyLabels, DomusRecord, shortAddress } from "@/lib/fields";

export async function generateMetadata({ params }: { params: { external_id: string } }): Promise<Metadata> {
  const rec = await fetchByExternalId(decodeURIComponent(params.external_id));
  const city = (rec?.otobrazit_vse || (rec as any)?.city || "") as string;
  const addr = (rec?.adres_23_58 || (rec?.adres_avito || "").replace(/^([^,]+),\s*/, "") || "") as string;
  const title = [city, addr].filter(Boolean).join(", ");
  return { title: (title ? `${title} — Витрина` : "Витрина") };
}

function KV({ k, v }: { k: string, v: any }) {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
  return (
    <div className="grid grid-cols-[200px,1fr] gap-3 py-1 border-b border-neutral-100">
      <div className="k">{k}</div>
      <div className="v">{String(v)}</div>
    </div>
  );
}

const HIDE_FIELDS = new Set<string>([
  "external_id","id","created_at","updated_at","id_obekta","otobrazit_vse","km","avito_id","etazh_avito",
  "ukazannaya_ploschad","ukazannaya_stoimost_za_m2","transportnaya_dostupnost_magistrali_razvyazki",
  "blizost_obschestvennogo_transporta","probki_v_chasy_pik_nizkie_srednie_vysokie","foto_s_avito",
  "unnamed_93","disk_foto_plan","adres_23_58","adres_avito","city","tekst_obyavleniya"
]);

export default async function Page({ params }: { params: { external_id: string } }) {
  const rec = await fetchByExternalId(decodeURIComponent(params.external_id));
  if (!rec) {
    return <div className="card card-pad">Объект не найден.</div>;
  }
  const gallery = await getGallery(rec.external_id);

  const heading = (rec as any).adres_avito || shortAddress(rec) || (rec as any).external_id;

  const primary: (keyof DomusRecord)[] = ["tip_pomescheniya","etazh","dostupnaya_ploschad"];
  const exclude = new Set<string>([...primary.map(String), "ot_20","ot_50","ot_100","ot_400","ot_700","ot_1500"]);

  const otherEntries = Object.entries(rec).filter(([k,v]) => {
    if (HIDE_FIELDS.has(k) || exclude.has(k)) return false;
    if (v === null || v === undefined) return false;
    if (typeof v === "string" && v.trim() === "") return false;
    return true;
  });

  // split otherEntries into 3 roughly equal columns
  const cols: Array<[string, any][]> = [[],[],[]];
  otherEntries.forEach((pair, i) => cols[i % 3].push(pair as [string, any]));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <BackButton />
        <h1 className="text-2xl font-semibold">{heading}</h1>
      </div>

      <PhotoStrip urls={gallery} />

      <div className="card card-pad">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div>
            {primary.map((key) => (
              <KV key={String(key)} k={prettyLabels[key as string] || String(key)} v={(rec as any)[key]} />
            ))}
            <div className="mt-2">
              <PriceTable rec={rec} />
            </div>
          </div>
          {cols.map((list, idx) => (
            <div key={idx}>
              <div className="kv-grid">
                {list.map(([k,v]) => (
                  <div key={k} className="contents">
                    <div className="k">{prettyLabels[k] || k}</div>
                    <div className="v">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(rec as any).tekst_obyavleniya && (
        <div className="card card-pad">
          <div className="whitespace-pre-wrap">{(rec as any).tekst_obyavleniya}</div>
        </div>
      )}
    </div>
  );
}
