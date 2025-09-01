
import Link from "next/link";
import CityFilter from "@/components/CityFilter";
import PriceTable from "@/components/PriceTable";
import { fetchCities, fetchList, getFirstPhoto } from "./data";
import { shortAddress } from "@/lib/fields";

export default async function Page({ searchParams }: { searchParams: { [key:string]: string | string[] | undefined } }) {
  const selectedCity = (searchParams?.city as string) || undefined;
  const [cities, items] = await Promise.all([fetchCities(), fetchList(selectedCity)]);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-5">
      <div className="flex items-center gap-3">
        <div className="text-lg">Город:</div>
        <CityFilter cities={cities} value={selectedCity} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {await Promise.all(items.map(async (rec: any) => {
          const id = String(rec.id || rec.external_id);
          const photo = await getFirstPhoto(rec.id || rec.external_id);
          const addrTitle = shortAddress(rec);
          return (
            <Link key={id} href={`/o/id${encodeURIComponent(rec.id || "")}`} className="card overflow-hidden">
              {photo ? (
                <img src={photo} alt={addrTitle || "Фото"} className="h-48 w-full object-cover" />
              ) : (
                <div className="h-48 w-full bg-gray-100 flex items-center justify-center text-gray-500">Фото недоступно</div>
              )}
              <div className="p-5 space-y-3">
                <div className="text-lg font-semibold">{addrTitle}</div>
                <div className="text-sm">
                  <div className="font-medium">{rec.tip_pomeshcheniya || "Помещение"}</div>
                  <div><span className="font-medium">Этаж:</span> {rec.etazh ?? "—"}</div>
                  <div><span className="font-medium">Доступно:</span> {rec.dostupnaya_ploschad ? `${rec.dostupnaya_ploschad} м²` : "—"}</div>
                </div>
                <PriceTable rec={rec} size="sm" />
              </div>
            </Link>
          );
        }))}
      </div>
    </div>
  );
}
