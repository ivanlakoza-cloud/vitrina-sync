import { headers } from "next/headers";

type Item = {
  external_id: string;
  title: string;
  address: string;
  city_name?: string | null;
  type?: string | null;
  floor?: number | string | null;
  cover_url?: string | null;
  line2?: string | null;
  prices?: string | null;
};

async function loadCatalog(): Promise<Item[]> {
  const hdrs = headers();
  const host = hdrs.get("host") || "";
  const proto = hdrs.get("x-forwarded-proto") || "https";
  const base = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
  const url = `${base}/api/catalog?v=3`;

  try {
    const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
    const ct = res.headers.get("content-type") || "";
    if (!res.ok) {
      // Try to read text to aid debugging
      const txt = await res.text().catch(() => "");
      throw new Error(`API error ${res.status} ${res.statusText} :: ${txt.slice(0, 200)}`);
    }
    if (!ct.includes("application/json")) {
      const txt = await res.text();
      throw new Error(`API returned non-JSON. First bytes: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    return (data?.items ?? []) as Item[];
  } catch (e) {
    console.error("Failed to fetch /api/catalog", e);
    return [];
  }
}

function Prices({ value }: { value?: string | null }) {
  if (!value) return null;
  const txt = String(value).trim();
  if (!txt) return null;
  return <p className="text-sm text-neutral-600">{txt}</p>;
}

function Card({ it }: { it: Item }) {
  const title = it.title || [it.city_name, it.address].filter(Boolean).join(", ");
  const line2 = it.line2 || it.type || "";
  const prices = it.prices || "";
  const img = it.cover_url || "";
  const hasImg = Boolean(img);

  return (
    <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-[4/3] bg-neutral-100 overflow-hidden">
        {hasImg ? (
          // using <img> to avoid Next Image domain config issues
          <img src={img} alt={title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-100" />
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-semibold line-clamp-2">{title}</h3>
        {line2 ? <p className="text-xs text-neutral-700 line-clamp-1">{line2}</p> : null}
        <Prices value={prices} />
      </div>
    </div>
  );
}

export default async function Page() {
  const items = await loadCatalog();

  return (
    <main className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold">Объекты</h1>
        <p className="text-sm text-neutral-600">Всего: {items.length}</p>
      </div>

      {/* 6 плиток в ряд на xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {items.map((it) => (
          <Card key={it.external_id} it={it} />
        ))}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 text-sm text-red-600">
          Данные каталога не получены. Попробуйте обновить страницу. Если проблема повторяется — проверьте
          доступность <code className="px-1 py-0.5 bg-neutral-100 rounded">/api/catalog?v=3</code>.
        </div>
      ) : null}
    </main>
  );
}
