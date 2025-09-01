"use client";
import React from "react";

export default function PhotoStrip({ photos }: { photos: string[] }) {
  const [open, setOpen] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  function show(i: number) {
    setIdx(i);
    setOpen(true);
  }
  function next(delta: number) {
    setIdx((p) => (photos.length ? (p + delta + photos.length) % photos.length : 0));
  }

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") next(1);
      if (e.key === "ArrowLeft") next(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, photos.length]);

  // basic swipe
  React.useEffect(() => {
    let startX = 0;
    const el = imgRef.current;
    if (!el) return;
    const down = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const up = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) next(dx < 0 ? 1 : -1);
    };
    el.addEventListener("touchstart", down);
    el.addEventListener("touchend", up);
    return () => {
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchend", up);
    };
  }, [open]);

  return (
    <>
      <div className="photo-strip">
        {photos.map((src, i) => (
          <img key={i} src={src} alt={`photo_${i}`} onClick={() => show(i)} />
        ))}
      </div>

      <div className={`lb-backdrop ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl" onClick={(e) => { e.stopPropagation(); next(-1); }}>‹</button>
        <img ref={imgRef} className="lb-img" src={photos[idx]} alt="full" onClick={(e) => e.stopPropagation()} />
        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl" onClick={(e) => { e.stopPropagation(); next(1); }}>›</button>
        <button className="absolute top-4 right-4 text-white text-2xl" onClick={() => setOpen(false)}>✕</button>
      </div>
    </>
  );
}
