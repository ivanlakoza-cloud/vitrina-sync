// lib/data.ts
import { SUPABASE_URL } from './supabase';
import { getCoverMapByExternalId } from './photos';

type UnitRow = {
  id: number | string;
  name?: string | null;
  area_m2?: number | null;
  available?: boolean | null;
  property_id?: number | string | null;
};

export type PropertyRow = {
  id: number | string;
  external_id: string | number;
  title?: string | null;
  address?: string | null;
  city?: string | null;
  type?: string | null;
  floor?: string | number | null;
  price20?: string | number | null;
  price50?: string | number | null;
  price100?: string | number | null;
  price400?: string | number | null;
  price700?: string | number | null;
  price1500?: string | number | null;
  is_public?: boolean | null;
  coverUrl?: string | null;
  price_text?: string;
  units?: UnitRow[];
};

const SB_HEADERS = {
  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string}`,
};

/** Читает публичные объекты из Supabase */
export async function getCatalog(): Promise<(PropertyRow)[]> {
  const qs = new URLSearchParams();
  qs.set('select', '*'); // универсально
  // если в схеме есть is_public — фильтруем
  qs.set('is_public', 'eq.true');

  const url = `${SUPABASE_URL}/rest/v1/properties?${qs.toString()}`;
  const res = await fetch(url, { headers: SB_HEADERS, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase properties fetch failed: ${res.status} ${res.statusText} — ${body}`);
  }

  const items = (await res.json()) as PropertyRow[];

  const coverMap = await getCoverMapByExternalId(items.map((p) => ({ external_id: p.external_id })));

  const withCovers = items.map((p) => {
    const priceLines: string[] = [];
    if ((p as any).price20 != null && (p as any).price20 !== '') priceLines.push(`от 20: ${(p as any).price20}`);
    if ((p as any).price50 != null && (p as any).price50 !== '') priceLines.push(`от 50: ${(p as any).price50}`);
    if ((p as any).price100 != null && (p as any).price100 !== '') priceLines.push(`от 100: ${(p as any).price100}`);
    if ((p as any).price400 != null && (p as any).price400 !== '') priceLines.push(`от 400: ${(p as any).price400}`);
    if ((p as any).price700 != null && (p as any).price700 !== '') priceLines.push(`от 700: ${(p as any).price700}`);
    if ((p as any).price1500 != null && (p as any).price1500 !== '') priceLines.push(`от 1500: ${(p as any).price1500}`);

    return {
      ...p,
      coverUrl: coverMap.get(p.external_id) ?? null,
      price_text: priceLines.join('\n') || undefined,
    };
  });

  return withCovers;
}

async function fetchUnitsForProperty(propertyId: string | number): Promise<UnitRow[]> {
  const qs = new URLSearchParams();
  qs.set('select', '*');
  qs.set('property_id', `eq.${propertyId}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/units?${qs.toString()}`, {
    headers: SB_HEADERS,
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return (await res.json()) as UnitRow[];
}

/** Один объект по external_id (для страницы /p/[external_id]) */
export async function getProperty(external_id: string) {
  const list = await getCatalog();
  const p = list.find((x) => String(x.external_id) === String(external_id));
  if (!p) return null;

  const units = await fetchUnitsForProperty(p.id);
  return { ...p, units };
}
