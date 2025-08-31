import CityFilter from "@/components/CityFilter";
import PropertyCard from "@/components/PropertyCard";
import PriceTable from "@/components/PriceTable";
import { fetchAll, getCoverUrl } from "./data";

export default async function Home({ searchParams }: { searchParams: { city?: string } }) {
  const rows = await fetchAll();
  const cities = Array.from(new Set(rows.map(r => r.city).filter(Boolean))) as string[];
  const city = (searchParams?.city || "").trim();
  const filtered = city ? rows.filter(r => (r.city || "") === city) : rows;

  const covers = Object.fromEntries(await Promise.all(filtered.map(async (r) => {
    return [r.external_id, await getCoverUrl(r.external_id)];
  })));

  return (
    <div>
      <CityFilter cities={cities} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        {filtered.map((r) => (
          <div key={r.external_id}>
            <PropertyCard
              rec={r}
              href={`/o/${encodeURIComponent(r.external_id)}`}
              cover={covers[r.external_id]}
            />
            <PriceTable rec={r} />
          </div>
        ))}
      </div>
    </div>
  );
}
