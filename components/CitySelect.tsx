"use client";
import React from "react";

export default function CitySelect({ cities, selected }: { cities: string[]; selected: string }) {
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.currentTarget.value;
    const url = new URL(window.location.href);
    if (v && v !== "Все города") url.searchParams.set("city", v);
    else url.searchParams.delete("city");
    window.location.href = url.toString();
  };
  return (
    <select
      name="city"
      defaultValue={selected}
      onChange={onChange}
      className="border rounded-xl px-3 py-2"
    >
      <option>Все города</option>
      {cities.map((c) => (
        <option key={c}>{c}</option>
      ))}
    </select>
  );
}
