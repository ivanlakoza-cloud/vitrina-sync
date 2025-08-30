// app/page.tsx
import Link from "next/link";
import { getCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

type Search = { city?: string };

export default async function Page({ searchParams }: { searchParams: Search }) {
  const currentCity = searchParams?.city ?? "";
  const all = await getCatalog({ city: currentCity });

  // Build city options from the whole dataset (without filter) for UX
  const base = await getCatalog();
  const citySet = new Set<string>();
  for (const it of base) if (it.city) citySet.add(String(it.city));
  const cityOptions = Array.from(citySet).sort((a, b) => a.localeCompare(b, "ru"));

  const items = all;

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Каталог</h1>

      <form action="/" method="get" style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <label htmlFor="city">Город:</label>
        <select id="city" name="city" defaultValue={currentCity} style={{ padding: "6px 10px", borderRadius: 8 }}>
          <option value="">Все города</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #ccc" }}>
          Применить
        </button>
      </form>

      {items.length === 0 ? (
        <div style={{ opacity: 0.7 }}>Нет объектов по выбранному фильтру.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {items.map((p) => {
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
                <Link href={href} style={{ display: "block" }}>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 180, // fixed preview height
                      background: "#f3f4f6",
                    }}
                  >
                    {p.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.coverUrl}
                        alt={p.title ?? p.address ?? p.external_id}
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
                </Link>

                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{p.city ?? "—"}</div>
                  <Link href={href} style={{ display: "block", color: "#4f46e5", textDecoration: "underline" }}>
                    {p.title ?? p.address ?? p.external_id}
                  </Link>
                  {p.address ? <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{p.address}</div> : null}
                  <div style={{ marginTop: 8 }}>
                    <Link href={href} style={{ color: "#4f46e5", textDecoration: "underline", fontSize: 14 }}>
                      Подробнее →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}