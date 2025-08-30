'use client';

import React from 'react';

type Props = {
  currentCity: string;
  options: string[];
};

/**
 * Автоприменяемый фильтр по городу.
 * Клиентский компонент: при выборе значения сразу сабмитит форму (GET).
 */
export default function CityFilter({ currentCity, options }: Props) {
  return (
    <form action="/" method="get" className="mb-4 flex items-center gap-2">
      <label htmlFor="city">Город:</label>
      <select
        id="city"
        name="city"
        defaultValue={currentCity}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="border rounded px-2 py-1"
      >
        <option value="">Все города</option>
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </form>
  );
}
