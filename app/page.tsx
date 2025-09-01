import Link from "next/link";
import PriceTable from "@/components/PriceTable";
import { fetchCities, fetchList, getFirstPhoto } from "./data";

export default async function Page({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const selectedCity = (searchParams?.city as string) || "Все города";
  const [cities, items] = await Promise.all([fetchCities(), fetchList(selectedCity)]);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="text-lg">Город:</div>
        <form>
          <select name="city" defaultValue={selectedCity} className="border rounded-xl px-3 py-2">
            <option>Все города</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </form>
      </div>

      <div className="grid-cards">
        {await Promise.all(items.map(async (rec) => {
          const id = String(rec.external_id || rec.id);
          const photo = await getFirstPhoto(id);
          const addrTitle = (rec.address as string) || "—";
          return (
            <Link key={id} href={`/o/${encodeURIComponent(id)}`} className="card overflow-hidden">
              {photo ? <img src={photo} alt={addrTitle} className="h-48 w-full object-cover" /> : <div className="h-48 bg-gray-100 flex items-center justify-center">Фото недоступно</div>}
              <div className="p-5 space-y-3">
                <div className="text-lg font-semibold">{addrTitle}</div>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Тип помещения: </span>{rec.tip_pomescheniya || "—"}</div>
                  <div><span className="font-medium">Этаж: </span>{rec.etazh ?? "—"}</div>
                  <div><span className="font-medium">Доступно: </span>{rec.dostupnaya_ploschad ? `${rec.dostupnaya_ploschad} м²` : "—"}</div>
                  <PriceTable rec={rec} size="sm" />
                </div>
              </div>
            </Link>
          );
        }))}
      </div>
    </div>
  );
}
