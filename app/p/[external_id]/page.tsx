// app/p/[external_id]/page.tsx
import Link from "next/link";
import { getProperty } from "../../../lib/data";
import { listPhotoKeys, toPublicUrl } from "../../../lib/photos";

export const dynamic = "force-dynamic";

export default async function PropertyPage({
  params,
}: {
  params: { external_id: string };
}) {
  const id = params.external_id;
  const p = await getProperty(id);

  if (!p) {
    return (
      <main className="p-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Каталог
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Объект не найден</h1>
      </main>
    );
  }

  // Соберём галерею из Storage (если есть)
  let gallery: string[] = [];
  try {
    const keys = await listPhotoKeys(id);
    gallery = keys.map((k) => toPublicUrl(k)!).filter(Boolean) as string[];
  } catch {}

  const header = [p.city, p.address].filter(Boolean).join(", ") || p.title || p.external_id;

  const priceKeys = [
    "price_per_m2_20",
    "price_per_m2_50",
    "price_per_m2_100",
    "price_per_m2_400",
    "price_per_m2_700",
    "price_per_m2_1500",
  ] as const;
  const prices = priceKeys
    .map((k) => (p as any)[k])
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map((v) => String(v))
    .join(" · ");

  return (
    <main className="p-6">
      <Link href="/" className="text-blue-600 hover:underline">
        ← Каталог
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">{header}</h1>

      {/* Обложка */}
      {p.coverUrl ? (
        <div className="mt-4 overflow-hidden rounded-2xl border">
          <img
            src={p.coverUrl}
            alt={header}
            className="h-auto w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      {/* Основные поля */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <div className="text-gray-600">Тип</div>
          <div className="text-lg">{p.type ?? "—"}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-gray-600">Доступная площадь</div>
          <div className="text-lg">
            {p.available_area ? `${p.available_area} м²` : "—"}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-gray-600">Общая площадь</div>
          <div className="text-lg">{p.total_area ? `${p.total_area} м²` : "—"}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-gray-600">Стоимость</div>
          <div className="text-lg">{prices || "—"}</div>
        </div>
      </div>

      {/* Галерея */}
      {gallery.length ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {gallery.map((src, i) => (
            <div key={i} className="overflow-hidden rounded-xl border">
              <img src={src} alt={`Фото ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
