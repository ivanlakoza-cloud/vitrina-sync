"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function CityFilter({ cities }: { cities: string[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const value = params.get("city") || "";
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-lg">Город:</span>
      <select
        className="border rounded-lg px-3 py-2 bg-white"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          const q = new URLSearchParams(Array.from(params.entries()));
          if (v) q.set("city", v); else q.delete("city");
          router.push(`/?${q.toString()}`);
        }}>
        <option value="">Все города</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}
