'use client';

import { useRouter } from 'next/navigation';

type City = { id: string; name: string };

export default function CityFilter({
  cities,
  current,
}: {
  cities: City[];
  current?: string;
}) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    router.replace(v ? `/?city=${encodeURIComponent(v)}` : '/');
  }

  return (
    <div className="mb-6">
      <label className="mr-2 text-sm text-gray-600">Город:</label>
      <select
        className="border rounded px-2 py-1"
        defaultValue={current ?? ''}
        onChange={onChange}
      >
        <option value="">Все города</option>
        {cities.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
