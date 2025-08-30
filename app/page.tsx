// app/page.tsx
import Link from "next/link";
import { getCatalog } from "../lib/data";

type Search = { city?: string };

export const revalidate = 300; // кэш до 5 минут ок

export default async function Page({
  searchParams,
}: {
  searchParams: Search;
}) {
  const currentCity = (searchParams?.city ?? "").trim();

  // Универсальная форма: { items, cities, ui }
  const { items, cities } = await getCatalog({ city: currentCity });

  return (
    <main className="px-6 py-6">
      {/* Фильтр */}
      <form action="/" method="get" className="flex items-center gap-3">
        <label htmlFor="city" className="text-lg">
          Город:
        </label>
        <select
          id="city"
          name="city"
          defaultValue={currentCity}
          className="h-10 rounded-xl border border-gray-300 px-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-700"
        >
          Применить
        </button>
      </form>

      {/* Отступ под фильтром (возвращён) */}
      <div className="h-6" />

      {/* Сетка карточек: 6 / 3 / 2 / 1 */}
      {items.length === 0 ? (
        <p className="text-lg text-gray-500">
          Нет объектов по выбранному фильтру.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {items.map((p) => {
            const href = `/p/${encodeURIComponent(p.external_id)}`;

            // Строки карточки
            const line1 =
              [p.city, p.address].filter(Boolean).join(", ") ||
              p.title ||
              p.external_id;

            const line2 = [
              p.type ? `Тип: ${p.type}` : "",
              p.available_area ? `Доступно: ${p.available_area} м²` : "",
            ]
              .filter(Boolean)
              .join(" · ");

            // Все цены, где есть числа (поля *_20, *_50, ...):
            const priceKeys = [
              "price_per_m2_20",
              "price_per_m2_50",
              "price_per_m2_100",
              "price_per_m2_400",
              "price_per_m2_700",
              "price_per_m2_1500",
            ] as const;
            const prices = priceKeys
              .map((k) => p[k])
              .filter((v) => v !== null && v !== undefined && v !== "")
              .map((v) => String(v))
              .join(" · ");

            return (
              <div
                key={p.external_id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <Link href={href} className="block">
                  <div className="relative aspect-[4/3] w-full bg-gray-100">
                    {p.coverUrl ? (
                      // используем <img>, чтобы не трогать next.config
                      <img
                        src={p.coverUrl}
                        alt={line1}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                </Link>

                <div className="p-4">
                  {/* 1-я строка: Город, адрес — жирная, ссылкой */}
                  <Link
                    href={href}
                    className="line-clamp-2 font-semibold text-gray-900 hover:underline"
                  >
                    {line1}
                  </Link>

                  {/* 2-я строка: тип, доступная площадь */}
                  {line2 ? (
                    <div className="mt-1 text-sm text-gray-600">{line2}</div>
                  ) : null}

                  {/* 3-я строка: все стоимости, где есть значения — цифры */}
                  {prices ? (
                    <div className="mt-1 text-sm text-gray-700">{prices}</div>
                  ) : null}

                  {/* Кнопка «Подробнее» */}
                  <div className="mt-3">
                    <Link
                      href={href}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      Подробнее →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
