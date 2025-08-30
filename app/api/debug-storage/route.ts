// app/api/debug-storage/route.ts
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://bhabvutmbxxcqgtmtudv.supabase.co";

const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const BUCKET = "photos";
const PREFIX = (process.env.NEXT_PUBLIC_STORAGE_PREFIX || "").replace(/^\/+|\/+$/g, "");

function h() {
  const hh: Record<string, string> = { "Content-Type": "application/json" };
  if (ANON) { hh["apikey"] = ANON; hh["Authorization"] = `Bearer ${ANON}`; }
  return hh;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = (new URL(req.url).searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ error: "pass ?id=id53" }, { status: 400 });

  const prefix = [PREFIX, id].filter(Boolean).join("/") + "/";
  const listUrl = `${SUPABASE_URL.replace(/\/+$/,"")}/storage/v1/object/list/${encodeURIComponent(BUCKET)}`;

  let list:any = null, status:number|undefined;
  try {
    const r = await fetch(listUrl, {
      method: "POST",
      headers: { ...h(), "content-type":"application/json" },
      body: JSON.stringify({ prefix, limit: 20, offset: 0, sortBy: { column: "name", order: "asc" } }),
      next: { revalidate: 30 }
    });
    status = r.status;
    list = await r.json();
  } catch (e:any) {
    return NextResponse.json({ id, prefix, list_error: String(e?.message||e) }, { status: 500 });
  }

  const first = Array.isArray(list) && list.length ? list[0] : null;
  const publicUrl = first
    ? `${SUPABASE_URL.replace(/\/+$/,"")}/storage/v1/object/public/${BUCKET}/${prefix}${first.name}`
    : null;

  return NextResponse.json({ id, prefix, status, first, publicUrl });
}
