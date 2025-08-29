// app/api/debug-catalog/route.ts
// Диагностика каталога: показывает сырые строки из Supabase (select=*),
// какие поля реально есть, какой cover_url мы выбираем, и результат HEAD-проверки.
// Удалите после отладки.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mask(v?: string | null) {
  if (!v) return null;
  const s = String(v);
  if (s.length <= 10) return `${s.slice(0, 1)}***${s.slice(-1)}`;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

const SUPABASE_URL_FALLBACK = "https://bhabvutmbxxcqgtmtudv.supabase.co";

function resolvedSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    SUPABASE_URL_FALLBACK
  ).replace(/\/+$/, "");
}

function resolvedAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    undefined
  );
}

function storagePublicUrl(base: string, storagePath?: string | null): string | null {
  if (!storagePath) return null;
  const p = String(storagePath).replace(/^\/+/, "");
  // если пришёл уже абсолютный URL — отдадим как есть
  if (/^https?:\/\//i.test(p)) return p;
  // если путь уже включает имя бакета (обычно "photos/...")
  // сформируем стандартный public URL
  return `${base}/storage/v1/object/public/${p}`;
}

function pick<T = any>(obj: any, keys: string[]): T | null {
  for (const k of keys) {
    if (k in (obj ?? {})) {
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v as T;
    }
  }
  return null;
}

async function head(url?: string | null, ms = 1500): Promise<{ url?: string | null; status?: number; ok: boolean; error?: string }> {
  if (!url) return { url, ok: false, error: "no-url" };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { method: "HEAD", signal: ctrl.signal, cache: "no-store" });
    return { url, status: r.status, ok: r.ok };
  } catch (e: any) {
    return { url, ok: false, error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const city = (u.searchParams.get("city") ?? "").trim();
  const id = (u.searchParams.get("id") ?? "").trim();
  const n = Math.min(Math.max(parseInt(u.searchParams.get("n") || "3", 10) || 3, 1), 10);

  const base = resolvedSupabaseUrl();
  const anon = resolvedAnonKey();

  const qs = new URLSearchParams();
  qs.set("select", "*");
  qs.set("limit", String(n));
  if (city) qs.set("city", `eq.${city}`);
  if (id) {
    qs.delete("city");
    qs.set("external_id", `eq.${id}`);
  }
  if (anon) qs.set("apikey", anon);

  const headers: HeadersInit = {};
  if (anon) {
    headers["apikey"] = anon;
    headers["Authorization"] = `Bearer ${anon}`;
  }

  const url = `${base}/rest/v1/view_property_with_cover?${qs.toString()}`;

  let rows: any[] = [];
  let fetchError: string | null = null;
  let status: number | undefined;

  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    status = res.status;
    if (!res.ok) {
      fetchError = (await res.text().catch(() => "")) || res.statusText;
    } else {
      rows = await res.json();
    }
  } catch (e: any) {
    fetchError = String(e?.message || e);
  }

  // По каждой строке — что считаем "обложкой" и "площадью/типом"
  const derived = await Promise.all(
    rows.map(async (r) => {
      const coverExt = pick<string>(r, [
        "cover_ext_url",
        "cover_url",
        "photo_url",
        "image_url",
        "preview_url",
        "main_photo_url",
      ]);
      const storagePath = pick<string>(r, [
        "cover_storage_path",
        "storage_path",
        "photo_path",
        "image_path",
        "cover_path",
      ]);
      const coverFromStorage = storagePublicUrl(base, storagePath);
      const chosenCover = coverExt || coverFromStorage || null;

      const available_area = pick(r, ["available_area", "free_area", "area_available", "area_free", "area_avail"]);
      const total_area = pick(r, ["total_area", "area_total", "area", "square"]);
      const type = pick(r, ["type", "property_type", "category", "kind"]);

      const probe = await head(chosenCover);

      return {
        external_id: r.external_id,
        title: r.title ?? null,
        city: r.city ?? r.city_name ?? null,
        address: r.address ?? r.addr ?? null,
        cover_candidates: { coverExt, storagePath, coverFromStorage },
        chosenCover,
        cover_probe: probe,
        area_candidates: { available_area, total_area },
        type,
        knownKeys: Object.keys(r),
      };
    })
  );

  const body = {
    env: {
      RESOLVED_SUPABASE_URL: base,
      HAS_ANON: !!anon,
      NEXT_PUBLIC_SUPABASE_URL: mask(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    input: { city, id, n },
    fetch: { url, status, error: fetchError },
    count: rows.length,
    derived,
    hint:
      "Смотрите derived[].cover_candidates и cover_probe.status: 200 означает, что URL доступен. " +
      "Если chosenCover пустой или HEAD не 2xx — проблема в поле обложки (название или путь). " +
      "Для типа/площади смотрите derived[].type и area_candidates. " +
      "Передайте этот JSON — я добавлю нужное соответствие полей.",
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
