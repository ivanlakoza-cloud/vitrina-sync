// app/api/ping/route.ts
// Диагностика окружения и соединения с Supabase (безопасно маскирует ключи)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProbeResult = {
  ok: boolean;
  status?: number;
  error?: string;
  url: string;
  sample?: any;
};

function mask(v?: string | null) {
  if (!v) return null;
  const s = String(v);
  if (s.length <= 10) return `${s.slice(0, 1)}***${s.slice(-1)}`;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function resolvedSupabaseUrl(): string {
  // такой же fallback, как в lib/data.ts
  const FB = "https://bhabvutmbxxcqgtmtudv.supabase.co";
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    FB
  );
}

function resolvedAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY || // если вдруг так назван
    undefined
  );
}

async function probe(pathQS: string): Promise<ProbeResult> {
  const base = resolvedSupabaseUrl().replace(/\/+$/, "");
  const anon = resolvedAnonKey();
  const url = `${base}${pathQS}${anon ? `${pathQS.includes("?") ? "&" : "?"}apikey=${encodeURIComponent(anon)}` : ""}`;

  const headers: HeadersInit = {};
  if (anon) {
    headers["apikey"] = anon;
    headers["Authorization"] = `Bearer ${anon}`;
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1500);

  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, cache: "no-store" });
    const status = res.status;
    if (!res.ok) {
      let errorText = await res.text().catch(() => "");
      return { ok: false, status, error: errorText || res.statusText, url };
    }
    const json = await res.json();
    return { ok: true, status, url, sample: json };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e), url };
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: mask(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_URL: mask(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
    NEXT_PUBLIC_DIRECTUS_URL: mask(process.env.NEXT_PUBLIC_DIRECTUS_URL),
    NEXT_PUBLIC_CMS_URL: mask(process.env.NEXT_PUBLIC_CMS_URL),
    // вычисленные значения, которые реально использует приложение
    RESOLVED: {
      SUPABASE_URL: resolvedSupabaseUrl(),
      HAS_ANON_KEY: !!resolvedAnonKey(),
    },
  };

  // две короткие проверки к Supabase:
  const p1 = probe("/rest/v1/view_property_with_cover?select=external_id,city,address&limit=3");
  const p2 = probe("/rest/v1/view_facets_city?select=city_name,count&order=count.desc&limit=3");

  const [r1, r2] = await Promise.all([p1, p2]);

  const body = {
    env,
    supabase: {
      properties: r1,
      cities: r2,
    },
    hint:
      "Ключи замаскированы. Этот эндпоинт временный — удалите после отладки. " +
      "Если ok=false или status>=400 — проверьте ENV в Vercel и RLS/вью в Supabase.",
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
