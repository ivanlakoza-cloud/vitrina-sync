"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Props = {
  /** Новый проп */
  types?: string[];
  /** Обратная совместимость со старой разметкой: <TypeFilter options={types} /> */
  options?: string[];
  selected?: string;
};

export default function TypeFilter({ types, options, selected }: Props) {
  const list = types ?? options ?? [];
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const value = selected && selected.length ? selected : "Все типы";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const sp = new URLSearchParams(searchParams.toString());
    if (!next || next === "Все типы") sp.delete("type");
    else sp.set("type", next);
    const url = `${pathname}${sp.toString() ? "?" + sp.toString() : ""}`;
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  }

  const optionsList = ["Все типы", ...list];

  return (
    <select
      className="border rounded-2xl px-4 py-3 text-lg outline-none"
      value={value}
      onChange={onChange}
      aria-label="Фильтр по типу"
      disabled={isPending}
    >
      {optionsList.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
