import Image from "next/image";

type Item = {
  external_id: string;
  title: string;
  line2?: string | null;
  prices?: string | null;
  cover_url?: string | null;
};

function getBaseUrl() {
  // прод: NEXT_PUBLIC_SITE_URL=https://vitran.ru
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default async function Page() {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/catalog?v=3`, { cache: "no-store" });
  const data = await res.json();

  const items: Item[] = data?.items ?? [];

  return (
    <main className="px-4 py-6 max-w-[1600px] mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Каталог</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {items.map((it) => (
          <article key={it.external_id} className="rounded-xl overflow-hidden border border-gray-200">
            <div className="relative aspect-[4/3] bg-gray-100">
              {it.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.cover_url}
                  alt={it.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  фото скоро
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="text-sm font-semibold line-clamp-2">{it.title}</h3>
              {it.line2 ? <p className="text-xs text-gray-600 mt-1">{it.line2}</p> : null}
              {it.prices ? <p className="text-xs text-gray-800 mt-1">{it.prices}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
