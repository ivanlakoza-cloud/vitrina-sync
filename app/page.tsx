import Link from "next/link";
import { headers } from "next/headers";
import CityFilter from "@/components/CityFilter";

export const dynamic = "force-dynamic";

type Property = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  cover_storage_path: string | null;
  cover_ext_url: string | null;
  updated_at: string | null;
  tip_pomescheniya?: string | null;
  etazh?: string | number | null;
  price_band?: string | null;
};

function getBaseUrl(): string {
  const h = headers();
  // prefer configured site url, fallback to headers
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/$/, "");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  return `${proto}://${host}`.replace(/\/$/, "");
}

function coverUrlOf(p: Property): string | null {
  if (p.cover_storage_path) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const path = p.cover_storage_path.replace(/^\/?photos\//, "");
    return `${base}/storage/v1/object/public/photos/${path}`;
  }
  return p.cover_ext_url || null;
}

function cls(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default async function Page({ searchParams }: { searchParams: { city?: string } }) {
  const city = searchParams?.city ?? "";
  const base = getBaseUrl();
  const url = new URL("/api/catalog", base);
  if (city) url.searchParams.set("city", city);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Catalog API ${res.status}`);
  }
  const data = await res.json();

  const items: Property[] = Array.isArray(data) ? data : (data?.items ?? []);
  const cities: string[] = Array.isArray(data) ? Array.from(new Set(items.map(i => i.city).filter(Boolean) as string[])) : (data?.cities ?? []);

  return (
    <main className="mx-auto max-w-7xl p-4">
      {/* Фильтр */}
      <div className="mb-4">
        <CityFilter cities={cities} selected={city} />
      </div>

      {/* Сетка карточек */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => {
          const cover = coverUrlOf(p);
          const href = `/p/${p.external_id}`;
          const caption = `${p.city ?? "—"}${p.address ? ", " + p.address : ""}`;

          return (
            <div key={p.external_id} className="rounded-xl border bg-white shadow-sm">
              <Link href={href} className="block">
                <div className="aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-gray-100">
                  {cover ? (
                    // используем обычный img, чтобы не настраивать домены next/image
                    <img
                      src={cover}
                      alt={p.title ?? caption}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      Фото скоро будет
                    </div>
                  )}
                </div>
              </Link>

              <div className="space-y-2 p-3">
                <Link href={href} className="block font-medium leading-tight hover:underline">
                  {caption}
                </Link>

                {(p.tip_pomescheniya || p.etazh || p.price_band) && (
                  <div className="text-sm text-gray-600">
                    {p.tip_pomescheniya && <span>{p.tip_pomescheniya}</span>}
                    {p.tip_pomescheniya && p.etazh ? <span> · </span> : null}
                    {p.etazh != null && p.etazh !== "" && <span>Этаж: {p.etazh}</span>}
                    {(p.tip_pomescheniya || p.etazh) && p.price_band ? <span> · </span> : null}
                    {p.price_band && <span>{p.price_band}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}