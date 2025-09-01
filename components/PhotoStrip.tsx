
"use client";
import React, { useEffect, useState, useCallback } from "react";

export default function PhotoStrip({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const close = useCallback(() => setOpen(false), []);
  const next = useCallback(() => setIdx(i => (i + 1) % photos.length), [photos.length]);
  const prev = useCallback(() => setIdx(i => (i - 1 + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next, prev]);

  if (!photos?.length) return null;

  return (
    <div>
      <div className="overflow-x-auto whitespace-nowrap space-x-2 pb-1">
        {photos.map((src, i) => (
          <img
            key={src}
            src={src}
            alt="Фотография"
            className="inline-block h-32 w-auto rounded-xl object-cover cursor-pointer"
            onClick={() => { setIdx(i); setOpen(true); }}
          />
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <button className="absolute top-4 right-4 text-white text-2xl" onClick={close}>✕</button>
          <button className="absolute left-4 text-white text-3xl" onClick={prev}>‹</button>
          <img src={photos[idx]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain rounded" />
          <button className="absolute right-4 text-white text-3xl" onClick={next}>›</button>
        </div>
      )}
    </div>
  );
}
