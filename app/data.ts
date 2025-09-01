// Server data helpers
import { unstable_noStore as noStore } from "next/cache";
import { createClient as createSbClient } from "@supabase/supabase-js";
import type { FieldOrder } from "@/lib/fields";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";
const BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";

function sb() { return createSbClient(URL, KEY); }

function cityKey(r: any): string {
  return String(r?.city ?? r?.City ?? r?.["Город"] ?? "").trim();
}
function normCity(s: string): string {
  return String(s || "").trim().toLowerCase();
}
function formatAddress(r: any): string {
  const city = cityKey(r);
  const addr = String(r?.address ?? r?.adres_avito ?? "").trim();
  if (city && addr) return `${city}, ${addr}`;
  return addr || city || "";
}

// ---------- Home page helpers ----------

/** Уникальные города из City/city/"Город" (безопасно, без падений). */
export async function fetchCities(): Promise<string[]> {
  noStore();
  const client = sb();
  const set = new Set<string>();

  const trySel = async (sel: string, field: string) => {
    try {
      const { data } = await client.from(TABLE).select(sel).limit(5000);
      (data || []).forEach((r: any) => {
        const v = String(r?.[field] ?? "").trim();
        if (v) set.add(v);
      });
    } catch {}
  };
  await trySel("City", "City");
  await trySel("city", "city");
  await trySel('"Город"', "Город");

  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

/** Типы помещений (уникальные). */
export async function fetchTypes(): Promise<string[]> {
  noStore();
  const client = sb();
  const { data } = await client
    .from(TABLE)
    .select("tip_pomescheniya")
    .not("tip_pomescheniya", "is", null)
    .limit(5000);
  const set = new Set<string>();
  (data || []).forEach((r: any) => {
    const v = String(r?.tip_pomescheniya ?? "").trim();
    if (v) set.add(v);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

/** Карточки для главной. Фильтр по type — на БД. Фильтр по city — на сервере, без кейса/пробелов. */
export async function fetchList(city?: string, type?: string): Promise<any[]> {
  noStore();
  const client = sb();
  let q = client.from(TABLE).select("*").order("id", { ascending: true }).limit(200);
  if ((type ?? "").trim()) q = q.eq("tip_pomescheniya", type);
  const { data } = await q;
  let rows = (data || []) as any[];

  const wanted = normCity(city ?? "");
  if (wanted && wanted !== normCity("Все города")) {
    rows = rows.filter((r) => normCity(cityKey(r)) === wanted);
  }

  // Приводим address к формату "Город, Адрес" (или только одно из них)
  rows = rows.map((r) => ({ ...r, address: formatAddress(r) }));

  return rows;
}

// ---------- Detail page helpers ----------

/** Порядок и русские названия полей. */
export async function fetchFieldOrder(): Promise<Record<string, FieldOrder>> {
  noStore();
  const client = sb();
  const { data } = await client
    .from("domus_field_order_view")
    .select("*")
    .order("sort_order", { ascending: true });
  const dict: Record<string, FieldOrder> = {};
  (data || []).forEach((r: any) => {
    dict[r.column_name] = {
      display_name_ru: r.display_name_ru,
      sort_order: r.sort_order,
      visible: typeof r.visible === "boolean" ? r.visible : true,
    };
  });
  return dict;
}

export async function fetchByExternalId(external_id: string): Promise<any | null> {
  noStore();
  const client = sb();
  const { data } = await client.from(TABLE).select("*").eq("external_id", external_id).maybeSingle();
  return data ?? null;
}

export async function getGallery(external_id: string): Promise<string[]> {
  noStore();
  const client = sb();
  const prefix = external_id.endsWith("/") ? external_id : `${external_id}/`;
  const { data, error } = await client.storage.from(BUCKET).list(prefix, { limit: 200, offset: 0 });
  if (error || !data) return [];
  const urls: string[] = [];
  for (const f of data) {
    if (f.name.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)) {
      const pub = client.storage.from(BUCKET).getPublicUrl(prefix + f.name);
      urls.push(pub.data.publicUrl);
    }
  }
  return urls;
}

export async function getFirstPhoto(external_id: string): Promise<string | null> {
  const photos = await getGallery(external_id);
  return photos[0] || null;
}
