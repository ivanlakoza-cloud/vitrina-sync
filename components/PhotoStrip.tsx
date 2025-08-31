"use client";

import { useEffect, useState } from "react";

export default function PhotoStrip({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  if (!urls?.length) return null;

  function onThumbClick(i: number) {
    setIdx(i);
    setOpen(true);
  }

  function prev() { setIdx((i) => (i - 1 + urls.length) % urls.length); }
  function next() { setIdx((i) => (i + 1) % urls.length); }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="card hscroll" style={{ maxHeight: 300 }}>
        <div className="flex gap-2 p-2">
          {urls.map((u, i) => (
            <img
              key={i}
              src={u}
              alt={`Фото ${i+1}`}
              className="h-[150px] rounded-xl object-cover cursor-pointer"
              onClick={() => onThumbClick(i)}
            />
          ))}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Закрыть"
            onClick={() => setOpen(false)}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button
            className="absolute left-4 md:left-8 text-white/80 hover:text-white"
            aria-label="Предыдущее"
            onClick={prev}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <img src={urls[idx]} alt={`Фото ${idx+1}`} className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg" />

          <button
            className="absolute right-4 md:right-8 text-white/80 hover:text-white"
            aria-label="Следующее"
            onClick={next}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm">
            {idx + 1} / {urls.length}
          </div>
        </div>
      )}
    </>
  );
}
