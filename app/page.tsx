// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { getCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

type SearchParams = { city?: string };

const DEFAULT_ORDER = ["photo", "city", "address", "type", "area", "prices"];

// форматируем площадь
function fmtArea(v: any): string | null {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? `${n} м²` : String(v);
}

// собираем строку с ценами «20: 1200 · 50: 1100 ...» — только те, что существуют
function buildPrices(p: any): string | null {
  const pairs: Array<[string, any]> = [
    ["20", p?.price_per_m2_20],
    ["50", p?.price_per_m2_50],
    ["100", p?.price_per_m2_100],
    ["400", p?.price_per_m2_400],
    ["700", p?.price_per_m2_700],
    ["1500", p?.price_per_m2_1500],
  ];
  const parts = pairs
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${v}`);
  return parts.length ? parts.join(" · ") : null;
}

export default async function Home({ searchParams }: { searchParams?: SearchParams }) {
  const city = (searchParams?.city ?? "").trim();
  const { items, cities, ui } = await getCatalog({ city });

  const order = Array.isArray(ui.card_fields_order) && ui.card_fields_order.length
    ? (ui.card_fields_order as string[])
    : DEFAULT_ORDER;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Фильтр городов + отступ 16px */}
      {ui.show_city_filter && (
        <form className="mb-4">
          <label className="text-base mr-2">Город:</label>
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
            className="border rounded-md px-3 py-2 text-base"
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

      {/* 6 плиток в ряд на xl, 3 на md, 2 на sm, 1 на мобиле */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {items.map((it) => {
          const href = `/p/${encodeURIComponent(it.external_id)}`;

          // первая строка (ссылка): Город, Адрес
          const line1 = [it.city, it.address].filter(Boolean).join(", ");

          // вторая строка: тип, доступная площадь
          const area = fmtArea(it.available_area ?? it.total_area);
          const line2 = [it.type ? `Тип: ${it.type}` : null, area ? `Площадь: ${area}` : null]
            .filter(Boolean)
            .join(" · ");

          // третья строка: все диапазоны цен
          const line3 = buildPrices(it);

          return (
            <article
              key={it.external_id}
              className="
                group border rounded-2xl overflow-hidden bg-white dark:bg-neutral-900
                shadow-sm hover:shadow-md transition-shadow
              "
            >
              {/* фото */}
              {order.includes("photo") && (
                <Link href={href} className="block relative aspect-[4/3] bg-neutral-100">
                  {it.cover_url ? (
                    <Image
                      src={it.cover_url}
                      alt={line1 || it.title || "Объект"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 16vw"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </Link>
              )}

              {/* текстовый блок */}
              <div className="px-3 py-3 text-[15px] leading-snug">
                {/* строка-ссылка: Город, адрес */}
                <Link
                  href={href}
                  className="font-semibold hover:underline underline-offset-4 block truncate"
                  title={line1}
                >
                  {line1 || it.title || "Без адреса"}
                </Link>

                {/* строка: тип, площадь (если есть) */}
                {(line2 && (order.includes("type") || order.includes("area"))) && (
                  <div className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-300">
                    {line2}
                  </div>
                )}

                {/* строка: цены (если есть) */}
                {line3 && order.includes("prices") && (
                  <div className="mt-1 text-[15px] text-neutral-800 dark:text-neutral-100">
                    {line3}
                  </div>
                )}

                {/* CTA */}
                <div className="mt-2">
                  <Link
                    href={href}
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Подробнее →
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="text-base text-neutral-500 mt-6">Нет объектов по выбранному фильтру.</div>
      )}
    </main>
  );
}
