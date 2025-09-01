"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

/** Селект фильтра по типу помещения (AND с city). Пишет ?type= в URL. */
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
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <select
      className="border rounded-xl px-3 py-2"
      value={value}
      onChange={(e) => update(e.target.value)}
      disabled={isPending}
      aria-label="Тип помещения"
      title="Тип помещения"
    >
      <option value="">Все типы</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}
