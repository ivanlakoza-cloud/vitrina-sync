"use client";
import React, { useMemo, useState, useCallback, useEffect } from "react";

type Props = { photos: string[] };

export default function PhotoStrip({ photos }: Props) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const show = useCallback((i: number) => { setIdx(i); setOpen(true); }, []);

  // клавиатура для лайткса
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setIdx(i => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (!photos?.length) return null;

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-4">
        {photos.slice(0, 12).map((src, i) => (
          <button
            key={src + i}
            onClick={() => show(i)}
            className="rounded overflow-hidden focus:outline-none focus:ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Фото ${i + 1}`} className="h-48 w-full object-cover" />
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl"
            onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + photos.length) % photos.length); }}
          >
            ‹
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[idx]} alt={`Фото ${idx + 1}`} className="max-h-[90vh] max-w-[90vw] object-contain" />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl"
            onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % photos.length); }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}