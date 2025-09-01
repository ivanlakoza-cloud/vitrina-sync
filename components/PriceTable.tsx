import React from "react";

type AnyRec = Record<string, any>;
type Size = "sm" | "md";

// Accept both old snake_case and new "price per m2 X" keys
const PRICE_KEYS: Array<[string, string[]]> = [
  ["20", ["price_per_m2_20", "price per m2 20"]],
  ["50", ["price_per_m2_50", "price per m2 50"]],
  ["100", ["price_per_m2_100", "price per m2 100"]],
  ["400", ["price_per_m2_400", "price per m2 400"]],
  ["700", ["price_per_m2_700", "price per m2 700"]],
  ["1500", ["price_per_m2_1500", "price per m2 1500"]],
];

function firstValue(rec: AnyRec, keys: string[]): string | null {
  for (const k of keys) {
    const v = rec?.[k];
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s !== "") return s;
    }
  }
  return null;
}

export default function PriceTable({
  rec,
  size = "md",
}: {
  rec: AnyRec;
  size?: Size;
}) {
  const textCls = size === "sm" ? "text-xs" : "text-sm";

  const rows = PRICE_KEYS.map(([label, keys]) => {
    const val = firstValue(rec, keys);
    if (!val) return null;
    return (
      <div key={label} className="grid grid-cols-2 gap-2">
        <div className={textCls}>от {label}</div>
        <div className={textCls}>{val}</div>
      </div>
    );
  }).filter(Boolean);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className={`grid grid-cols-2 gap-2 ${textCls}`}>
        <div className="font-semibold">Площадь</div>
        <div className="font-semibold">Цены, ₽/м²</div>
      </div>
      <div className="space-y-1">{rows}</div>
    </div>
  );
}
