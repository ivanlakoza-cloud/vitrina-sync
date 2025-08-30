// app/api/debug-storage/route.ts
import { NextRequest, NextResponse } from "next/server";

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return {
    url: url.replace(/\/+$/, ""),
    anon,
    ok: !!url && !!anon,
  };
}

export async function GET(req: NextRequest) {
  const q = new URL(req.url);
  const id = (q.searchParams.get("id") || "").trim();
  if (!id) {
    return NextResponse.json({ error: "pass ?id=id53" }, { status: 400 });
  }

  const E = env();
  const prefix = `${id}/`; // папка проекта в бакете photos
  const bucket = "photos";

  // Ответ-заготовка
  const out: any = {
    id,
    prefix,
    env: {
      RESOLVED_SUPABASE_URL: E.url || null,
      HAS_ANON: !!E.anon,
    },
  };

  if (!E.ok) {
    out.error = "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY";
    return NextResponse.json(out, { status: 500 });
  }

  // ⚠️ ВАЖНО: листинг — это POST + JSON + 2 заголовка
  const listUrl = `${E.url}/storage/v1/object/list/${encodeURIComponent(bucket)}`;
  const body = {
    prefix, // "id53/"
    limit: 10,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  };

  const res = await fetch(listUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": E.anon,
      "Authorization": `Bearer ${E.anon}`,
    },
    body: JSON.stringify(body),
    // Никаких query-параметров!
  });

  out.status = res.status;

  if (!res.ok) {
    try { out.text = await res.text(); } catch {}
    return NextResponse.json(out, { status: 200 });
  }

  const arr = (await res.json()) as Array<{ name: string }>;
  out.count = arr?.length ?? 0;
  out.first = arr?.[0]?.name ? `${prefix}${arr[0].name}` : null;

  if (out.first) {
    // Публичная ссылка (bucket помечен Public)
    out.publicUrl = `${E.url}/storage/v1/object/public/${bucket}/${encodeURIComponent(out.first)}`;
  } else {
    out.publicUrl = null;
  }

  return NextResponse.json(out, { status: 200 });
}
