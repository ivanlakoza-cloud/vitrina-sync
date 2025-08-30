"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Props = {
  cities: string[];
  selected?: string;
};

export default function CityFilter({ cities, selected }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams(search.toString());
    if (!value) params.delete("city");
    else params.set("city", value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/?${qs}` : "/");
    });
  }

  return (
    <label className="inline-flex items-center gap-2">
      <span>Город:</span>
      <select
        value={selected ?? ""}
        onChange={onChange}
        disabled={isPending}
        className="rounded-md border px-2 py-1"
      >
        <option value="">Все города</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}