"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function CityFilter({ cities }: { cities: string[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const city = sp.get("city") || "";

  const opts = useMemo(
    () => ["", ...cities.filter(Boolean).sort((a,b)=>a.localeCompare(b,"ru"))],
    [cities]
  );

  return (
    <form className="flex items-center gap-3 mb-4">
      <label className="text-sm">Город:</label>
      <select
        className="select"
        name="city"
        defaultValue={city}
        onChange={(e) => {
          const v = e.currentTarget.value;
          const url = new URL(window.location.href);
          if (v) url.searchParams.set('city', v);
          else url.searchParams.delete('city');
          router.push(url.toString());
        }}
      >
        {opts.map((c, i) => (
          <option key={i} value={c}>{c || "Все города"}</option>
        ))}
      </select>
    </form>
  );
}
