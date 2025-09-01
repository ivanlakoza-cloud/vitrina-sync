
'use client';
import { useRouter, useSearchParams } from "next/navigation";

type Props = { cities: string[]; value?: string };

export default function CityFilter({ cities, value }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const selected = value ?? params.get("city") ?? "Все города";

  const uniq = Array.from(new Set(["Все города", ...cities.filter(Boolean).filter(c => c !== "Все города")]));
  return (
    <select
      value={selected}
      onChange={(e) => {
        const v = e.target.value;
        const qs = new URLSearchParams(Array.from(params.entries()));
        if (v && v !== "Все города") qs.set("city", v); else qs.delete("city");
        router.push(`/?${qs.toString()}`);
      }}
      className="select select-bordered"
    >
      {uniq.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}
