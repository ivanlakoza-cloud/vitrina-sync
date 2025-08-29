// lib/data.ts
import { SUPABASE_URL } from './supabase';
import { getCoverMapByExternalId } from './photos';

type PropertyRow = {
  id: number | string;
  external_id: string | number;
  title?: string | null;
  address?: string | null;
  city?: string | null;
  type?: string | null;
  floor?: string | number | null;
  // цены — если колонок нет, Supabase просто их не вернёт
  price20?: string | number | null;
  price50?: string | number | null;
  price100?: string | number | null;
  price400?: string | number | null;
  price700?: string | number | null;
  price1500?: string | number | null;
  is_public?: boolean | null;
};

const SB_HEADERS = {
  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string}`,
};

/** Читает публичные объекты из Supabase */
export async function getCatalog(): Promise<(PropertyRow & { coverUrl: string | null; price_text?: string })[]> {
  const qs = new URLSearchParams();
  // укажи здесь только те поля, что точно есть; лишние Supabase проигнорирует,
  // но для надёжности можно убрать те, которых точно нет
  qs.set(
    'select',
    [
      'id',
      'external_id',
      'title',
      'address',
      'city',
      'type',
      'floor',
      'price20',
      'price50',
      'price100',
      'price400',
      'price700',
      'price1500',
      'is_public',
    ].join(',')
  );
  // показываем только публичные
  qs.set('is_public', 'eq.true');
  // порядок можно не задавать, чтобы не ловить ошибку по несуществующей колонке created_at

  const url = `${SUPABASE_URL}/rest/v1/properties?${qs.toString()}`;
  const res = await fetch(url, { headers: SB_HEADERS, cache: 'no-store' });
  if (!res.ok) {
    // чтобы в логах было видно причину, если что-то с policies/названием таблицы
    const body = await res.text();
    throw new Error(`Supabase properties fetch failed: ${res.status} ${res.statusText} — ${body}`);
  }

  const items = (await res.json()) as PropertyRow[];

  // обложки по external_id: photos/id<external_id>/...
  const coverMap = await getCoverMapByExternalId(items.map((p) => ({ external_id: p.external_id })));

  // опционально сформируем многострочный текст цен (только существующие значения)
  const withCovers = items.map((p) => {
    const priceLines: string[] = [];
    if (p.price20 != null && p.price20 !== '') priceLines.push(`от 20: ${p.price20}`);
    if (p.price50 != null && p.price50 !== '') priceLines.push(`от 50: ${p.price50}`);
    if (p.price100 != null && p.price100 !== '') priceLines.push(`от 100: ${p.price100}`);
    if (p.price400 != null && p.price400 !== '') priceLines.push(`от 400: ${p.price400}`);
    if (p.price700 != null && p.price700 !== '') priceLines.push(`от 700: ${p.price700}`);
    if (p.price1500 != null && p.price1500 !== '') priceLines.push(`от 1500: ${p.price1500}`);

    return {
      ...p,
      coverUrl: coverMap.get(p.external_id) ?? null,
      price_text: priceLines.join('\n') || undefined,
    };
  });

  return withCovers;
}

/** Один объект по external_id (для страницы /p/[external_id]) */
export async function getProperty(external_id: string) {
  const list = await getCatalog();
  return list.find((p) => String(p.external_id) === String(external_id)) ?? null;
}
