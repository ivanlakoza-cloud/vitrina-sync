import { supabase, BUCKET } from './supabase';

const IMG_RE = /\.(jpe?g|png|webp|gif)$/i;

// Папка формируется из external_id: "id<external_id>"
function folderForExternalId(external_id: string | number) {
  const id = String(external_id).replace(/^id/i, ''); // на входе может быть "30" или "id30"
  return `id${id}`;
}

function publicUrl(key: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl ?? null;
}

/** Первая картинка для карточки на главной */
export async function getCoverMapByExternalId(items: Array<{ external_id: string | number }>) {
  const map = new Map<string | number, string | null>();
  // Немного ограничим параллелизм, чтобы не бомбить сторедж
  const poolSize = 10;
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const cur = items[i++];
      const folder = folderForExternalId(cur.external_id);

      const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
        sortBy: { column: 'name', order: 'asc' }, // имена у тебя детерминированные (img_<md5>.jpg)
        limit: 1000,
      });

      if (error || !data?.length) {
        map.set(cur.external_id, null);
        continue;
      }
      const first = data.find(f => IMG_RE.test(f.name));
      map.set(cur.external_id, first ? publicUrl(`${folder}/${first.name}`) : null);
    }
  }

  await Promise.all(Array.from({ length: Math.min(poolSize, items.length) }, worker));
  return map; // Map<external_id, coverUrl>
}

/** Полная галерея для страницы проекта */
export async function getGalleryUrlsByExternalId(external_id: string | number) {
  const folder = folderForExternalId(external_id);
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    sortBy: { column: 'name', order: 'asc' },
    limit: 1000,
  });
  if (error || !data?.length) return [];
  return data.filter(f => IMG_RE.test(f.name)).map(f => publicUrl(`${folder}/${f.name}`)).filter(Boolean) as string[];
}
