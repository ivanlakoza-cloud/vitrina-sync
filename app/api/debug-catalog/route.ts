// app/api/debug-catalog/route.ts
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://bhabvutmbxxcqgtmtudv.supabase.co";

const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

function h() {
  const hh: Record<string, string> = { "Content-Type": "application/json" };
  if (ANON) {
    hh["apikey"] = ANON;
    hh["Authorization"] = `Bearer ${ANON}`;
  }
  return hh;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const urlObj = new URL(req.url);
  const city = (urlObj.searchParams.get("city") || "").trim();
  const id = (urlObj.searchParams.get("id") || "").trim();
  const n = Number(urlObj.searchParams.get("n") || "3") || 3;

  const base = SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/view_property_with_cover";
  const qs = new URLSearchParams();
  qs.set("select", "*");
  qs.set("limit", String(n));
  if (city) qs.set("city", `eq.${city}`);
  if (id) qs.set("external_id", `eq.${id}`);
  if (ANON) qs.set("apikey", ANON);

  const attempts = [
    "updated_at.desc.nullslast",
    "updated_at.desc",
    "",
  ];

  const tries: any[] = [];
  let finalRows: any[] = [];
  for (const ord of attempts) {
    const q = new URLSearchParams(qs);
    if (ord) q.set("order", ord);
    const u = `${base}?${q.toString()}`;
    try {
      const r = await fetch(u, { headers: h(), next: { revalidate: 60 } });
      const text = await r.text();
      const ok = r.ok;
      const rows = ok ? JSON.parse(text) : [];
      tries.push({ url: u, status: r.status, ok, rows_count: Array.isArray(rows) ? rows.length : -1 });
      if (ok && Array.isArray(rows)) { finalRows = rows; break; }
    } catch (e: any) {
      tries.push({ url: u, status: "ERR", err: String(e?.message || e) });
    }
  }

  const sample = finalRows.slice(0, Math.min(5, finalRows.length)).map((r: any) => ({
    external_id: r.external_id,
    city: r.city,
    address: r.address,
    cover_storage_path: r.cover_storage_path,
    cover_ext_url: r.cover_ext_url,
  }));

  return NextResponse.json({
    env: {
      RESOLVED_SUPABASE_URL: SUPABASE_URL,
      HAS_ANON: !!ANON,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON ? ANON.slice(0, 6) + "…" + ANON.slice(-3) : null,
    },
    input: { city, id, n },
    tries,
    count: finalRows.length,
    sample,
    hint:
      "Если count=0 — либо данные во view пустые/фильтр лишний, либо RLS/схема. Для проверки ID используйте /api/debug-catalog?id=id53. " +
      "Если cover_storage_path пуст — фронт попробует photos/<external_id>/ в Storage.",
  });
}
