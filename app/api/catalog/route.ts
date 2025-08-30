// app/api/catalog/route.ts
import { NextResponse } from "next/server";

type Row = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  cover_storage_path: string | null;
  cover_ext_url: string | null;
  updated_at: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const city = u.searchParams.get("city") || "";
    const limit = Number(u.searchParams.get("n") || "100") || 100;

    let url =
      `${SUPABASE_URL}/rest/v1/view_property_with_cover` +
      `?select=external_id,title,address,city,cover_storage_path,cover_ext_url,updated_at` +
      `&order=updated_at.desc.nullslast` +
      `&limit=${limit}`;

    if (city) url += `&city=eq.${encodeURIComponent(city)}`;

    const r = await fetch(url, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      cache: "no-store",
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `REST ${r.status}: ${t}`, url },
        { status: 500 }
      );
    }
    const items = (await r.json()) as Row[];
    const cities = Array.from(
      new Set(items.map((x) => x.city).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b, "ru"));

    return NextResponse.json({ ok: true, count: items.length, items, cities });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
