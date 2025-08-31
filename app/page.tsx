
export const revalidate = 0;

type Item = {
  external_id: string;
  cover_url: string | null;
  title: string;      // "Город, Адрес"
  subline: string;    // tip_pomescheniya + этаж / type
  prices_line: string; // "от 20 — N · от 50 — N · ..."
};

async function getData(): Promise<{ items: Item[]; cities: string[]; api_version: string; build_time: string }> {
  const base = typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    : "";
  const res = await fetch(`${base}/api/catalog?v=2`, { cache: "no-store" });

  if (!res.ok) throw new Error("Failed to load catalog");
  return res.json();
}

export default async function Home() {
  const data = await getData();
  const items = data.items || [];

  return (
    <div className="catalog-page">
      <div className="catalog-grid">
        {items.map((it) => (
          <article key={it.external_id} className="card">
            <img
              className="card__img"
              src={it.cover_url ?? "/placeholder.webp"}
              alt={it.title}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.webp"; }}
            />
            <div className="card__body">
              <h3 className="card__title">{it.title}</h3>
              <div className="muted">{it.subline}</div>
              {it.prices_line && (
                <div className="prices">
                  {it.prices_line.split(" · ").map((p, idx) => (
                    <span className="price-pill" key={idx}>{p}</span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
