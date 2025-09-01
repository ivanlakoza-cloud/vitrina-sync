"use client";
import React from "react";

export default function ObjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6">
      <div className="text-lg font-semibold text-red-600 mb-2">
        Не удалось загрузить объект
      </div>
      <div className="text-sm opacity-60 mb-4">
        {error?.message || "Параметр отсутствует или временно недоступен"}{error?.digest ? ` · ${error.digest}` : ""}
      </div>
      <button
        onClick={() => reset()}
        className="px-4 py-2 rounded-xl bg-neutral-900 text-white"
      >
        Обновить
      </button>
    </div>
  );
}
