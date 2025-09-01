# Как включить фильтр по типу помещения (tip_pomescheniya) на главной

Фильтр работает **И** (AND) с фильтром по городу через query-параметр `type`.

## 1) UI: рядом с фильтром города

В `app/page.tsx`:
```ts
import TypeFilter from "@/components/TypeFilter";
import { fetchTypes } from "@/app/data";
```

Получите список типов и выведите селект рядом с городом:
```tsx
const types = await fetchTypes();

<div className="flex gap-3 items-center">
  <CityFilter cities={cities} />
  <TypeFilter options={types} />
</div>
```

## 2) Применить фильтр в запросе

Там, где формируется запрос к `domus_export` (совместно с city):
```ts
const city = searchParams?.city ?? "";
const type = searchParams?.type ?? "";

let q = sb().from("domus_export").select("*");

if (city) q = q.eq("city", city);
if (type) q = q.eq("tip_pomescheniya", type); // AND по типу
```

## 3) Источник данных для селекта типов

Добавьте в `app/data.ts`:
```ts
import { unstable_noStore as noStore } from "next/cache";

export async function fetchTypes(): Promise<string[]> {
  noStore(); // всегда свежо
  const client = sb();
  const { data } = await client
    .from("domus_export")
    .select("tip_pomescheniya")
    .not("tip_pomescheniya", "is", null);

  const set = new Set<string>();
  (data || []).forEach((r: any) => {
    const v = String(r.tip_pomescheniya ?? "").trim();
    if (v) set.add(v);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}
```

## 4) Кэширование

Чтобы изменения в БД были видны без редеплоя:
```ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
```
и используйте `noStore()` в загрузчиках данных.
