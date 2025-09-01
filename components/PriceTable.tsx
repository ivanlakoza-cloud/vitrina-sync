"use client";
import React from "react";
import { PRICE_KEYS, DomusRow } from "@/lib/fields";

type Props = { rec: DomusRow; size?: "sm" | "md" };

export default function PriceTable({ rec, size = "md" }: Props) {
  const rows = PRICE_KEYS
    .map(({ key, label }) => (rec[key] ? { label, value: String(rec[key]) } : null))
    .filter(Boolean) as Array<{ label: string; value: string }>;

  if (rows.length === 0) return null;

  const grid = size === "sm" ? "text-xs gap-x-6" : "gap-x-10";

  return (
    <div className="mt-2">
      <div className={`grid grid-cols-[auto,1fr] ${grid}`}>
        <div className="font-semibold">Площадь</div>
        <div className="font-semibold">Цены, ₽/м²</div>
        {rows.map((r) => (
          <React.Fragment key={r.label}>
            <div>{r.label}</div>
            <div>{r.value}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
