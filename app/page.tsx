import Image from "next/image";
import Link from "next/link";
import CityFilter from "@/components/CityFilter";

type Item = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  coverUrl: string | null;
  tip_pomescheniya?: string | null;
  etazh?: string | number | null;
  priceRangeLabel?: string | null;
};

export const dynamic = "force-dynamic";

async function loadCatalog(searchParams: { city?: string }) {
  const q = new URLSearchParams();
  if (searchParams.city) q.set("city", searchParams.city);
  const res = await fetch(`/api/catalog?${q.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function Page({ searchParams }: { searchParams: { city?: string } }) {
  const data: { items: Item[]; cities: string[] } = await loadCatalog(searchParams);

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <CityFilter cities={data.cities} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.items.map((p) => {
          const title = [p.city, p.address].filter(Boolean).join(", ") || "—";
          return (
            <article key={p.external_id} className="rounded-xl border overflow-hidden bg-white">
              <Link href={`/p/${p.external_id}`} className="block relative aspect-[4/3] bg-gray-100">
                {p.coverUrl ? (
                  <Image src={p.coverUrl} alt={title} fill className="object-cover" unoptimized />
                ) : null}
              </Link>
              <div className="p-3 space-y-1">
                <Link href={`/p/${p.external_id}`} className="block font-medium hover:underline">
                  {title}
                </Link>
                <div className="text-sm text-gray-600">
                  {[p.tip_pomescheniya, p.etazh ? `этаж ${p.etazh}` : null, p.priceRangeLabel]
                    .filter(Boolean)
                    .join(" • ") || "\u00A0"}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
