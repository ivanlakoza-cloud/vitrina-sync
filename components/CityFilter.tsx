
"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function CityFilter({ cities, value }: { cities: string[]; value?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const selected = value || sp.get("city") || "Все города";
  return (
    <select
      className="border rounded-xl px-3 py-2"
      value={selected}
      onChange={(e) => {
        const v = e.target.value;
        const url = v === "Все города" ? "/" : `/?city=${encodeURIComponent(v)}`;
        router.push(url);
      }}
    >
      {cities.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}
