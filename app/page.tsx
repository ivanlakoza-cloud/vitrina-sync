// app/page.tsx
import Link from "next/link";
import { getCatalog, type CatalogItem } from "@/lib/data";

type Search = { city?: string };

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Search;
}) {
  const currentCity = (searchParams?.city ?? "").trim();

  // Тянем данные из getCatalog с серверной стороны
  const { items: raw, cities, ui } = await getCatalog({ city: currentCity });

  // Отступ под фильтром ~16px
  const items = raw;

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6">
      {/* Фильтр */}
      <form action="/" method="get" className="mb-4 flex items-center gap-3">
        <label htmlFor="city" className="text-lg">Город:</label>
        <select
          id="city"
          name="city"
          defaultValue={currentCity}
          className="rounded-lg border px-3 py-2 text-base"
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
          className="rounded-lg border px-3 py-2 hover:bg-gray-50"
        >
          Применить
        </button>
      </form>

      {/* Каталог */}
      {items.length === 0 ? (
        <p className="text-gray-500 text-xl">Нет объектов по выбранному фильтру.</p>
      ) : (
        <div
          className={[
            "grid gap-5",
            "grid-cols-1",
            "sm:grid-cols-2",
            "md:grid-cols-3",
            "xl:grid-cols-6",
          ].join(" ")}
        >
          {items.map((p) => (
            <Card key={p.external_id} p={p} />
          ))}
        </div>
      )}
    </main>
  );
}

function fmtNum(n?: number | null) {
  if (n === null || n === undefined) return "";
  try {
    return new Intl.NumberFormat("ru-RU").format(n);
  } catch {
    return String(n);
  }
}

function Card({ p }: { p: CatalogItem }) {
  const href = `/p/${encodeURIComponent(p.external_id)}`;

  const priceKeys: (keyof CatalogItem)[] = [
    "price_per_m2_20",
    "price_per_m2_50",
    "price_per_m2_100",
    "price_per_m2_400",
    "price_per_m2_700",
    "price_per_m2_1500",
  ];
  const priceLine = priceKeys
    .map((k) => p[k])
    .filter((v) => typeof v === "number" && v! > 0)
    .map((v) => fmtNum(v as number))
    .join(" · ");

  return (
    <div className="rounded-2xl shadow-sm border overflow-hidden bg-white flex flex-col">
      <Link href={href} className="block">
        <div className="relative w-full bg-gray-100" style={{ aspectRatio: "4 / 3" }}>
          {p.coverUrl ? (
            <img
              src={p.coverUrl}
              alt={p.title ?? p.address ?? p.external_id}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}
        </div>
      </Link>

      <div className="p-3">
        {/* 1-я строка: Город, адрес — жирная ссылка */}
        <Link
          href={href}
          className="font-semibold text-[15px] leading-tight hover:underline block"
          title={p.title ?? p.address ?? p.external_id}
        >
          {[p.city, p.address].filter(Boolean).join(", ") || p.title || p.external_id}
        </Link>

        {/* 2-я строка: тип, доступная площадь */}
        <div className="text-sm text-gray-700 mt-1">
          {[
            p.type ? `Тип: ${p.type}` : "",
            p.available_area ? `Доступно: ${fmtNum(p.available_area)} м²` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>

        {/* 3-я строка: диапазоны цен (только цифры) */}
        {priceLine ? (
          <div className="text-sm text-gray-900 mt-1">{priceLine}</div>
        ) : null}

        <Link
          href={href}
          className="text-[15px] text-blue-600 hover:underline mt-2 inline-block"
        >
          Подробнее →
        </Link>
      </div>
    </div>
  );
}
