// app/p/[external_id]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { getProperty } from "@/lib/data";

export const dynamic = "force-dynamic";

function fmtArea(v: any): string | null {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? `${n} м²` : String(v);
}

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

export default async function PropertyPage({
  params,
}: {
  params: { external_id: string };
}) {
  const p = await getProperty(params.external_id);

  if (!p) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Каталог
        </Link>
        <h1 className="text-2xl font-semibold mt-4">Объект не найден</h1>
        <p className="text-neutral-600 mt-2">
          Проверьте корректность ссылки или вернитесь в каталог.
        </p>
      </main>
    );
  }

  // безопасно берём возможный этаж из разных ключей
  const anyP = p as any;
  const floor =
    anyP?.floor ?? anyP?.etazh ?? anyP?.level ?? anyP?.floor_number ?? null;

  const area = fmtArea(p.available_area ?? p.total_area);
  const prices = buildPrices(p);

  const title = p.title ?? p.address ?? "Объект";
  const subtitleParts = [
    p.city || null,
    p.type ? `тип: ${p.type}` : null,
    floor ? `этаж: ${floor}` : null,
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/" className="text-blue-600 hover:underline">
        ← Каталог
      </Link>

      <h1 className="text-3xl font-semibold mt-4">{title}</h1>
      {subtitleParts.length > 0 && (
        <div className="text-neutral-600 mt-2 text-lg">
          {subtitleParts.join(" • ")}
        </div>
      )}
      {p.address && (
        <div className="text-neutral-700 mt-1 text-base">{p.address}</div>
      )}

      {/* Фото обложки (если есть) */}
      {p.cover_url && (
        <div className="mt-6 relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-neutral-100">
          <Image
            src={p.cover_url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 1280px) 100vw, 1280px"
            unoptimized
          />
        </div>
      )}

      {/* Краткие характеристики */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {area && (
          <div className="rounded-xl border p-4 bg-white dark:bg-neutral-900">
            <div className="text-sm text-neutral-500">Площадь</div>
            <div className="text-lg font-semibold mt-1">{area}</div>
          </div>
        )}
        {prices && (
          <div className="rounded-xl border p-4 bg-white dark:bg-neutral-900">
            <div className="text-sm text-neutral-500">Стоимость, ₽/м²</div>
            <div className="text-lg font-semibold mt-1">{prices}</div>
          </div>
        )}
      </div>
    </main>
  );
}
