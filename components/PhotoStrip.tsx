
\"use client\";
import React from \"react\";

type Props = { photos: string[] };

export default function PhotoStrip({ photos }: Props) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const has = (photos || []).length > 0;

  const show = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  // swipe
  const startX = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx > 40) prev(); else if (dx < -40) next();
    startX.current = null;
  };
  const next = () => setIndex(i => (i + 1) % photos.length);
  const prev = () => setIndex(i => (i - 1 + photos.length) % photos.length);

  if (!has) return null;

  return (
    <div className=\"space-y-2\">
      <div className=\"grid grid-cols-3 gap-3\">
        {photos.slice(0, 9).map((src, i) => (
          <button key={i} onClick={() => show(i)} className=\"block focus:outline-none\">
            <img src={src} alt={\`Фото \${i+1}\`} className=\"h-56 w-full object-cover rounded-xl\" />
          </button>
        ))}
      </div>

      {open && (
        <div
          className=\"fixed inset-0 z-50 bg-black/80 flex items-center justify-center\"
          onClick={() => setOpen(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            className=\"absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl\"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label=\"Назад\"
          >‹</button>
          <img src={photos[index]} alt={\`Фото \${index+1}\`} className=\"max-h-[90vh] max-w-[90vw] object-contain rounded-xl\" />
          <button
            className=\"absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl\"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label=\"Вперёд\"
          >›</button>
          <div className=\"absolute bottom-4 left-0 right-0 text-center text-white text-sm\">
            {index+1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
