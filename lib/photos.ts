import { supabase, SUPABASE_URL, BUCKET } from './supabase';

const IMG_RE = /\.(jpg|jpeg|png|webp|gif)$/i;
const STORAGE_PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public`;

/** строим публичный URL из строки в записи таблицы photos */
export function photoUrl(row: any): string | null {
  // приоритет по здоровому смыслу — бери то, что уже готовое
  if (row.external_url) return row.external_url;
  if (row.public_path) return `${STORAGE_PUBLIC_BASE}/${row.public_path}`;
  if (row.storage_path) return `${STORAGE_PUBLIC_BASE}/${row.storage_path}`;

  // иногда встречаются: y_root_public_url + y_path
  if (row.y_root_public_url && row.y_path) {
    return `${row.y_root_public_url.replace(/\/$/, '')}/${row.y_path.replace(/^\//, '')}`;
  }
  return null;
}

/** batched REST-запрос к таблице photos (по множеству property_id) */
async function firstPhotosFromTable(propertyIds: (number|string)[]) {
  const map = new Map<number|string, string>(); // property_id -> url
  if (!propertyIds.length) return map;

  // делим по 50 id на запрос
  const chunks: (number|string)[][] = [];
  for (let i = 0; i < propertyIds.length; i += 50) chunks.push(propertyIds.slice(i, i + 50));

  for (const part of chunks) {
    const search = new URLSearchParams();
    // вытягиваем сразу то, что может пригодиться для URL
    search.set('select', 'property_id,external_url,public_path,storage_path,y_root_public_url,y_path,created_at,sort_order');
    search.set('property_id', `in.(${part.join(',')})`);
    // сначала по property_id, затем по sort_order/created_at — бери «первую»
    search.set('order', 'property_id.asc,sort_order.asc,created_at.asc');

    const res = await fetch(`${SUPABASE_URL}/rest/v1/photos?${search.toString()}`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) continue;
    const rows: any[] = await res.json();

    for (const r of rows) {
      if (!map.has(r.property_id)) {
        const url = photoUrl(r);
        if (url) map.set(r.property_id, url);
      }
    }
  }

  return map;
}

/** папка в бакете: id{ID} */
function folderFor(propertyId: number|string) {
  return `id${propertyId}`;
}

/** первая картинка из бакета (fallback, если в таблице ничего не нашлось) */
async function coverFromBucket(propertyId: number|string) {
  const folder = folderFor(propertyId);
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error || !data?.length) return null;

  const file = data.find(f => IMG_RE.test(f.name));
  if (!file) return null;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${file.name}`);
  return pub.publicUrl ?? null;
}

/** публичные URL для обложек по множеству id */
export async function getCoverMap(propertyIds: (number|string)[]) {
  const map = await firstPhotosFromTable(propertyIds);

  // для тех, кого нет в таблице — берём из бакета
  const missing = propertyIds.filter(id => !map.has(id));
  await Promise.all(
    missing.map(async id => {
      const url = await coverFromBucket(id);
      if (url) map.set(id, url);
    })
  );

  return map; // Map<id, url>
}

/** галерея для «подробно»: сначала все записи из таблицы, потом бакет */
export async function getGalleryUrls(propertyId: number|string) {
  // 1) из таблицы
  const search = new URLSearchParams();
  search.set('select', 'external_url,public_path,storage_path,y_root_public_url,y_path,created_at,sort_order');
  search.set('property_id', `eq.${propertyId}`);
  search.set('order', 'sort_order.asc,created_at.asc');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/photos?${search.toString()}`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
    cache: 'no-store',
  });

  const urls: string[] = [];
  if (res.ok) {
    const rows: any[] = await res.json();
    for (const r of rows) {
      const url = photoUrl(r);
      if (url) urls.push(url);
    }
  }

  // 2) если вдруг в таблице пусто — подхватываем из бакета
  if (!urls.length) {
    const folder = folderFor(propertyId);
    const { data } = await supabase.storage.from(BUCKET).list(folder, {
      sortBy: { column: 'name', order: 'asc' },
      limit: 1000,
    });
    for (const f of data || []) {
      if (IMG_RE.test(f.name)) {
        urls.push(
          supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl
        );
      }
    }
  }

  return urls;
}
