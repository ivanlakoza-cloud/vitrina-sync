// app/api/catalog/route.ts
'use client';
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Property = {
  external_id: string;
  title: string;
  address: string;
  city_name: string;
  cover_storage_path: string;
  floor: string | number;
  price_min: number;
  price_max: number;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function buildCoverUrl(p: Property): Promise<string | null> {
  if (p.cover_storage_path) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const path = p.cover_storage_path.replace(/^\/?photos\//, "");
    return `${base}/storage/v1/object/public/photos/${path}`;
  }
  return p.cover_ext_url || null;
}

export async function GET(request: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const url = new URL(request.url);
  const city = url.searchParams.get('city')?.trim(); 

  let query = supabase.from('property_full_view').select('*');

  if (city) {
    query = query.filter('city_name', 'eq', city); 
  }

  try {
    const { data, error } = await query;

    if (error) {
      return new NextResponse('API Query Error', { status: 500 });
    }

    const updatedData = await Promise.all(
      data.map(async (item: Property) => {
        const coverUrl = await buildCoverUrl(item);
        return { ...item, cover_url: coverUrl };
      })
    );

    return NextResponse.json({ items: updatedData });
  } catch (err) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
