"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Props = { cities: string[] };

export default function CityFilter({ cities }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("city") || "";

  const onChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value;
    const next = new URLSearchParams(params.toString());
    if (city) next.set("city", city); else next.delete("city");
    router.push(`${pathname}?${next.toString()}`);
  }, [params, pathname, router]);

  return (
    <div className="mb-6">
      <label className="mr-2">Город:</label>
      <select className="border rounded px-2 py-1" value={selected} onChange={onChange}>
        <option value="">Все города</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}
