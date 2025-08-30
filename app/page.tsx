// app/page.tsx
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function getBaseUrl(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchCatalog(city: string) {
  const base = getBaseUrl();
  const resp = await fetch(`${base}/api/catalog?city=${encodeURIComponent(city)}`, { cache: "no-store" });
  if (!resp.ok) throw new Error("Catalog API error");
  return resp.json();
}

export default async function Page({ searchParams }: { searchParams: { city?: string } }) {
  const city = (searchParams?.city || "").trim();
  const data = await fetchCatalog(city);
  const items = (data?.items || []) as any[];
  const cities = (data?.cities || []) as string[];

  return (
    <main className="p-4">
      <div className="mb-4">
        <form action="/" method="get">
          <label htmlFor="city" className="mr-2">Город:</label>
          <select
            id="city"
            name="city"
            defaultValue={city}
            onChange={(e) => { if (typeof window !== "undefined") { const v = e.currentTarget.value; const url = v ? `/?city=${encodeURIComponent(v)}` : "/"; window.location.href = url; } }}
          >
            <option value="">Все города</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </form>
      </div>

      <div className="grid" style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:"16px"}}>
        {items.map((p) => {
          const caption = [p.city, p.address].filter(Boolean).join(", ");
          const href = `/p/${p.external_id}`;

          return (
            <div key={p.external_id} className="border rounded-lg p-2">
              <Link href={href} aria-label={caption}>
                <Image
                  src={p.coverUrl || "/no-photo.jpg"}
                  alt={caption || "Фото"}
                  width={600}
                  height={400}
                  style={{ width: "100%", height: 180, objectFit: "cover" }}
                />
              </Link>

              <div className="mt-2">
                <Link className="text-blue-700 underline" href={href}>
                  {caption || "—"}
                </Link>

                {/* Доп. инфо, если есть */}
                {(p.tip_pomescheniya || p.etazh !== null || (p.price_min !== null && p.price_max !== null)) && (
                  <div style={{fontSize:14, color:"#555", marginTop:4}}>
                    {p.tip_pomescheniya && <span>{p.tip_pomescheniya}</span>}
                    {p.etazh !== null && <span>{p.tip_pomescheniya ? " • " : ""}Этаж: {p.etazh}</span>}
                    {(p.price_min !== null && p.price_max !== null) && (
                      <span>{(p.tip_pomescheniya || p.etazh !== null) ? " • " : ""}Цена: {p.price_min}–{p.price_max} ₽/м²</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
