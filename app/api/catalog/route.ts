// app/api/catalog/route.ts
// Normalizes getCatalog() result to a stable { items, cities } shape
// and keeps working whether getCatalog returns an array or { items, cities }.
import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cityRaw = (searchParams.get("city") || "").trim();
    const nRaw = searchParams.get("n") || "";
    const limit = Number.parseInt(nRaw, 10);
    const city = cityRaw || undefined;

    // getCatalog may return an array OR an object { items, cities } — support both
    const result: any = await (getCatalog as any)({ city });

    let items: any[] = Array.isArray(result)
      ? result
      : Array.isArray(result?.items)
      ? result.items
      : [];

    // optional trimming
    if (Number.isFinite(limit) && limit > 0) items = items.slice(0, limit);

    // cities: take from API if present, otherwise derive from items
    const cities: string[] = Array.isArray(result?.cities)
      ? result.cities
      : Array.from(
          new Set(
            items
              .map((p: any) => (p?.city ? String(p.city) : ""))
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, "ru"));

    return NextResponse.json({ items, cities });
  } catch (err: any) {
    const message = err?.message || String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
