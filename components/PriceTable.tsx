// components/PriceTable.tsx
"use client";
import React from "react";

type AnyRec = Record<string, any>;

function getRaw(rec: AnyRec, keys: string[]): string | null {
  for (const k of keys) {
    const v = rec?.[k];
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return null;
}

export default function PriceTable({ rec, size = "md" }: { rec: AnyRec; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "text-sm" : "";

  const defs: Array<[string, string[]]> = [
    ["от 20", ["price_per_m2_20", "price per m2 20"]],
    ["от 50", ["price_per_m2_50", "price per m2 50"]],
    ["от 100", ["price_per_m2_100", "price per m2 100"]],
    ["от 400", ["price_per_m2_400", "price per m2 400"]],
    ["от 700", ["price_per_m2_700", "price per m2 700"]],
    ["от 1500", ["price_per_m2_1500", "price per m2 1500"]],
  ];

  const rows: Array<[string, string]> = [];
  for (const [label, keys] of defs) {
    const val = getRaw(rec, keys);
    if (val) rows.push([label, val]); // keep exactly as in DB (e.g., "980 – 1180")
  }

  if (rows.length === 0) return null;

  return (
    <div className={`border rounded-xl p-3 ${cls}`}>
      <div className="grid grid-cols-[1fr_auto] gap-y-1 items-center">
        <div className="font-medium opacity-80">Площадь</div>
        <div className="text-right opacity-80">Цена м²</div>
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <div className="font-semibold">{k}</div>
            <div className="text-right">{v}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
