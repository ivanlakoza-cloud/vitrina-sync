import React from "react";
import { headers } from "next/headers";

type Item = {
  external_id: string;
  title: string;
  address: string;
  city_name: string;
  type: string;
  total_area: number | null;
  floor: number | null;
  cover_url: string | null;
  line2: string;
  prices?: string | null;
};

export default async function HomePage() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "vitran.ru";
  const url = `${proto}://${host}/api/catalog?v=3`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return (
      <main>
        <div className="wrap">
          <h1>Объекты</h1>
          <div className="meta">Ошибка загрузки каталога</div>
          <pre style={{whiteSpace:"pre-wrap", opacity:.8}}>{String(res.status)} {res.statusText}</pre>
        </div>
      </main>
    );
  }
  const data = await res.json();
  const items: Item[] = data?.items ?? [];

  return (
    <main>
      <div className="wrap">
        <h1>Объекты</h1>
        <div className="meta">Всего: {items.length}</div>

        <ul className="grid">
          {items.map((it) => (
            <li key={it.external_id} className="card">
              <a className="cardLink" href="#">
                <div className="cover">
                  {it.cover_url ? (
                    <img src={it.cover_url} alt={it.title} />
                  ) : (
                    <div className="noimg">нет фото</div>
                  )}
                </div>
                <div className="body">
                  <div className="title">{it.title}</div>
                  {it.line2 && <div className="line2">{it.line2}</div>}
                  {it.prices && it.prices.trim() !== "" && (
                    <div className="prices">{it.prices}</div>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        :root { color-scheme: dark; }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .wrap { max-width: 1400px; padding: 24px; margin: 0 auto; }
        h1 { font-size: 32px; margin: 0 0 12px; }
        .meta { opacity: .7; margin-bottom: 16px; }
        .grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 16px;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        @media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 900px) { .grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1150px) { .grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1500px) { .grid { grid-template-columns: repeat(6, 1fr); } }

        .card { background: #111; border: 1px solid #222; border-radius: 12px; overflow: hidden; }
        .cardLink { color: inherit; text-decoration: none; display: block; }
        .cover { width: 100%; aspect-ratio: 16/10; background: #202020; }
        .cover img { width:100%; height:100%; object-fit: cover; display: block; }
        .noimg { display:flex; align-items:center; justify-content:center; height:100%; color:#888; font-size:14px; }
        .body { padding: 12px; }
        .title { font-weight: 700; margin-bottom: 6px; font-size: 18px; line-height: 1.2; }
        .line2 { opacity:.9; font-size:14px; margin-bottom:6px; }
        .prices { font-size: 13px; opacity:.9; }
      `}</style>
    </main>
  );
}
