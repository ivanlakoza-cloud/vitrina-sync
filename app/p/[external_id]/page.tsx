// app/p/[external_id]/page.tsx
import { getProperty } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PropertyPage({ params }: { params: { external_id: string } }) {
  const id = params.external_id;
  const p = await getProperty(id);
  if (!p) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Объект не найден</h1>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
      <section>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          {p.title ?? p.address ?? p.external_id}
        </div>
        <div style={{ opacity: 0.7, marginBottom: 16 }}>{[p.city, p.address].filter(Boolean).join(", ")}</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {(p.gallery?.length ? p.gallery : (p.coverUrl ? [p.coverUrl] : [])).map((src: string, i: number) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={`photo_${i}`} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8 }} />
          ))}
        </div>
      </section>

      <aside>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Информация</div>
          <div style={{ fontSize: 14, lineHeight: 1.7 }}>
            <div><b>ID:</b> {p.external_id}</div>
            {p.city ? <div><b>Город:</b> {p.city}</div> : null}
            {p.address ? <div><b>Адрес:</b> {p.address}</div> : null}
          </div>
        </div>
      </aside>
    </main>
  );
}