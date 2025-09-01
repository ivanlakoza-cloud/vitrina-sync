"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type Props = {
  cities: string[];
  /** Предвыбранное значение (например, пришло с сервера). Опционально. */
  value?: string;
};

const LABEL_ALL = "Все города";

export default function CityFilter({ cities, value }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  // Текущее значение: из пропса, из query (?city=), либо "Все города"
  const selected = value ?? params.get("city") ?? LABEL_ALL;

  // Убираем возможные дубли и значение "Все города" из базы,
  // затем собираем итоговый список с "Все города" первым.
  const items = useMemo(() => {
    const set = new Set<string>();
    for (const c of cities) {
      if (!c) continue;
      const name = c.trim();
      if (!name) continue;
      if (name !== LABEL_ALL) set.add(name);
    }
    return [LABEL_ALL, ...Array.from(set).sort((a, b) => a.localeCompare(b, "ru"))];
  }, [cities]);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value;
    const sp = new URLSearchParams(params.toString());
    if (city && city !== LABEL_ALL) {
      sp.set("city", city);
    } else {
      sp.delete("city");
    }
    const qs = sp.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  return (
    <select
      className="px-3 py-2 rounded border border-gray-300 bg-white text-gray-900"
      value={selected}
      onChange={onChange}
    >
      {items.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
