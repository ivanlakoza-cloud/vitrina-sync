# Patch contents

Changed file(s):

- `app/data.ts`
  - `fetchCities()` — убирает `NULL` и `Все города` из БД, возвращает уникальные города по алфавиту.
  - `fetchList(city?)` — список карточек с нормализованным id (`idN`) и первым фото (никогда не `null`).
  - `fetchByExternalId(slug)` — аккуратно ищет по `id_obekta`, а если не найдено — по числовому `id`; никогда не кидает исключение при not-found (возвращает `null`).
  - `getGallery(id)` и `getFirstPhoto(id)` — загрузка фото из бакета `photos` (можно сменить через `NEXT_PUBLIC_PHOTOS_BUCKET`).

> Если страница подробно всё ещё отдаёт 500, добавьте в `app/o/[external_id]/page.tsx` проверку:
>
> ```ts
> import { notFound } from "next/navigation";
> // ...
> const rec = await fetchByExternalId(params.external_id);
> if (!rec) notFound(); // корректный 404
> ```
>
> Также убедитесь, что `NEXT_PUBLIC_DOMUS_TABLE` выставлен (по умолчанию — `domus_export`).

