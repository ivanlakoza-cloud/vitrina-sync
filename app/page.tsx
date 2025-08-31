// app/page.tsx
import { headers } from "next/headers";

type Item = {
  external_id: string;
  title: string;        // "Город, Адрес"
  address: string;
  city_name: string;
  type: string | null;
  total_area: number | null;
  floor: number | null;
  cover_url: string | null;
  line2?: string | null;   // tip_pomescheniya + этаж N  (или type)
  prices?: string | null;  // 'от 20 — N · от 50 — ...'
};

async function fetchCatalog(): Promise<{ items: Item[] }> {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "vitran.ru";
  const url = `${proto}://${host}/api/catalog?v=3`;

  const res = await fetch(url, {
    // кеш на минуту; страница остаётся быстрой
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    // не валимся — отдаём пустой список
    return { items: [] };
  }
  // API возвращает { items: [...] }
  return res.json();
}

export default async function Page() {
  const { items } = await fetchCatalog();

  return (
    <main className="wrap">
      <h1 className="h1">Объекты</h1>
      <div className="meta">Всего: {items.length}</div>

      <div className="grid">
        {items.map((it) => {
          const hasImg = Boolean(it.cover_url);
          const line2 = it.line2 ?? it.type ?? "";
          const line3 = it.prices ?? "";

          return (
            <article className="card" key={it.external_id}>
              <div className="imgBox">
                {hasImg ? (
                  // используем обычный <img>, чтобы не трогать next/image и конфиг доменов
                  <img src={it.cover_url as string} alt={it.title} />
                ) : (
                  <span>нет фото</span>
                )}
              </div>
              <div className="body">
                <h2 className="title">{it.title}</h2>
                {line2 && <div className="line2">{line2}</div>}
                {line3 && <div className="line3">{line3}</div>}
              </div>
            </article>
          );
        })}
      </div>

      {/* локальные стили без Tailwind/next-themes */}
      <style jsx>{`
        .wrap {
          max-width: 1280px;
          margin: 0 auto;
          padding: 24px 16px 40px;
          color: #e7e7e7;
        }
        .h1 {
          font-size: 32px;
          font-weight: 800;
          margin: 8px 0 6px;
        }
        .meta {
          color: #9aa0a6;
          margin-bottom: 16px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 16px;
        }
        @media (min-width: 640px) {
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 768px) {
          .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (min-width: 1024px) {
          .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        @media (min-width: 1280px) {
          .grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
        }
        .card {
          background: #0f1115;
          border: 1px solid #1c1f27;
          border-radius: 14px;
          overflow: hidden;
          transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
        }
        .card:hover {
          transform: translateY(-2px);
          border-color: #2a3140;
          box-shadow: 0 8px 24px rgba(0,0,0,.35);
        }
        .imgBox {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          background: #12151b;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 12px;
        }
        .imgBox img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .body {
          padding: 12px 14px 14px;
        }
        .title {
          margin: 0 0 6px;
          font-size: 16px;
          line-height: 1.35;
          font-weight: 700;
          color: #f3f4f6;
        }
        .line2, .line3 {
          font-size: 13px;
          color: #b9c0cc;
        }
        .line3 { color: #93c5fd; } /* цены — чуть выделим */
      `}</style>
    </main>
  );
}
