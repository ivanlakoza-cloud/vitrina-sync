'use client';

import React, { useEffect, useState, useCallback } from 'react';

type Props = { photos: string[] };

export default function PhotoStrip({ photos }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const close = useCallback(() => setOpenIdx(null), []);
  const prev = useCallback(() => setOpenIdx((i) => (i === null ? null : (i + photos.length - 1) % photos.length)), [photos.length]);
  const next = useCallback(() => setOpenIdx((i) => (i === null ? null : (i + 1) % photos.length)), [photos.length]);

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIdx, close, prev, next]);

  if (!photos || photos.length === 0) return null;

  return (
    <div className="w-full">
      {/* Horizontal, swipeable strip */}
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {photos.map((src, i) => (
            <button
              key={i}
              type="button"
              className="snap-start shrink-0 focus:outline-none"
              onClick={() => setOpenIdx(i)}
              aria-label={`Открыть фото ${i + 1}`}
            >
              <img
                src={src}
                alt={`Фото ${i + 1}`}
                className="h-56 md:h-64 rounded-xl object-cover w-[360px] md:w-[420px]"
                loading={i > 2 ? 'lazy' : 'eager'}
                decoding="async"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Minimal lightbox with keyboard & swipe-like controls */}
      {openIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/20 hover:bg-white/30 p-3 backdrop-blur"
            aria-label="Предыдущее фото"
          >
            ‹
          </button>

          <img
            src={photos[openIdx]}
            alt={`Фото ${openIdx + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/20 hover:bg-white/30 p-3 backdrop-blur"
            aria-label="Следующее фото"
          >
            ›
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="absolute top-4 right-4 md:top-6 md:right-6 rounded-full bg-white/20 hover:bg-white/30 p-2 backdrop-blur"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
