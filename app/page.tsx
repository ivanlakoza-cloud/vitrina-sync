// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { getCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

type SearchParams = { city?: string };

export default async function Home({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const city = (searchParams?.city ?? "").trim();
  const { items, cities, ui } = await getCatalog({ city });

  const order = Array.isArray(ui.card_fields_order) && ui.card_fields_order.length
    ? (ui.card_fields_order as string[])
    : ["photo", "city", "address", "type", "floor", "prices"]; // безопасный фоллбэк

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {ui.show_city_filter && (
        <form className="mb-4" /* 16px отступ под фильтром */>
          <label className="text-sm mr-2">Город:</label>
          <select
            name="city"
            defaultValue={city}
            onChange={(e) => {
              const v = e.currentTarget.value;
              const url = new URL(window.location.href);
              if (v) url.searchParams.set("city", v);
              else url.searchParams.delete("city");
              window.location.href = url.toString();
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">Все города</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </form>
      )}

      <div
        className="
          grid gap-4
          grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6
        "
      >
        {items.map((it) => (
          <article
            key={it.external_id}
            className="border rounded-lg overflow-hidden bg-white/50 dark:bg-neutral-900/50 shadow-sm"
          >
            {/* Рендерим по порядку из Directus (с фоллбэком) */}
            {order.map((slot) => {
              switch (slot) {
                case "photo":
                  return (
                    <Link
                      href={`/p/${encodeURIComponent(it.external_id)}`}
                      key="photo"
                      className="block aspect-[4/3] relative"
                    >
                      {it.cover_url ? (
                        <Image
                          src={it.cover_url}
                          alt={it.title ?? it.address ?? "Объект"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1280px) 50vw, 33vw"
                          priority={false}
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-200 dark:bg-neutral-800" />
                      )}
                    </Link>
                  );
                case "city":
                  return (
                    <div key="city" className="px-3 pt-3 text-xs uppercase tracking-wide text-neutral-500">
                      {it.city || "—"}
                    </div>
                  );
                case "address":
                  return (
                    <h3 key="address" className="px-3 pt-1 text-sm font-medium line-clamp-2">
                      {it.address || it.title || "Без адреса"}
                    </h3>
                  );
                case "type":
                  return (
                    <div key="type" className="px-3 pt-1 text-xs text-neutral-500">
                      {it.type ?? ""}
                    </div>
                  );
                case "floor":
                  return (
                    <div key="floor" className="px-3 pt-1 text-xs text-neutral-500">
                      {/* Можно дополнить из units, сейчас оставим заглушку */}
                    </div>
                  );
                case "prices":
                  return (
                    <div key="prices" className="px-3 py-3 text-sm">
                      {/* Под минимальную цену / диапазон — можно расширить при наличии view_prices */}
                      <Link
                        href={`/p/${encodeURIComponent(it.external_id)}`}
                        className="inline-flex items-center text-blue-600 hover:underline"
                      >
                        Подробнее →
                      </Link>
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </article>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-sm text-neutral-500 mt-6">Нет объектов по выбранному фильтру.</div>
      )}
    </main>
  );
}
