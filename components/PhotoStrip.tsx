"use client";
import { useEffect, useRef, useState } from "react";

type Props = { urls: string[] };

export default function PhotoStrip({ urls }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (!urls || urls.length === 0) return null;

  const openAt = (i: number) => { setIndex(i); setOpen(true); };
  const close = () => setOpen(false);
  const prev = () => setIndex((i) => (i - 1 + urls.length) % urls.length);
  const next = () => setIndex((i) => (i + 1) % urls.length);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    // lock scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Swipe support
  const startX = useRef<number | null>(null);
  const deltaX = useRef(0);

  const onStart = (x: number) => { startX.current = x; deltaX.current = 0; };
  const onMove = (x: number) => { if (startX.current != null) deltaX.current = x - startX.current; };
  const onEnd = () => {
    if (startX.current == null) return;
    const threshold = 50;
    if (deltaX.current > threshold) prev();
    else if (deltaX.current < -threshold) next();
    startX.current = null;
    deltaX.current = 0;
  };

  return (
    <>
      {/* Thumbs */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {urls.map((u, i) => (
          <img
            key={i}
            src={u}
            alt={`Фото ${i + 1}`}
            className="h-40 w-64 object-cover rounded-xl border cursor-pointer flex-none"
            onClick={() => openAt(i)}
          />
        ))}
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          onTouchStart={(e) => onStart(e.changedTouches[0].clientX)}
          onTouchMove={(e) => onMove(e.changedTouches[0].clientX)}
          onTouchEnd={onEnd}
          onMouseDown={(e) => onStart(e.clientX)}
          onMouseMove={(e) => { if (e.buttons === 1) onMove(e.clientX); }}
          onMouseUp={onEnd}
        >
          <div className="relative w-full h-full max-w-6xl">
            {/* Close */}
            <button aria-label="Закрыть" onClick={close}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/90 hover:text-white text-2xl sm:text-3xl">
              ✕
            </button>

            {/* Prev/Next */}
            {urls.length > 1 && (
              <>
                <button aria-label="Назад" onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white/90 hover:text-white text-3xl sm:text-5xl select-none">
                  ‹
                </button>
                <button aria-label="Вперёд" onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/90 hover:text-white text-3xl sm:text-5xl select-none">
                  ›
                </button>
              </>
            )}

            {/* Image */}
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={urls[index]}
                alt={`Фото ${index + 1}`}
                className="max-h-[85vh] max-w-full object-contain"
                draggable={false}
              />
            </div>

            {/* Counter */}
            {urls.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/90 text-sm sm:text-base">
                {index + 1} / {urls.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
