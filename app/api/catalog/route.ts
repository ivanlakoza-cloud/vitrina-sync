// app/api/catalog/route.ts
"use server";

import { NextResponse } from "next/server";

type Row = {
  id: string;            // uuid
  address: string | null;
  city: string | null;
  type: string | null;
  total_area: number | null;
  etazh?: string | number | null;
  tip_pomescheniya?: string | null;
  // ext prices may or may not exist in view — we don't rely on them here
  price_per_m2_20?: number | null;
  price_per_m2_50?: number | null;
  price_per_m2_100?: number | null;
  price_per_m2_400?: number | null;
  price_per_m2_700?: number | null;
  price_per_m2_1500?: number | null;
};

type Item = {
  external_id: string;
  title: string;
  address: string | null;
  city_name: string | null;
  type: string | null;
  total_area: number | null;
  floor: string | number | null;
  cover_url: string | null;
  line2: string;
  prices: string;
};

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function f(s: string) { return s; }

async function sbRest(path: string, init?: RequestInit) {
  const url = `${SB_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...(init || {}),
    headers: {
      apikey: SB_ANON,
      Authorization: `Bearer ${SB_ANON}`,
      ...(init?.headers || {}),
    },
    // never cache in edge
    cache: "no-store",
    // small timeout shim
  });
  return res;
}

function pricesLine(row: Partial<Row>): string {
  const labels: Record<string,string> = {
    price_per_m2_20:   "20",
    price_per_m2_50:   "50",
    price_per_m2_100:  "100",
    price_per_m2_400:  "400",
    price_per_m2_700:  "700",
    price_per_m2_1500: "1500",
  };
  const out: string[] = [];
  for (const [k, lbl] of Object.entries(labels)) {
    const v = (row as any)[k];
    if (v !== null && v !== undefined && v !== "") {
      out.push(`от ${lbl} — ${v}`);
    }
  }
  return out.join(" · ");
}

function buildTitle(city: string | null | undefined, addr: string | null | undefined) {
  const parts = [city?.trim(), addr?.trim()].filter(Boolean);
  return parts.join(", ");
}

// --- photos probing helpers ---

type PhotosProbe = {
  ok: boolean;
  idCol?: string;       // property_id / property_uuid / object_id / project_id
  pathCol?: string;     // public_url / path / file_path / name
};

async function probePhotosSchema(): Promise<PhotosProbe> {
  const idCandidates = ["property_id","property_uuid","project_id","object_id","property","prop_id","pid"];
  const pathCandidates = ["public_url","path","file_path","filepath","name","filename"];
  for (const idCol of idCandidates) {
    // try to select 1 row with this id col and any of path candidates
    const selectCols = [idCol, ...pathCandidates].join(",");
    const res = await sbRest(`photos?select=${selectCols}&limit=1`);
    if (!res.ok) continue;
    const arr = await res.json();
    const row = Array.isArray(arr) && arr.length ? arr[0] : null;
    if (!row) continue;
    const hitPath = pathCandidates.find(c => c in row);
    if (!hitPath) continue;
    return { ok: true, idCol, pathCol: hitPath };
  }
  return { ok: false };
}

function buildStorageUrl(pathLike: string) {
  // If the column already stores full URL, just return it
  if (/^https?:\/\//i.test(pathLike)) return pathLike;
  // Otherwise assume it's a relative path inside the 'photos' bucket
  return `${SB_URL}/storage/v1/object/public/photos/${pathLike}`;
}

async function fetchCovers(idList: string[]): Promise<Record<string,string>> {
  const covers: Record<string,string> = {};
  if (!idList.length) return covers;

  const probe = await probePhotosSchema();
  if (!probe.ok || !probe.idCol || !probe.pathCol) {
    return covers; // silent fallback
  }

  // Build IN filter (chunk to respect URL length)
  const chunks: string[][] = [];
  const maxChunk = 80;
  for (let i=0; i<idList.length; i+=maxChunk) chunks.push(idList.slice(i, i+maxChunk));

  for (const part of chunks) {
    const inList = part.map(v => `"${v}"`).join(",");
    const where = `${probe.idCol}=in.(${inList})`;
    // select first image by created_at asc if such column exists;
    // we can still phase it client-side
    const res = await sbRest(`photos?select=${probe.idCol},${probe.pathCol},created_at&${where}&limit=10000`);
    if (!res.ok) continue;
    const rows = await res.json();
    // Group by id and take earliest (or first)
    const byId: Record<string, any[]> = {};
    for (const r of rows) {
      const pid = r[probe.idCol];
      const pth = r[probe.pathCol];
      if (!pid || !pth) continue;
      (byId[pid] ||= []).push(r);
    }
    for (const [pid, arr] of Object.entries(byId)) {
      arr.sort((a,b) => String(a.created_at||"").localeCompare(String(b.created_at||"")));
      const best = arr[0];
      const url = buildStorageUrl(String(best[probe.pathCol]));
      if (url) covers[pid] = url;
    }
  }
  return covers;
}

// ---- handler ----

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || "500"), 1000);

    // Base select from property_public_view
    const selectCols = [
      "id",
      "address",
      "city",
      "type",
      "total_area",
      "etazh",
      "tip_pomescheniya",
      "price_per_m2_20",
      "price_per_m2_50",
      "price_per_m2_100",
      "price_per_m2_400",
      "price_per_m2_700",
      "price_per_m2_1500",
    ].join(",");

    const baseRes = await sbRest(`property_public_view?select=${selectCols}&order=city.asc&limit=${limit}`);
    if (!baseRes.ok) {
      const txt = await baseRes.text();
      return NextResponse.json({ ok:false, message: txt }, { status: 500 });
    }
    const rows = (await baseRes.json()) as Row[];

    // Fetch covers in one go
    const idList = rows.map(r => r.id).filter(Boolean);
    const coverIndex = await fetchCovers(idList);

    const items: Item[] = rows.map((r) => {
      const title = buildTitle(r.city, r.address);
      const floor = (r.etazh ?? null);
      const line2 = (r.tip_pomescheniya ? `${r.tip_pomescheniya}${floor ? ` · этаж ${floor}` : ""}` : (floor ? `этаж ${floor}` : (r.type ?? ""))) || "";
      const prices = pricesLine(r);
      const cover_url = coverIndex[r.id] || null;

      return {
        external_id: r.id,
        title,
        address: r.address ?? null,
        city_name: r.city ?? null,
        type: r.type ?? null,
        total_area: r.total_area ?? null,
        floor,
        cover_url,
        line2,
        prices,
      };
    });

    // unique, sorted cities (for the dropdown)
    const citySet = new Set<string>();
    for (const r of rows) if (r.city) citySet.add(String(r.city));
    const cities = Array.from(citySet).sort((a,b) => a.localeCompare(b, "ru"));

    return NextResponse.json({ items, cities });
  } catch (e: any) {
    return NextResponse.json({ ok:false, message: e?.message || String(e) }, { status: 500 });
  }
}
