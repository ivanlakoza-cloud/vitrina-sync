// app/p/[external_id]/page.tsx
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

async function fetchOne(id: string): Promise<Row | null> {
  const url =
    `${SUPABASE_URL}/rest/v1/view_property_with_cover` +
    `?select=external_id,title,address,city,cover_storage_path,cover_ext_url,updated_at` +
    `&external_id=eq.${encodeURIComponent(id)}` +
    `&limit=1`;

  const r = await fetch(url, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const arr = (await r.json()) as Row[];
  return arr?.[0] ?? null;
}

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
  return `${body.prefix}${name}`.replace(/\/{2,}/g, "/");
}
function publicStorageUrl(key: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${encodeURIComponent(
    key
  )}`;
}
async function resolveCover(p: Row): Promise<string | null> {
  if (p.cover_storage_path) return publicStorageUrl(p.cover_storage_path);
  const first = await listFirstPhotoKey(p.external_id);
  if (first) return publicStorageUrl(first);
  return p.cover_ext_url || null;
}

export default async function Page({
  params,
}: {
  params: { external_id: string };
}) {
  const id = decodeURIComponent(params.external_id);
  const item = await fetchOne(id);
  if (!item) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-2">Объект не найден</h1>
        <a href="/" className="text-indigo-600 underline">
          ← На главную
        </a>
      </main>
    );
  }

  const coverUrl = await resolveCover(item);

  return (
    <main className="p-6">
      <a href="/" className="text-indigo-600 underline">
        ← На главную
      </a>
      <h1 className="text-2xl font-bold mb-4">
        {item.title ?? item.address ?? item.external_id}
      </h1>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
          maxWidth: 900,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4 / 3",
            background: "#f3f4f6",
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={item.title || item.address || item.external_id}
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

        <div style={{ padding: 16 }}>
          <div style={{ opacity: 0.7, marginBottom: 4 }}>
            {item.city ?? "—"}
          </div>
          <div>{item.address ?? "—"}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
            Обновлено: {item.updated_at ?? "—"}
          </div>
        </div>
      </div>
    </main>
  );
}
