"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function CityFilter({ cities, value }: { cities: string[]; value?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const current = value || sp.get("city") || "Все города";

  const opts = ["Все города", ...cities.filter(c => c !== "Все города")];

  return (
    <select
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "Все города") router.push("/");
        else router.push(`/?city=${encodeURIComponent(v)}`);
      }}
      className="border rounded px-3 py-2"
    >
      {opts.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}