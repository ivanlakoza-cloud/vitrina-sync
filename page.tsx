// app/page.tsx
async function getData(city = '') {
  const path = '/api/catalog?v=2' + (city ? `&city=${encodeURIComponent(city)}` : '');
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load catalog');
  return res.json();
}

export default async function Page() {
  const data = await getData();
  const items = data.items ?? [];

  return (
    <div>
      <div className="grid">
        {items.map((it: any) => (
          <article className="card" key={it.external_id}>
            <div className="imgWrap">
              {it.cover_url ? <img src={it.cover_url} alt={it.title} /> : null}
            </div>
            <div className="cardBody">
              <div className="title">{it.title}</div>
              {it.subline ? <div className="subline">{it.subline}</div> : null}
              {it.prices_line ? <div className="prices">{it.prices_line}</div> : null}
              <div className="meta">ID: {it.external_id}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}