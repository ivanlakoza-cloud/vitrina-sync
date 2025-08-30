import Link from "next/link";
import { headers } from "next/headers";
import CityFilter from "@/components/CityFilter";

export const dynamic = "force-dynamic";

type Item = {
  external_id: string;
  city: string | null;
  address: string | null;
  coverUrl?: string | null;
  cover_storage_path?: string | null;
  cover_ext_url?: string | null;
  title?: string | null;
  tip_pomescheniya?: string | null;
  etazh?: string | number | null;
  price_band?: string | null;
  updated_at?: string | null;
};

function buildBaseUrl() {
  // prefer explicit env if provided
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}`;
}

async function loadCatalog(city?: string) {
  const qs = new URLSearchParams();
  if (city) qs.set("city", city);
  const base = buildBaseUrl();
  const url = `${base}/api/catalog${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`Catalog fetch failed: ${res.status}`);
  }
  const data = await res.json();
  // API can return either { items, cities } or raw array – normalize:
  const items: Item[] = Array.isArray(data) ? data : (data.items ?? []);
  const cities: string[] = Array.isArray(data?.cities) ? data.cities : [];
  return { items, cities };
}

export default async function Page({
  searchParams,
}: {
  searchParams?: { city?: string };
}) {
  const city = searchParams?.city || "";
  const { items, cities } = await loadCatalog(city);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      {/* Фильтр */}
      <div className="mb-4">
        <CityFilter cities={cities} selected={city} />
      </div>

      {/* Сетка карточек */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p: Item) => {
          const captionCityAddr = [p.city, p.address].filter(Boolean).join(", ");
          const href = `/p/${p.external_id}`;
          const cover =
            p.coverUrl ||
            (p.cover_storage_path
              ? `/api/storage/photos/${encodeURIComponent(p.cover_storage_path)}`
              : p.cover_ext_url || null);

          return (
            <article
              key={p.external_id}
              className="rounded-xl border overflow-hidden bg-white"
            >
              <Link href={href} className="block">
                {/* используем <img> чтобы гарантированно отрисовать внешние URL */}
                <img
                  src={cover || "/placeholder.svg"}
                  alt={captionCityAddr || p.title || p.external_id}
                  className="h-48 w-full object-cover bg-gray-100"
                  loading="lazy"
                />
              </Link>
              <div className="p-3 space-y-1">
                <Link href={href} className="font-medium hover:underline">
                  {captionCityAddr || "—"}
                </Link>
                <div className="text-sm text-gray-600">
                  {[p.tip_pomescheniya, p.etazh ? `этаж ${p.etazh}` : null, p.price_band]
                    .filter(Boolean)
                    .join(" · ") || " "}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
