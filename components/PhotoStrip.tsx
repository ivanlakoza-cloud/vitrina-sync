export default function PhotoStrip({ urls }: { urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <div className="card hscroll" style={{ maxHeight: 300 }}>
      <div className="flex gap-2 p-2">
        {urls.map((u, i) => (
          <img key={i} src={u} alt={`Фото ${i+1}`} className="h-[150px] rounded-xl object-cover" />
        ))}
      </div>
    </div>
  );
}
