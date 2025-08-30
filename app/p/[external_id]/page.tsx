import Link from "next/link";
import { getProperty, getPropertyPhotos } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { external_id: string };
}) {
  const id = decodeURIComponent(params.external_id);
  const p = await getProperty(id);
  if (!p) {
    return <main className="p-6">Объект не найден</main>;
    }

  const photos = await getPropertyPhotos(id);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <Link href="/" className="text-indigo-600 underline">
        ← Назад
      </Link>

      <h1 className="text-2xl font-semibold mt-4">
        {p.title ?? p.address ?? p.external_id}
      </h1>
      <div className="text-gray-600 mt-1">
        {[p.city, p.address].filter(Boolean).join(", ")}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl overflow-hidden border">
          <div
            className="relative w-full"
            style={{ aspectRatio: "4 / 3", background: "#f3f4f6" }}
          >
            {p.coverUrl ? (
              <img
                src={p.coverUrl}
                alt={p.title ?? p.address ?? p.external_id}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <div className="text-gray-600">Адрес</div>
            <div className="text-lg">{p.address ?? "—"}</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-gray-600">Город</div>
            <div className="text-lg">{p.city ?? "—"}</div>
          </div>
        </div>
      </div>

      {photos.length > 1 ? (
        <>
          <h2 className="text-xl font-semibold mt-10 mb-4">Фотографии</h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {photos.map((u, i) => (
              <div key={u} className="rounded-xl overflow-hidden border">
                <div
                  className="relative w-full"
                  style={{ aspectRatio: "4 / 3", background: "#f3f4f6" }}
                >
                  <img
                    src={u}
                    alt={`Фото ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}
