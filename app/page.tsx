import Link from 'next/link';
import Script from 'next/script';
import { getCatalog } from '../lib/data';

type Search = { city?: string };

export default async function Page({
  searchParams,
}: {
  searchParams: Search;
}) {
  const currentCity = searchParams?.city ?? '';

  // Универсально поддерживаем оба варианта getCatalog:
  // 1) Array<PropertyRow>
  // 2) { items: PropertyRow[], cities?: string[] }
  let result: any;
  try {
    result = await (getCatalog as any)(); // без аргументов — как у тебя сейчас
  } catch {
    result = [];
  }

  const allItems: any[] = Array.isArray(result) ? result : result?.items ?? [];

  // Соберём список городов:
  // - если API его вернул — используем его
  // - иначе соберём из карточек, смотрим разные возможные поля
  const apiCities: string[] = Array.isArray(result) ? [] : result?.cities ?? [];
  const citySet = new Set<string>(apiCities);

  for (const it of allItems) {
    const name =
      it?.city ??
      it?.city_name ??
      it?.city_title ??
      it?.cityTitle ??
      it?.city?.name ??
      it?.city?.title;
    if (name) citySet.add(String(name));
  }

  const cityOptions = Array.from(citySet).sort((a, b) => a.localeCompare(b, 'ru'));

  // Фильтрация карточек по выбранному городу (с учётом того же набора полей)
  const norm = (v: any) => String(v ?? '').toLowerCase();
  const items =
    currentCity && currentCity.trim()
      ? allItems.filter((p) => {
          const cand =
            p?.city ??
            p?.city_name ??
            p?.city_title ??
            p?.cityTitle ??
            p?.city?.name ??
            p?.city?.title;
          return norm(cand) === norm(currentCity);
        })
      : allItems;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Каталог</h1>

      {/* Фильтр — без кнопки, автоприменение через inline-скрипт */}
      <div className="mb-6 flex items-center gap-2">
        <label htmlFor="city-select">Город:</label>
        <select
          id="city-select"
          defaultValue={currentCity}
          className="border rounded px-2 py-1"
        >
          <option value="">Все города</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Автоприменение фильтра: меняем query ?city=... сразу после выбора */}
      <Script id="city-autosubmit">{`
        (function(){
          var sel = document.getElementById('city-select');
          if(!sel) return;
          sel.addEventListener('change', function(){
            var url = new URL(window.location.href);
            var v = sel.value;
            if (v) url.searchParams.set('city', v);
            else url.searchParams.delete('city');
            // Перенаправляем (SSR/SSG дружелюбно)
            window.location.href = url.toString();
          });
        })();
      `}</Script>

      {/* отступ */}
      <div style={{ height: 16 }} />

      {/* Сетка карточек: 6 в ряд на широких экранах */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        {items.map((p: any) => {
          const href = `/p/${encodeURIComponent(p.external_id ?? p.id ?? '')}`;
          const cover =
            p.coverUrl ||
            p.photo ||
            p.preview_url ||
            p.cover ||
            p.image_url ||
            null;

          // Город в карточке — та же логика нормализации
          const cityDisplay =
            p?.city ??
            p?.city_name ??
            p?.city_title ??
            p?.cityTitle ??
            p?.city?.name ??
            p?.city?.title ??
            '—';

          return (
            <div
              key={p.id ?? p.external_id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              <Link href={href} style={{ display: 'block' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '4 / 3',
                    background: '#f3f4f6',
                  }}
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={p.title ?? p.address ?? p.external_id}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      loading="lazy"
                    />
                  ) : null}
                </div>
              </Link>

              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {cityDisplay}
                </div>

                <Link
                  href={href}
                  style={{
                    display: 'block',
                    color: '#4f46e5',
                    textDecoration: 'underline',
                    marginBottom: 4,
                  }}
                >
                  {p.title ?? p.address ?? p.external_id}
                </Link>

                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {p.address ? `${p.address}` : null}
                  {p.type ? ` · Тип: ${p.type}` : null}
                  {p.floor ? ` · Этаж: ${p.floor}` : null}
                </div>

                {p.price_text ? (
                  <div
                    style={{ fontSize: 12, marginTop: 8, whiteSpace: 'pre-line' }}
                  >
                    {p.price_text}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
