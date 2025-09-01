import Link from "next/link";
import CityFilter from "@/components/CityFilter";
import PriceTable from "@/components/PriceTable";
import { fetchCities, fetchList, getFirstPhoto } from "./data";
import { shortAddress } from "@/lib/fields";

export default async function Page({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const selectedCity = (typeof searchParams.city === "string" ? searchParams.city : undefined) || "Все города";
  const [cities, items] = await Promise.all([fetchCities(), fetchList(selectedCity)]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="text-lg">Город:</div>
        <CityFilter cities={cities} value={selectedCity} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {await Promise.all(items.map(async (rec: any) => {
          const id = String(rec.external_id || rec.id);
          const photo = await getFirstPhoto(rec.external_id);
          const addrTitle = shortAddress(rec);
          return (
            <Link key={id} href={`/o/${encodeURIComponent(id)}`} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo || ""} alt={addrTitle} className="h-48 w-full object-cover" />
              <div className="p-5 space-y-3">
                <div className="text-lg font-semibold">{addrTitle}</div>
                <div className="text-sm">
                  <div className="mb-1"><span className="font-semibold">Тип помещения</span><span className="opacity-0 select-none">_</span></div>
                  <div className="text-muted-foreground">{rec.tip_pomescheniya ?? "—"}</div>
                  <div className="mt-2"><span className="font-semibold">Этаж</span>: {rec.etazh ?? "—"}</div>
                  <div className="mt-1"><span className="font-semibold">Доступно</span>: {rec.dostupnaya_ploschad ? `${rec.dostupnaya_ploschad} м²` : "—"}</div>
                </div>
                <PriceTable rec={rec} />
              </div>
            </Link>
          );
        }))}
      </div>
    </div>
  );
}