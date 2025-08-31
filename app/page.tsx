import Link from "next/link";
import CityFilter from "@/components/CityFilter";
import { fetchCities, fetchList, getFirstPhoto } from "./data";
import PriceTable from "@/components/PriceTable";
import { prettyLabels, shortAddress } from "@/lib/fields";

export default async function Page({ searchParams }: { searchParams: { city?: string } }) {
 const currentCity = searchParams.city || "";
 const [cities, items] = await Promise.all([fetchCities(), fetchList(currentCity || undefined)]);
 return (<div className="space-y-4">
  <CityFilter cities={cities} />
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xl:grid-cols-5">
   {await Promise.all(items.map(async (rec) => {
    const id = String(rec.id_obekta || rec.external_id || rec.id);
    const photo = await getFirstPhoto(id);
    const addrTitle = shortAddress(rec);
    return (<Link key={id} href={`/o/${encodeURIComponent(id)}`} className="card overflow-hidden">
     <img src={photo} alt={addrTitle} className="h-48 w-full object-cover" />
     <div className="p-5 space-y-3">
      <div className="text-lg font-semibold">{addrTitle}</div>
      <div className="text-sm">
       <div>{rec.tip_pomescheniya || "—"}</div>
       <div><span className="font-semibold">{prettyLabels["etazh"]}:</span> {rec.etazh || "—"}</div>
       <div><span className="font-semibold">Доступно:</span> {rec.dostupnaya_ploschad ? `${rec.dostupnaya_ploschad} м²` : "—"}</div>
      </div>
      <PriceTable rec={rec} size="sm" />
     </div>
    </Link>);
   }))}
  </div>
 </div>);
}
