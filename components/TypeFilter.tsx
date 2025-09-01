"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

/**
 * Фильтр "Тип помещения" для главной.
 * Работает через query-параметр `type` (AND вместе с `city`).
 * Пример значения: "Торговое помещение", "Офисное помещение", "Складское помещение".
 */
export default function TypeFilter({ options }: { options: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const value = search.get("type") ?? "";

  function update(next: string) {
    const params = new URLSearchParams(search.toString());
    if (next) params.set("type", next);
    else params.delete("type");
    // сохраняем выбранный город и остальные параметры
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <select
      className="border rounded-lg px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-gray-300"
      value={value}
      onChange={(e) => update(e.target.value)}
      disabled={isPending}
      aria-label="Тип помещения"
      title="Тип помещения"
    >
      <option value="">Все типы</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
