
import Link from "next/link";
import CityFilter from "@/components/CityFilter";
import PriceTable from "@/components/PriceTable";
import { shortAddress } from "@/lib/fields";
import { fetchCities, fetchList, getFirstPhoto } from "./data";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const selectedCity = (typeof searchParams?.city === "string" ? searchParams.city : undefined) || "Все города";
  const [cities, items] = await Promise.all([fetchCities(), fetchList(selectedCity)]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-lg">Город:</div>
        <CityFilter cities={cities} value={selectedCity} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {await Promise.all(items.map(async (rec) => {
          const photo = await getFirstPhoto(rec.external_id);
          const id = String(rec.external_id || rec.id);
          const addrTitle = shortAddress(rec);
          return (
            <Link key={id} href={`/o/${encodeURIComponent(id)}`} className="card overflow-hidden border rounded-2xl">
              {photo && <img src={photo} alt={addrTitle} className="h-48 w-full object-cover" />}
              <div className="p-5 space-y-3">
                <div className="text-lg font-semibold">{addrTitle}</div>
                <div className="text-sm grid grid-cols-2 gap-x-4">
                  <div>Тип помещения:</div>
                  <div className="text-right">{rec.tip_pomescheniya || "—"}</div>
                  <div>Этаж:</div>
                  <div className="text-right">{rec.etazh || "—"}</div>
                  <div>Доступно:</div>
                  <div className="text-right">{rec.dostupnaya_ploschad ? `${rec.dostupnaya_ploschad} м²` : "—"}</div>
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
