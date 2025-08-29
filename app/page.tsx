import CityFilter from './components/CityFilter';
import { getCatalog } from '@/lib/data';

export default async function Page({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  // 1) Берём весь каталог без аргументов
  const items = await getCatalog();

  // 2) Считаем список городов для селекта
  const cities = Array.from(
    new Set(
      (items as any[]).map((it) => it.city).filter(Boolean)
    )
  )
    .sort()
    .map((name) => ({ id: String(name), name: String(name) }));

  // 3) Фильтруем по выбранному городу
  const list = searchParams.city
    ? (items as any[]).filter(
        (it) => String(it.city) === String(searchParams.city)
      )
    : (items as any[]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Каталог</h1>

      <CityFilter cities={cities} current={searchParams.city} />

      {/* дальше рендерь именно `list`, а не `items` */}
      {/* ... */}
    </main>
  );
}
