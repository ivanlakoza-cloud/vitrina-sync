// @ts-nocheck
import React from "react";

/**
 * Price table that tolerates both snake_case (price_per_m2_50) and
 * spaced column names ("price per m2 50").
 */
function pick(obj: any, keys: string[]) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return null;
}

const ROWS = [
  { key: "20", label: "от 20" },
  { key: "50", label: "от 50" },
  { key: "100", label: "от 100" },
  { key: "400", label: "от 400" },
  { key: "700", label: "от 700" },
  { key: "1500", label: "от 1500" },
];

export default function PriceTable({ rec }: { rec: any }) {
  const rows = ROWS.map((r) => {
    const val = pick(rec, [
      `price per m2 ${r.key}`,
      `price_per_m2_${r.key}`,
      `price_per_m_${r.key}`, // just-in-case typo
    ]);
  return { label: r.label, value: val };
  }).filter(r => r.value !== null);

  if (!rows.length) return null;

  return (
    <div className="rounded-md border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-2 text-sm">
        <div className="px-3 py-2 font-semibold">Площадь</div>
        <div className="px-3 py-2 font-semibold text-left">Цены, ₽/м²</div>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-2 text-sm border-t border-gray-100"
        >
          <div className="px-3 py-2">{r.label}</div>
          <div className="px-3 py-2">{String(r.value)}</div>
        </div>
      ))}
    </div>
  );
}
