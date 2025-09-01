import Link from "next/link";
import PriceTable from "@/components/PriceTable";
import CitySelect from "@/components/CitySelect";
import { fetchCities, fetchList, getFirstPhoto } from "./data";
import { shortAddress } from "@/lib/fields";

export default async function Page({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const selectedCity = (searchParams?.city as string) || "Все города";
  const [cities, items] = await Promise.all([fetchCities(), fetchList(selectedCity)]);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="text-lg">Город:</div>
        <CitySelect cities={cities} selected={selectedCity} />
      </div>

      <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
        {await Promise.all(items.map(async ([id, rec]: [string, any]) => {
          const photo = await getFirstPhoto(id);
          const addrTitle = shortAddress(rec as any);
          return (
            <Link key={id} href={`/o/${encodeURIComponent(id)}`} className="card overflow-hidden">
              {photo
                ? <img src={photo} alt={addrTitle} className="h-48 w-full object-cover" />
                : <div className="h-48 bg-gray-100 flex items-center justify-center">Фото недоступно</div>}
              <div className="p-5 space-y-3">
                <div className="text-lg font-semibold">{addrTitle}</div>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Тип помещения: </span>{(rec as any).tip_pomescheniya || "—"}</div>
                  <div><span className="font-medium">Этаж: </span>{(rec as any).etazh ?? "—"}</div>
                  <div><span className="font-medium">Доступно: </span>{(rec as any).dostupnaya_ploschad ? `${(rec as any).dostupnaya_ploschad} м²` : "—"}</div>
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
