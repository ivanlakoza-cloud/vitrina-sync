// app/api/catalog/route.ts
// Диагностика: вызывает тот же getCatalog, что и главная страница.

import { getCatalog } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mask(v?: string | null) {
  if (!v) return null;
  const s = String(v);
  if (s.length <= 10) return `${s.slice(0, 1)}***${s.slice(-1)}`;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const city = (u.searchParams.get("city") ?? "").trim();

  let data: Awaited<ReturnType<typeof getCatalog>> | null = null;
  let error: string | null = null;
  try {
    data = await getCatalog({ city });
  } catch (e: any) {
    error = String(e?.message || e);
  }

  const body = {
    env: {
      RESOLVED_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        "https://bhabvutmbxxcqgtmtudv.supabase.co",
      HAS_ANON: !!(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
      NEXT_PUBLIC_SUPABASE_URL: mask(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    },
    input: { city },
    ok: !!data && Array.isArray(data.items),
    counts: data
      ? { items: data.items.length, cities: data.cities.length }
      : null,
    sample: data ? data.items.slice(0, 3) : null,
    error,
    hint:
      "Этот эндпоинт использует getCatalog({city}) из lib/data.ts. " +
      "Если items > 0 — данные доходят до страницы, ищем баг в app/page.ts. " +
      "Если items = 0 — копаем lib/data.ts/ENV.",
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
