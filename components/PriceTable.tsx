// components/PriceTable.tsx
"use client";
import React from "react";
import type { Prices } from "@/lib/fields";
import { formatPrice, pick } from "@/lib/fields";

function toRange(val: any): React.ReactNode | null {
  if (val === null || val === undefined) return null;
  // If array [min, max]
  if (Array.isArray(val) && val.length) {
    const [a, b] = val;
    const left = a !== undefined && a !== null ? formatPrice(a) : null;
    const right = b !== undefined && b !== null ? formatPrice(b) : null;
    if (left && right) return `${left} – ${right}`;
    if (left) return left;
    if (right) return right;
    return null;
  }
  // If object {min, max}
  if (typeof val === "object" && ("min" in val || "max" in val)) {
    const a = (val as any).min, b = (val as any).max;
    const left = a !== undefined && a !== null ? formatPrice(a) : null;
    const right = b !== undefined && b !== null ? formatPrice(b) : null;
    if (left && right) return `${left} – ${right}`;
    if (left) return left;
    if (right) return right;
    return null;
  }
  // Primitive
  const s = formatPrice(val);
  if (!s || s === "—") return null;
  return s;
}

export default function PriceTable({ rec, size = "md" }: { rec: Prices; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "text-sm" : "";

  const first = (keys: string[]) => pick<any>(rec as any, keys, null);

  const entries: Array<[string, React.ReactNode | null]> = [
    ["от 20", toRange(first(["price_per_m2_20", "price per m2 20"]))],
    ["от 50", toRange(first(["price_per_m2_50", "price per m2 50"]))],
    ["от 100", toRange(first(["price_per_m2_100", "price per m2 100"]))],
    ["от 400", toRange(first(["price_per_m2_400", "price per m2 400"]))],
    ["от 700", toRange(first(["price_per_m2_700", "price per m2 700"]))],
    ["от 1500", toRange(first(["price_per_m2_1500", "price per m2 1500"]))],
  ];

  const rows = entries.filter(([, v]) => v !== null);

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
