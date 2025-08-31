// Main page with robust baseUrl and 6-column grid
import React from "react";

type Item = {
  external_id: string;
  cover_url?: string | null;
  city_name?: string | null;
  address?: string | null;
  line2?: string | null;
  prices?: string | null;
};

function getBaseUrl(): string {
  // Prefer explicit site URL if provided; fallback to Vercel URL; fallback to localhost for dev
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.SITE_URL) return process.env.SITE_URL as string;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000"; // local dev only
}

async function getCatalog(): Promise<{ items: Item[] }> {
  const res = await fetch(`${getBaseUrl()}/api/catalog`, {
    cache: "no-store", // avoid stale SSR cache
    // next: { revalidate: 0 } // alternatively, but no-store is enough
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Catalog fetch failed: ${res.status} ${text}`);
  }
  return res.json();
}

export default async function Page() {
  const data = await getCatalog();
  const items: Item[] = Array.isArray(data?.items) ? data.items : [];

  return (
    <main style={{ padding: "24px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0,1fr))",
          gap: "16px",
        }}
      >
        {items.map((it) => {
          const title = [it.city_name, it.address].filter(Boolean).join(", ");
          return (
            <a
              key={it.external_id}
              href={`/p/${it.external_id}`}
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
                border: "1px solid #eee",
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              {it.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.cover_url}
                  alt=""
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 3",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    paddingTop: "66%",
                    background: "#f5f5f5",
                  }}
                />
              )}

              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, lineHeight: 1.25 }}>{title}</div>
                {it.line2 ? (
                  <div style={{ opacity: 0.8, marginTop: 4 }}>{it.line2}</div>
                ) : null}
                {it.prices ? (
                  <div style={{ opacity: 0.8, marginTop: 4 }}>{it.prices}</div>
                ) : null}
              </div>
            </a>
          );
        })}
      </div>
    </main>
  );
}
