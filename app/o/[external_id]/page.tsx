import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import { fetchByExternalId, getGallery } from "@/app/data";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";
import { prettyLabels, DomusRecord, shortAddress } from "@/lib/fields";

export async function generateMetadata({ params }: { params: { external_id: string } }): Promise<Metadata> {
  const rec = await fetchByExternalId(decodeURIComponent(params.external_id));
  const title = rec ? `${shortAddress(rec)} — Витрина` : "Витрина";
  return { title };
}

function KV({ k, v, strong }: { k: string, v: any, strong?: boolean }) {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
  return (<div className="kv-row"><div className={strong ? "font-semibold text-base" : "font-semibold"}>{k}</div><div className="v">{String(v)}</div></div>);
}
function labelize(key: string): string { if ((prettyLabels as any)[key]) return (prettyLabels as any)[key]; return key.replace(/_/g," "); }

const HIDE_FIELDS = new Set<string>([
  "otdelka",
  "probki_v_chasy_pik_nizkie_srednie_vysokie",
  "transportnaya_dostupnost_magistrali_razvyazki",
  "external_id","id","created_at","updated_at","id_obekta","otobrazit_vse",
  "avito_id","etazh_avito","ukazannaya_ploschad","ukazannaya_stoimost_za_m2","disk_foto_plan",
  "adres_23_58","adres_avito","city","tekst_obyavleniya","zagolovok","foto_s_avito",
  "unnamed_93","unnamed 93"
]);

export default async function Page({ params }: { params: { external_id: string } }) {
  const rec = await fetchByExternalId(decodeURIComponent(params.external_id));
  if (!rec) return <div className="card card-pad">Объект не найден.</div>;
  const gallery = await getGallery(String(rec.id_obekta || rec.external_id || rec.id));
  const heading = shortAddress(rec);

  const primary: (keyof DomusRecord)[] = ["tip_pomescheniya","etazh","dostupnaya_ploschad"];
  const exclude = new Set<string>([...primary.map(String),"ot_20","ot_50","ot_100","ot_400","ot_700","ot_1500","km","planirovka","vysota_potolkov"]);

  const otherEntries = Object.entries(rec).filter(([k,v])=>{
    if (HIDE_FIELDS.has(k) || exclude.has(k)) return false;
    if (v === null || v === undefined) return false;
    if (typeof v === "string" && v.trim() === "") return false;
    return true;
  });

  const cols: Array<[string, any][]> = [[],[]];
  otherEntries.forEach((pair,i)=>cols[i%2].push(pair as [string,any]));

  return (<div className="space-y-4">
    <div className="flex items-center gap-4"><BackButton /><h1 className="text-2xl font-semibold">{heading}</h1></div>
    <PhotoStrip urls={gallery} />
    <div className="card card-pad">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        <div className="pr-5">
          {primary.map((key)=>(<KV key={String(key)} strong k={prettyLabels[key as string] || String(key)} v={(rec as any)[key]} />))}
          <div className="mt-2"><PriceTable rec={rec} /></div>
          <KV k={prettyLabels["km"]} v={(rec as any).km} />
        </div>
        <div className="border-l border-neutral-200 pl-5 pr-5">{/*__PL_VYS__*/}<KV k={labelize("planirovka")} v={(rec as any).planirovka} />
        <KV k={labelize("vysota_potolkov")} v={(rec as any).vysota_potolkov} />{cols[0].map(([k,v])=><KV key={k} k={labelize(k)} v={v} />)}</div>
        <div className="border-l border-neutral-200 pl-5">{cols[1].map(([k,v])=><KV key={k} k={labelize(k)} v={v} />)}</div>
      </div>
    </div>
    {(rec as any).zagolovok || (rec as any).tekst_obyavleniya ? (<div className="card card-pad">
      {(rec as any).zagolovok && <div className="text-xl font-semibold mb-2">{(rec as any).zagolovok}</div>}
      {(rec as any).tekst_obyavleniya && <div className="whitespace-pre-wrap">{(rec as any).tekst_obyavleniya}</div>}
    </div>) : null}
  </div>);
}
