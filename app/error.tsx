"use client";
import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="text-xl font-semibold text-red-600 mb-2">
            Что-то пошло не так
          </div>
          <div className="text-sm opacity-60 mb-4">
            {error?.message || "Неизвестная ошибка"}{error?.digest ? ` · ${error.digest}` : ""}
          </div>
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white"
          >
            Повторить попытку
          </button>
        </div>
      </body>
    </html>
  );
}
