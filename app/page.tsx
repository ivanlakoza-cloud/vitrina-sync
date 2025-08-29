// app/page.tsx
import { getCatalog } from "@/lib/data";
import Script from "next/script";

export const dynamic = "force-dynamic";

type SearchParams = { city?: string };

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

export default async function Home({ searchParams }: { searchParams?: SearchParams }) {
  const city = (searchParams?.city ?? "").trim();
  const { items, cities } = await getCatalog({ city });

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "16px" }}>
      {/* локальные стили: сетка, карточки, шрифты */}
      <style>{`
        :root { --gap:16px; --radius:16px; --shadow:0 1px 2px rgba(0,0,0,.06); }
        .grid { display:grid; gap:var(--gap); grid-template-columns: repeat(1, minmax(0,1fr)); }
        @media (min-width:640px){ .grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (min-width:768px){ .grid { grid-template-columns: repeat(3, minmax(0,1fr)); } }
        @media (min-width:1280px){ .grid { grid-template-columns: repeat(6, minmax(0,1fr)); } }
        .card { border:1px solid #e5e7eb; border-radius:var(--radius); overflow:hidden; background:#fff; box-shadow:var(--shadow); }
        .img { display:block; width:100%; height:180px; object-fit:cover; background:#f3f4f6; }
        .body { padding:12px; font-size:16px; line-height:1.35; }
        .title { font-weight:600; color:#111827; text-decoration:none; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .line { color:#4b5563; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:4px; }
        .line-strong { color:#111827; font-weight:600; }
        .more { display:inline-block; margin-top:8px; color:#2563eb; text-decoration:none; }
        .more:hover, .title:hover { text-decoration:underline; }
        .filter { display:flex; align-items:center; gap:8px; margin-bottom:16px; position:relative; z-index:1000; }
        .select { font-size:16px; padding:6px 10px; border:1px solid #d1d5db; border-radius:8px; background:#fff; }
        .empty { color:#6b7280; font-size:16px; margin-top:16px; }
      `}</style>

      {/* Фильтр (без onChange в серверном компоненте) */}
      <div className="filter">
        <label htmlFor="city-select">Город:</label>
        <select id="city-select" name="city" defaultValue={city} className="select">
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* JS только для смены города */}
      <Script id="city-filter-change">{`
        (function(){
          var sel = document.getElementById('city-select');
          if(!sel) return;
          sel.addEventListener('change', function(e){
            e.stopPropagation(); // на всякий случай — чтобы клики не всплывали к карточкам
            var url = new URL(window.location.href);
            var v = sel.value;
            if (v) url.searchParams.set('city', v);
            else url.searchParams.delete('city');
            window.location.href = url.toString();
          }, { capture: true });
        })();
      `}</Script>

      {/* Сетка карточек: 1/2/3/6 колонок */}
      <div className="grid">
        {items.map((it) => {
          const href = `/p/${encodeURIComponent(it.external_id)}`;
          const title = [it.city, it.address].filter(Boolean).join(", ") || it.title || "Без адреса";
          const area = fmtArea(it.available_area ?? it.total_area);
          const line2 = [it.type ? `Тип: ${it.type}` : null, area ? `Площадь: ${area}` : null]
            .filter(Boolean).join(" · ");
          const prices = buildPrices(it);

          return (
            <article key={it.external_id} className="card">
              {/* изображение без клика, чтобы ничего не перекрывало фильтр */}
              {it.cover_url ? (
                <img src={it.cover_url} alt={title} className="img" />
              ) : (
                <div className="img" />
              )}

              <div className="body">
                {/* 1-я строка: Город, адрес — жирная, ссылкой */}
                <a href={href} className="title" title={title}>{title}</a>

                {/* 2-я строка: тип, площадь */}
                {line2 && <div className="line">{line2}</div>}

                {/* 3-я строка: цены (только заполненные диапазоны) */}
                {prices && <div className="line line-strong">{prices}</div>}

                {/* CTA */}
                <a href={href} className="more">Подробнее →</a>
              </div>
            </article>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="empty">Нет объектов по выбранному фильтру.</div>
      )}
    </main>
  );
}
