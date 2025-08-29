// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { getCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

type SearchParams = { city?: string };

const DEFAULT_ORDER = ["photo", "city", "address", "type", "area", "prices"];

// формат площади
function fmtArea(v: any): string | null {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? `${n} м²` : String(v);
}

// строка с ценами «20: 1200 · 50: 1100 ...» — только заполненные
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
      {/* Фильтр (без onChange в серверном компоненте) */}
      {ui.show_city_filter && (
        <div className="mb-4 flex items-center gap-2">
          <label htmlFor="city-select" className="text-base">Город:</label>
          <select
            id="city-select"
            name="city"
            defaultValue={city}
            className="border rounded-md px-3 py-2 text-base"
          >
            <option value="">Все города</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Навешиваем обработчик изменения города уже на клиенте */}
      <Script id="city-autosubmit">{`
        (function(){
          var sel = document.getElementById('city-select');
          if(!sel) return;
          sel.addEventListener('change', function(){
            var url = new URL(window.location.href);
            var v = sel.value;
            if (v) url.searchParams.set('city', v);
            else url.searchParams.delete('city');
            window.location.href = url.toString();
          });
        })();
      `}</Script>

      {/* 6 плиток в ряд на xl, 3 на md, 2 на sm, 1 на мобиле */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {items.map((it) => {
          const href = `/p/${encodeURIComponent(it.external_id)}`;
          const line1 = [it.city, it.address].filter(Boolean).join(", "); // Город, адрес (жирная, ссылкой)
          const area = fmtArea(it.available_area ?? it.total_area);
          const line2 = [it.type ? `Тип: ${it.type}` : null, area ? `Площадь: ${area}` : null]
            .filter(Boolean)
            .join(" · "); // тип, площадь
          const line3 = buildPrices(it); // цены

          return (
            <article
              key={it.external_id}
              className="group border rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-shadow"
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
              <div className="px-3 py-3 text-[16px] leading-snug">
                {/* 1-я строка: Город, адрес (жирная, ссылкой, одной строкой) */}
                <Link
                  href={href}
                  className="font-semibold hover:underline underline-offset-4 block truncate"
                  title={line1}
                >
                  {line1 || it.title || "Без адреса"}
                </Link>

                {/* 2-я строка: тип, площадь */}
                {(line2 && (order.includes("type") || order.includes("area"))) && (
                  <div className="mt-1 text-[16px] text-neutral-600 dark:text-neutral-300 truncate">
                    {line2}
                  </div>
                )}

                {/* 3-я строка: цены */}
                {line3 && order.includes("prices") && (
                  <div className="mt-1 text-[16px] text-neutral-800 dark:text-neutral-100 truncate">
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
