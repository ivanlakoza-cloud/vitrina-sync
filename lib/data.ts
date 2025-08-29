import { getCoverMapByExternalId } from './photos';

// ...
export async function getCatalog(/* твои параметры */) {
  const items = await fetchPropertiesFromDBOrDirectus(/* как у тебя уже сделано */);

  // ДОБАВКА: подтянем обложки из Storage по external_id
  const coverMap = await getCoverMapByExternalId(items.map((p: any) => ({ external_id: p.external_id })));
  const withCovers = items.map((p: any) => ({ ...p, coverUrl: coverMap.get(p.external_id) ?? null }));

  return withCovers;
}
// Вернём один объект по external_id (ищем среди каталога)
export async function getProperty(external_id: string) {
  const list = await getCatalog(); // твоя функция, которая уже собирает карточки
  return list.find(
    (p: any) => String(p.external_id) === String(external_id)
  ) ?? null;
}
