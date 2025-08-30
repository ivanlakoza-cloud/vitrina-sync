import Link from 'next/link';
import CityFilter from '@/components/CityFilter';
import { getCatalog } from '@/lib/data';

type Search = { city?: string };

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Search;
}) {
  const currentCity = searchParams?.city ?? '';

  // Поддерживаем обе формы ответа getCatalog():
  // 1) Array<PropertyRow>
  // 2) { items: PropertyRow[], cities: string[] }
  let result: any;
  try {
    result = await (getCatalog as any)();
  } catch {
    result = [];
  }

  const allItems: any[] = Array.isArray(result) ? result : result?.items ?? [];

  // Список городов: если API не вернул, соберём из данных
  const citiesFromApi: string[] = Array.isArray(result) ? [] : result?.cities ?? [];
  const citySet = new Set<string>(citiesFromApi);
  for (const it of allItems) if (it?.city) citySet.add(String(it.city));
  const cityOptions = Array.from(citySet).sort((a, b) => a.localeCompare(b, 'ru'));

  // Фильтрация по выбранному городу
  const items = currentCity
    ? allItems.filter((p) => (p?.city ?? '').toLowerCase() === currentCity.toLowerCase())
    : allItems;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const fmt = new Intl.NumberFormat('ru-RU');

  return (
    <main className="p-6">
      {/* Заголовок "Каталог" удалён */}

      {/* Фильтр без кнопки — применяется автоматически */}
      <CityFilter currentCity={currentCity} options={cityOptions} />

      {/* Отступ под фильтром */}
      <div style={{ height: 16 }} />

      {/* Сетка карточек */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        {items.map((p: any) => {
          const id = p.external_id ?? p.id ?? '';
          const href = `/p/${encodeURIComponent(id)}`;

          // Обложка: из API, внешняя ссылка или из Storage
          const storageCover = p.cover_storage_path && supabaseUrl
            ? `${supabaseUrl}/storage/v1/object/public/photos/${encodeURIComponent(p.cover_storage_path)}`
            : null;
          const cover =
            p.coverUrl ||
            p.photo ||
            p.preview_url ||
            p.cover_ext_url ||
            storageCover ||
            null;

          // Кликабельная строка "Город, Адрес"
          const city = p.city ?? '—';
          const address = p.address ?? '';
          const cityAddress = [city, address].filter(Boolean).join(', ');

          // Тип и этаж (поддерживаем разные имена полей)
          const type = p.type ?? p.tip_pomescheniya ?? p.tip ?? null;
          const floor = p.floor ?? p.etazh ?? null;

          // Диапазон цен по доступным числовым значениям (руб/м²)
          const priceKeys = [
            'price_per_m2_20',
            'price_per_m2_50',
            'price_per_m2_100',
            'price_per_m2_400',
            'price_per_m2_700',
            'price_per_m2_1500',
          ];
          const numbers: number[] = [];
          for (const k of priceKeys) {
            const v = Number(p?.[k]);
            if (isFinite(v) && v > 0) numbers.push(v);
          }
          let priceText: string | null = null;
          if (numbers.length === 1) {
            priceText = `Цена: ${fmt.format(numbers[0])} ₽/м²`;
          } else if (numbers.length > 1) {
            const min = Math.min(...numbers);
            const max = Math.max(...numbers);
            priceText = `Цена: ${fmt.format(min)}–${fmt.format(max)} ₽/м²`;
          }

          return (
            <div
              key={id}
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt={cityAddress || id}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : null}
                </div>
              </Link>

              <div style={{ padding: 12 }}>
                {/* Кликабельная строка "Город, Адрес" */}
                <Link
                  href={href}
                  style={{ display: 'block', color: '#111827', textDecoration: 'underline', fontWeight: 600, marginBottom: 6, wordBreak: 'break-word' }}
                >
                  {cityAddress || id}
                </Link>

                {/* Тип + Этаж */}
                {(type || floor) ? (
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                    {type ? `Тип: ${type}` : null}
                    {type && floor ? ' · ' : null}
                    {floor ? `Этаж: ${floor}` : null}
                  </div>
                ) : null}

                {/* Диапазон цен */}
                {priceText ? <div style={{ fontSize: 12 }}>{priceText}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
