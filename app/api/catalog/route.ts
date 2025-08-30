// app/api/catalog/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  external_id: string;
  title: string | null;
  address: string | null;
  city_id: string | null; // Using city_id for filtering
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
  console.log("Building cover URL for externalId:", externalId);
  const tryPath = async (path: string): Promise<string | null> => {
    const { data } = supabase.storage.from("photos").getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  if (coverStoragePath && !coverStoragePath.startsWith("http")) {
    const direct = await tryPath(coverStoragePath);
    if (direct) return direct;
  }

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
  const city = url.searchParams.get('city')?.trim(); // We are passing city_id, not city_name
  console.log("Received city_id:", city);  // Log received city parameter

  let query = supabase.from('property_full_view').select('*') as any; // Using property_full_view instead of properties

  if (city) {
    console.log("Filtering by city_id:", city);  // Log filtering action
    query = query.filter('city_id', 'eq', city);  // Filtering by city_id
  }

  try {
    const { data, error } = await query;

    if (error) {
      console.error("Error in API query:", error);  // Log query error
      return new NextResponse('API Query Error', { status: 500 });
    }

    if (!data || data.length === 0) {
      console.log("No data found for the query.");
      return new NextResponse('No data found', { status: 404 });
    }

    console.log("Data retrieved:", data);  // Log the retrieved data

    const updatedData = await Promise.all(
      data.map(async (item: Row) => {
        const coverUrl = await buildCoverUrl(supabase, item.external_id, item.cover_storage_path);
        return { ...item, cover_url: coverUrl };
      })
    );

    return NextResponse.json({ items: updatedData });
  } catch (err) {
    console.error("Error in API processing:", err);  // Log any unexpected errors
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
