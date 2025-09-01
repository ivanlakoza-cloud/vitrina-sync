
'use client';

type Props = { images: string[] };

export default function PhotoStrip({ images }: Props) {
  if (!images || images.length === 0) return null;
  return (
    <div className="overflow-x-auto whitespace-nowrap rounded-lg mb-6">
      <div className="flex gap-3">
        {images.map((src, i) => (
          <button key={i} className="shrink-0" onClick={() => window.open(src, "_blank")}>
            <img src={src} alt={`Фото ${i+1}`} className="h-48 w-80 object-cover rounded-lg" />
          </button>
        ))}
      </div>
    </div>
  );
}
