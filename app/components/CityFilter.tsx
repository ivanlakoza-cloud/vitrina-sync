// app/components/CityFilter.tsx
'use client';

export default function CityFilter({
  cities,
  current,
}: {
  cities: { id: string; name: string }[];
  current?: string;
}) {
  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const url = new URL(window.location.href);
    if (v) url.searchParams.set('city', v);
    else url.searchParams.delete('city');
    url.searchParams.delete('page');
    window.location.href = url.toString();
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Город:</label>
      <select
        className="border rounded-md px-2 py-1 text-sm"
        value={current ?? ''}
        onChange={onChange}
      >
        <option value="">Все города</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
