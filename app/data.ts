// Server utilities for Vitrina (drop-in, r3)
// Использует прямой импорт из "@supabase/supabase-js", без "@/lib/supabase"
import { createClient as createSbClient } from "@supabase/supabase-js";
import type { DomusRow } from "@/lib/fields";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";
const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";

function client() {
  if (!URL || !KEY) throw new Error("Supabase env is missing");
  return createSbClient(URL, KEY);
}

/** Уникальные города по алфавиту, без null и без служебного "Все города" */
export async function fetchCities(): Promise<string[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from(TABLE)
    .select("city")
    .order("city", { ascending: true });

  if (error) {
    console.error("fetchCities error:", error);
    return [];
  }

  const uniq = new Set<string>();
  for (const row of (data || []) as any[]) {
    const v = row?.city;
    if (typeof v === "string") {
      const s = v.trim();
      if (s && s !== "Все города") uniq.add(s);
    }
  }
  return Array.from(uniq).sort((a, b) => a.localeCompare(b));
}

/**
 * Список объектов для главной.
 * Возвращаем ПЛОСКИЕ записи из таблицы (DomusRow[]),
 * чтобы существующий рендер в app/page.tsx не ломался (используются rec.id_obekta / rec.external_id / rec.id).
 */
export async function fetchList(city?: string): Promise<DomusRow[]> {
  const supabase = client();
  let query = supabase.from(TABLE).select("*");

  if (city && city.trim()) {
    query = query.eq("city", city.trim());
  }

  const { data, error } = await query.order("id", { ascending: true });
  if (error) {
    console.error("fetchList error:", error);
    return [];
  }
  return (data || []) as unknown as DomusRow[];
}

/** Подробно: поиск по id_obekta | external_id | id */
export async function fetchByExternalId(slug: string): Promise<DomusRow | null> {
  const supabase = client();
  const s = String(slug);

  for (const col of ["id_obekta", "external_id", "id"]) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq(col, s)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as DomusRow;
    }
  }
  return null;
}

/** Все публичные ссылки на фото объекта (из бакета Supabase Storage). */
export async function getGallery(id: string): Promise<string[]> {
  const supabase = client();
  const prefix = `${id}`; // photos/<id>/*

  const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).list(prefix, {
    limit: 200,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    console.error("getGallery error:", error);
    return [];
  }

  const files = (data || []).filter((f) => f && !f.name.startsWith("."));
  const urls = files.map((f) => {
    const { data: pub } = supabase.storage
      .from(PHOTOS_BUCKET)
      .getPublicUrl(`${prefix}/${f.name}`);
    return pub.publicUrl;
  });
  return urls;
}

/** Первое фото или заглушка. */
export async function getFirstPhoto(id: string): Promise<string> {
  const pics = await getGallery(id);
  if (pics.length > 0) return pics[0];
  return "/placeholder.svg";
}
