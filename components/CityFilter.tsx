"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Props = {
  cities: string[];
  selected?: string;
};

export default function CityFilter({ cities, selected }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const value = selected && selected.length ? selected : "Все города";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const sp = new URLSearchParams(searchParams.toString());
    if (!next || next === "Все города") sp.delete("city");
    else sp.set("city", next);
    // оставляем выбранный тип
    const url = `${pathname}${sp.toString() ? "?" + sp.toString() : ""}`;
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  }

  const options = ["Все города", ...cities];

  return (
    <select
      className="border rounded-2xl px-4 py-3 text-lg outline-none"
      value={value}
      onChange={onChange}
      aria-label="Фильтр по городу"
      disabled={isPending}
    >
      {options.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
