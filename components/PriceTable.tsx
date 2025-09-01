import React from 'react';

// Reads price-per-m2 fields from record
const keys = [
  { k: 'price_per_m2_20', label: 'от 20' },
  { k: 'price_per_m2_50', label: 'от 50' },
  { k: 'price_per_m2_100', label: 'от 100' },
  { k: 'price_per_m2_400', label: 'от 400' },
  { k: 'price_per_m2_700', label: 'от 700' },
  { k: 'price_per_m2_1500', label: 'от 1500' },
] as const;

export default function PriceTable({ rec }: { rec: any }) {
  const rows = keys
    .map(({k,label}) => ({ label, val: rec?.[k] ?? rec?.[k.toUpperCase?.() ?? ''] }))
    .filter(r => r.val != null && r.val !== '');

  if (rows.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-[1fr,1fr] gap-x-6">
        <div className="text-gray-500">Площадь</div>
        <div className="text-gray-500">Цены, ₽/м²</div>
      </div>
      <div className="mt-1 space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr,1fr] gap-x-6">
            <div>{r.label}</div>
            <div>{String(r.val)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
