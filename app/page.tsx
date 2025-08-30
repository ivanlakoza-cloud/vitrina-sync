// app/page.tsx
// Главная: серверный рендер без кэша, рабочий фильтр, фото из Supabase Storage.
// Ничего из next/image не используем — обычный <img>, чтобы не трогать next.config.js.

export const dynamic = "force-dynamic";

type Row = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  cover_storage_path: string | null;
  cover_ext_url: string | null;
  updated_at: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// — REST к вью (только нужные поля, без "type/area" которых нет в вью)
async function fetchCatalog(): Promise<Row[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/view_property_with_cover` +
    `?select=external_id,title,address,city,cover_storage_path,cover_ext_url,updated_at` +
    `&order=updated_at.desc.nullslast`;

  const r = await fetch(url, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    // важное: SSR не должно кэшироваться
    cache: "no-store",
  });

  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`REST ${r.status}: ${t}`);
  }
  return (await r.json()) as Row[];
}

// — Список ключей первого фото для external_id через Storage REST
async function listFirstPhotoKey(extId: string): Promise<string | null> {
  const url = `${SUPABASE_URL}/storage/v1/object/list/photos`;
  const body = {
    prefix: `${extId.replace(/^\/+|\/+$/g, "")}/`,
    limit: 1,
    offset: 0,
    sortBy: { column: "name", order: "asc" as const },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!r.ok) return null;

  const arr = (await r.json()) as Array<{ name?: string }>;
  const name = arr?.[0]?.name;
  if (!name) return null;
  // Полный ключ внутри бакета (префикс + имя)
  return `${body.prefix}${name}`.replace(/\/{2,}/g, "/");
}

function publicStorageUrl(objectKey: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${encodeURIComponent(
    objectKey
  )}`;
}

// — Разруливаем обложку:
// 1) cover_storage_path → public URL
// 2) иначе пытаемся найти первый файл в photos/<external_id>/
// 3) если ничего — пробуем cover_ext_url (может 410, но как фолбэк)
async function resolveCover(p: Row): Promise<string | null> {
  if (p.cover_storage_path) {
    return publicStorageUrl(p.cover_storage_path);
  }
  const first = await listFirstPhotoKey(p.external_id);
  if (first) return publicStorageUrl(first);
  return p.cover_ext_url || null;
}

export default async function Page({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  // 1) Тянем весь каталог на сервере (до ~неск сотен строк ок)
  const all = await fetchCatalog();

  // 2) Опции городов из всех записей
  const citySet = new Set<string>();
  for (const r of all) if (r.city) citySet.add(String(r.city));
  const cityOptions = Array.from(citySet).sort((a, b) => a.localeCompare(b, "ru"));

  // 3) Фильтр по query ?city=
  const currentCity = (searchParams?.city || "").trim();
  const items = currentCity
    ? all.filter(
        (p) => (p.city || "").toLowerCase() === currentCity.toLowerCase()
      )
    : all;

  // 4) Для карточек достаём фото (Storage → public URL)
  const withCovers = await Promise.all(
    items.map(async (p) => ({
      ...p,
      coverUrl: await resolveCover(p),
    }))
  );

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Каталог</h1>

      {/* Фильтр (GET), без JS — страница перерендерится на сервере */}
      <form action="/" method="get" className="mb-6 flex items-center gap-2">
        <label htmlFor="city">Город:</label>
        <select
          id="city"
          name="city"
          defaultValue={currentCity}
          className="border rounded px-2 py-1"
        >
          <option value="">Все города</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" className="border rounded px-3 py-1">
          Применить
        </button>
      </form>

      {/* Сетка карточек: адаптивная, без «растянутых пустот» */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {withCovers.length === 0 ? (
          <div className="text-gray-500 col-span-full">
            Нет объектов по выбранному фильтру.
          </div>
        ) : (
          withCovers.map((p) => {
            const href = `/p/${encodeURIComponent(p.external_id)}`;
            return (
              <div
                key={p.external_id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <a href={href} style={{ display: "block" }}>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "4 / 3",
                      background: "#f3f4f6",
                    }}
                  >
                    {p.coverUrl ? (
                      <img
                        src={p.coverUrl}
                        alt={p.title || p.address || p.external_id}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                </a>

                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {p.city ?? "—"}
                  </div>

                  <a
                    href={href}
                    style={{
                      display: "block",
                      color: "#4f46e5",
                      textDecoration: "underline",
                      marginBottom: 4,
                    }}
                  >
                    {p.title ?? p.address ?? p.external_id}
                  </a>

                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {p.address ? `${p.address}` : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
