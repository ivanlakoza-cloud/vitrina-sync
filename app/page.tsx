tsx
// app/page.tsx
import { headers } from "next/headers";

type Item = {
  external_id: string;
  title: string;           // e.g. "Кирово-Чепецк, Луначарского 6"
  address: string | null;
  city_name: string | null;
  type: string | null;
  total_area: number | null;
  floor: number | null;
  cover_url: string | null;
  line2?: string | null;   // tip_pomescheniya + "этаж N" | fallback к type
  prices?: string | null;  // "от 20 — … · от 50 — …" (может быть пустым)
};

type Catalog = { items?: Item[] };

function getBaseUrl(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchCatalog(): Promise<Item[]> {
  const base = getBaseUrl();
  const url = `${base}/api/catalog?v=3`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !ct.includes("application/json")) {
      // вернём пусто, чтобы страница не падала
      return [];
    }
    const data: Catalog = await res.json();
    return Array.isArray(data?.items) ? data.items! : [];
  } catch {
    return [];
  }
}

function Prices({ text }: { text?: string | null }) {
  if (!text) return null;
  const clean = String(text).trim();
  if (!clean) return null;
  return (
    <div className="text-xs text-muted-foreground mt-1">{clean}</div>
  );
}

function Card({ it }: { it: Item }) {
  const img = it.cover_url && it.cover_url.trim().length > 0 ? it.cover_url : null;

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 transition-colors shadow-sm overflow-hidden">
      <div className="aspect-[4/3] bg-zinc-800/60 flex items-center justify-center">
        {img ? (
          // Используем <img>, чтобы не требовать next/image конфигурацию
          <img
            src={img}
            alt={it.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm select-none">
            нет фото
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold leading-snug text-base">
          {it.title}
        </h3>

        <div className="text-sm text-zinc-300 mt-1">
          {it.line2 && it.line2.trim() ? it.line2 : (it.type || "")}
        </div>

        <Prices text={it.prices} />
      </div>
    </article>
  );
}

export default async function Page() {
  const items = await fetchCatalog();

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Объекты</h1>
        <p className="text-sm text-zinc-400 mt-1">Всего: {items.length}</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {items.map((it) => (
          <Card key={it.external_id} it={it} />
        ))}
      </section>
    </main>
  );
}
