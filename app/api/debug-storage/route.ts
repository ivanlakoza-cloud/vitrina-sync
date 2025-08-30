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

  // 1) storage list
  const listUrl = `${SUPABASE_URL.replace(/\/+$/,"")}/storage/v1/object/list/${encodeURIComponent(BUCKET)}`;
  const payload = { prefix, limit: 20, offset: 0, sortBy: { column: "name", order: "asc" as const } };

  let listStatus:number|undefined, listText:string|undefined, list:any=null;
  try {
    const r = await fetch(listUrl, {
      method: "POST",
      headers: { ...h(), "content-type":"application/json" },
      body: JSON.stringify(payload),
      next: { revalidate: 30 }
    });
    listStatus = r.status;
    listText = await r.text();
    try { list = JSON.parse(listText); } catch {}
  } catch (e:any) {
    listText = "ERR: " + String(e?.message||e);
  }

  // 2) fallback: REST storage.objects
  const qs = new URLSearchParams();
  qs.set("select","name, bucket_id");
  qs.set("bucket_id", `eq.${BUCKET}`);
  qs.set("name", `like.${prefix}%`);
  qs.set("order","name.asc");
  qs.set("limit","1");
  const restUrl = `${SUPABASE_URL.replace(/\/+$/,"")}/rest/v1/objects?${qs.toString()}`;

  let restStatus:number|undefined, restText:string|undefined, rest:any=null;
  try {
    const r2 = await fetch(restUrl, {
      headers: { ...h(), "Accept-Profile":"storage" },
      next: { revalidate: 30 }
    });
    restStatus = r2.status;
    restText = await r2.text();
    try { rest = JSON.parse(restText); } catch {}
  } catch (e:any) {
    restText = "ERR: " + String(e?.message||e);
  }

  const nameFromList = Array.isArray(list) && list[0]?.name ? list[0].name : null;      // только file-name
  const nameFromRest = Array.isArray(rest) && rest[0]?.name ? rest[0].name : null;      // полный путь
  const key =
    nameFromRest ||
    (nameFromList ? prefix + nameFromList : null);
  const publicUrl = key
    ? `${SUPABASE_URL.replace(/\/+$/,"")}/storage/v1/object/public/${BUCKET}/${key.replace(/^\/+/,"")}`
    : null;

  return NextResponse.json({
    id, prefix,
    storageList: { url: listUrl, status: listStatus, raw: listText?.slice(0,500), parsed: Array.isArray(list) ? list.slice(0,3) : null },
    restObjects: { url: restUrl, status: restStatus, raw: restText?.slice(0,500), parsed: Array.isArray(rest) ? rest.slice(0,3) : null },
    first: key ? { key } : null,
    publicUrl
  });
}
