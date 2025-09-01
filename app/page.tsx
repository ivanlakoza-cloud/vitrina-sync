import Link from "next/link";
import CityFilter from "@/components/CityFilter";
import PriceTable from "@/components/PriceTable";
import { fetchCities, fetchList, getFirstPhoto } from "./data";
import { shortAddress } from "@/lib/fields";

export const dynamic = "force-dynamic";

type Props = { searchParams?: { city?: string } };

export default async function Home({ searchParams }: Props) {
  const selectedCity = searchParams?.city || "Все города";
  const [cities, items] = await Promise.all([fetchCities(), fetchList(selectedCity)]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="text-lg">Город:</div>
        <CityFilter cities={cities} value={selectedCity} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {await Promise.all(
          items.map(async (rec) => {
            const id = String(rec.id ?? rec.external_id ?? "");
            const photo = await getFirstPhoto(id);
            const addrTitle = shortAddress(rec);
            return (
              <Link key={id} href={`/o/${encodeURIComponent(id)}`} className="card overflow-hidden">
                {photo ? (
                  <img src={photo} alt={addrTitle || "Фото"} className="h-48 w-full object-cover" />
                ) : (
                  <div className="h-48 w-full grid place-items-center text-sm text-gray-400">Фото недоступно</div>
                )}
                <div className="p-5 space-y-3">
                  <div className="text-lg font-semibold">{addrTitle}</div>
                  <div className="text-sm space-y-1">
                    <div className="text-gray-700">{rec.tip_pomescheniya || "—"}</div>
                    <div>
                      <span className="font-semibold">Этаж:</span> {rec.etazh || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Доступно:</span>{" "}
                      {rec.dostupnaya_ploschad ? `${rec.dostupnaya_ploschad} м²` : "—"}
                    </div>
                  </div>
                  <PriceTable rec={rec} size="sm" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
