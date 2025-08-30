// app/api/catalog/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  cover_storage_path: string | null;
  cover_ext_url: string | null;
  updated_at: string | null;
  tip_pomescheniya?: string | null;
  etazh?: string | number | null;
  price_per_m2_20?: number | null;
  price_per_m2_50?: number | null;
  price_per_m2_100?: number | null;
  price_per_m2_400?: number | null;
  price_per_m2_700?: number | null;
  price_per_m2_1500?: number | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// build cover URL strictly from Supabase Storage (bucket 'photos')
async function buildCoverUrl(supabase: any, externalId: string, coverStoragePath: string | null): Promise<string | null> {
  // 1) If DB has exact path inside bucket, try it
  const tryPath = async (path: string): Promise<string | null> => {
    const { data } = supabase.storage.from("photos").getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  if (coverStoragePath && !coverStoragePath.startsWith("http")) {
    const direct = await tryPath(coverStoragePath);
    if (direct) return direct;
  }

  // 2) Probe folder "<externalId>/" and take the first file
  const folder = `${externalId}/`;
  const { data: files, error } = await supabase.storage.from("photos").list(folder, {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });
  if (!error && files && files.length > 0) {
    const first = files.find((f: any) => !f.name.startsWith(".")) || files[0];
    const fullPath = folder + first.name;
    const { data } = supabase.storage.from("photos").getPublicUrl(fullPath);
    return data?.publicUrl ?? null;
  }

  return null;
}

export const revalidate = 0; // always fresh

export async function GET(request: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const url = new URL(request.url);
  const city = url.searchParams.get('city')?.trim(); // получаем город из параметра URL

  // Формируем запрос с фильтрацией по городу, если он есть
  let query = supabase
    .from('properties')
    .select('*') as any; // Указали тип any, чтобы избежать ошибки компиляции

  if (city) {
    query = query.filter('city', 'eq', city); // фильтруем по городу
  }

  // Выполняем запрос и получаем данные
  const { data, error } = await query;

  if (error) {
    return NextResponse.error();
  }

  // Обрабатываем ссылки на изображения
  const updatedData = await Promise.all(
    data.map(async (item) => {
      const coverUrl = await buildCoverUrl(supabase, item.external_id, item.cover_storage_path);
      return { ...item, cover_url: coverUrl };
    })
  );

  return NextResponse.json({ items: updatedData });
}
