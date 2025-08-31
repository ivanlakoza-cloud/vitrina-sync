import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  type: string | null;
  total_area: number | null;
  lat: number | null;
  lng: number | null;
};

type Ext = {
  property_id: string;
  price_per_m2_20?: string | null;
  price_per_m2_50?: string | null;
  price_per_m2_100?: string | null;
  price_per_m2_400?: string | null;
  price_per_m2_700?: string | null;
  price_per_m2_1500?: string | null;
  etazh_avito?: string | null;
};

type Photo = {
  property_id: string;
  url?: string | null;
  created_at?: string | null;
};

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, message: "Supabase env vars are missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // 1) Base rows from the *existing* view
    const { data: rows, error } = await supabase
      .from("property_public_view")
      .select("id,title,address,city,type,total_area,lat,lng")
      .order("city", { ascending: true })
      .limit(2000);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }

    const safeRows: Row[] = (rows ?? []) as Row[];
    const ids = safeRows.map((r) => r.id).filter(Boolean);

    // 2) Prices + floor from property_ext
    let extById = new Map<string, Ext>();
    if (ids.length) {
      const { data: extRows, error: extErr } = await supabase
        .from("property_ext")
        .select(
          "property_id,price_per_m2_20,price_per_m2_50,price_per_m2_100,price_per_m2_400,price_per_m2_700,price_per_m2_1500,etazh_avito"
        )
        .in("property_id", ids)
        .limit(5000);
      if (extErr) {
        return NextResponse.json(
          { ok: false, message: extErr.message },
          { status: 500 }
        );
      }
      for (const e of (extRows ?? []) as Ext[]) {
        extById.set(e.property_id, e);
      }
    }

    // 3) First photo per object
    let photoFirstById = new Map<string, string>();
    if (ids.length) {
      const { data: photoRows, error: photoErr } = await supabase
        .from("photos")
        .select("property_id,url,created_at")
        .in("property_id", ids)
        .order("created_at", { ascending: true })
        .limit(10000);

      if (photoErr) {
        return NextResponse.json(
          { ok: false, message: photoErr.message },
          { status: 500 }
        );
      }
      for (const p of (photoRows ?? []) as Photo[]) {
        if (p.property_id && p.url && !photoFirstById.has(p.property_id)) {
          photoFirstById.set(p.property_id, p.url);
        }
      }
    }

    const items = safeRows.map((r) => {
      const e = extById.get(r.id);
      const title = [r.city, r.address].filter(Boolean).join(", ");

      const parts2: string[] = [];
      if (r.type) parts2.push(String(r.type).trim());
      if (e?.etazh_avito && String(e.etazh_avito).trim()) {
        parts2.push(`этаж ${String(e.etazh_avito).trim()}`);
      }
      const subtitle = parts2.join(" · ");

      const priceParts: string[] = [];
      const add = (k: number, v?: string | null) => {
        if (v && String(v).trim()) priceParts.push(`от ${k} — ${String(v).trim()}`);
      };
      add(20, e?.price_per_m2_20);
      add(50, e?.price_per_m2_50);
      add(100, e?.price_per_m2_100);
      add(400, e?.price_per_m2_400);
      add(700, e?.price_per_m2_700);
      add(1500, e?.price_per_m2_1500);

      return {
        id: r.id,
        title,
        subtitle,
        prices: priceParts.join(" · "),
        city: r.city,
        address: r.address,
        type: r.type,
        total_area: r.total_area,
        cover_url: photoFirstById.get(r.id) || null,
      };
    });

    const cities = Array.from(
      new Set(safeRows.map((r) => r.city).filter(Boolean))
    )
      .map((c) => String(c))
      .sort((a, b) => a.localeCompare(b, "ru"));

    return NextResponse.json({ ok: true, items, cities });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
