'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  images: string[];
  alt?: string;
  className?: string;
  thumbHeight?: number; // px
};

// Simple, dependency-free lightbox with swipe support
export default function PhotoStrip({ images, alt = 'Фото объекта', className = '', thumbHeight = 220 }: Props) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const openAt = useCallback((i: number) => () => {
    setIdx(i);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const next = useCallback(() => setIdx(i => (i + 1) % images.length), [images.length]);
  const prev = useCallback(() => setIdx(i => (i - 1 + images.length) % images.length), [images.length]);

  // ESC to close, arrows to navigate
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, next, prev]);

  // Touch swipe
  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) {
      dx < 0 ? next() : prev();
    }
    startX.current = null;
  };

  if (!images?.length) {
    return (
      <div className={"w-full h-56 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 " + className}>
        Фото недоступно
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={openAt(i)}
            className="shrink-0 focus:outline-none"
            style={{ height: thumbHeight, width: Math.floor(thumbHeight * 1.6) }}
            aria-label={`Открыть фото ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="h-full w-full object-cover rounded-xl border border-gray-200"
              draggable={false}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white"
            aria-label="Предыдущее фото"
          >
            ‹
          </button>

          <div className="max-w-[95vw] max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[idx]}
              alt={alt}
              className="max-h-[86vh] max-w-[92vw] object-contain rounded-lg"
              draggable={false}
            />
            <div className="mt-2 text-center text-white/80 text-sm">{idx + 1} / {images.length}</div>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white"
            aria-label="Следующее фото"
          >
            ›
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white/80 hover:text-white text-2xl"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
