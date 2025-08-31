import BackButton from "@/components/BackButton";
import { fetchByExternalId, getGallery } from "@/app/data";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";
import { prettyLabels, DomusRecord, shortAddress } from "@/lib/fields";

function KV({ k, v }: { k: string, v: any }) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  return (
    <div className="grid grid-cols-[200px,1fr] gap-3 py-1 border-b border-neutral-100">
      <div className="k">{k}</div>
      <div className="v">{String(v)}</div>
    </div>
  );
}

const HIDE_FIELDS = new Set<string>([
  // скрыть системные и перечисленные поля
  "external_id","id","created_at","updated_at","id_obekta","otobrazit_vse","km","avito_id","etazh_avito",
  "ukazannaya_ploschad","ukazannaya_stoimost_za_m2","transportnaya_dostupnost_magistrali_razvyazki",
  "blizost_obschestvennogo_transporta","probki_v_chasy_pik_nizkie_srednie_vysokie","foto_s_avito",
  "unnamed_93","disk_foto_plan","adres_23_58","adres_avito","city"
]);

export default async function Page({ params }: { params: { external_id: string } }) {
  const rec = await fetchByExternalId(decodeURIComponent(params.external_id));
  if (!rec) {
    return <div className="card card-pad">Объект не найден.</div>;
  }
  const gallery = await getGallery(rec.external_id);

  // Заголовок — адрес (Avito)
  const heading = rec.adres_avito || shortAddress(rec) || rec.external_id;

  // Основные поля: тип, этаж, доступная площадь
  const primary: (keyof DomusRecord)[] = [
    "tip_pomescheniya","etazh","dostupnaya_ploschad"
  ];
  const shown = new Set(primary.concat(["ot_20","ot_50","ot_100","ot_400","ot_700","ot_1500"]));
  const otherEntries = Object.entries(rec)
    .filter(([k,v]) => !shown.has(k as any) && !HIDE_FIELDS.has(k) && v && String(v).trim() !== "");

  return (
    <div className="space-y-4">
      <BackButton />

      <div className="mt-2">
        <h1 className="text-2xl font-semibold mb-1">{heading}</h1>
      </div>

      <PhotoStrip urls={gallery} />

      <div className="card card-pad">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold mb-2">Основное</h2>
            {primary.map((key) => <KV key={String(key)} k={prettyLabels[key as string] || String(key)} v={(rec as any)[key]} />)}
            <div className="mt-2">
              <PriceTable rec={rec} />
            </div>
          </div>
          {otherEntries.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">Прочие параметры</h2>
              <div className="kv-grid">
                {otherEntries.map(([k,v]) => (
                  <div key={k} className="contents">
                    <div className="k">{prettyLabels[k] || k}</div>
                    <div className="v">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {rec.tekst_obyavleniya && (
        <div className="card card-pad">
          <h2 className="font-semibold mb-2">Описание</h2>
          <div className="whitespace-pre-wrap">{rec.tekst_obyavleniya}</div>
        </div>
      )}
    </div>
  );
}
