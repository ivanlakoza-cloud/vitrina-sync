
import Link from "next/link";
import { getCatalog } from "@/lib/data";

type Search = { city?: string };

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Search }) {
  const currentCity = (searchParams?.city ?? "").toString();

  const { items, cities } = await getCatalog({
    city: currentCity || undefined,
  });

  const cityOptions = Array.from(
    new Set([
      ...cities,
      ...items.map((i) => i.city).filter(Boolean) as string[],
    ])
  ).sort((a, b) => a.localeCompare(b, "ru"));

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <form action="/" method="get" className="mb-6 flex items-center gap-2">
        <label htmlFor="city" className="font-medium">
          Город:
        </label>
        <select
          id="city"
          name="city"
          defaultValue={currentCity}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">Все города</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" className="border rounded-lg px-3 py-2">
          Применить
        </button>
      </form>

      {items.length === 0 ? (
        <div className="text-gray-500">Нет объектов по выбранному фильтру.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((p) => {
            const href = `/p/${encodeURIComponent(p.external_id)}`;
            return (
              <div
                key={p.external_id}
                className="rounded-xl overflow-hidden border bg-white"
              >
                <Link href={href} className="block">
                  {/* Фикс высоты вместо aspect-ratio, чтобы на мобильных не занимало весь экран */}
                  <div className="relative w-full h-40 md:h-44 lg:h-48 bg-gray-100">
                    {p.coverUrl ? (
                      <img
                        src={p.coverUrl}
                        alt={p.title ?? p.address ?? p.external_id}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                </Link>
                <div className="p-3">
                  <div className="text-xs text-gray-500 mb-1">
                    {p.city ?? "—"}
                  </div>
                  <Link
                    href={href}
                    className="text-sm font-medium text-gray-900 hover:underline"
                  >
                    {p.title ?? p.address ?? p.external_id}
                  </Link>
                  <div className="text-xs text-gray-500 mt-1">
                    {p.address ?? ""}
                  </div>
                  <Link
                    href={href}
                    className="inline-block mt-2 text-indigo-600 text-sm hover:underline"
                  >
                    Подробнее →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
