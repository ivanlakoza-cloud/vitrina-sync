// components/PriceTable.tsx
"use client";
import React from "react";
import type { Prices } from "@/lib/fields";
import { formatPrice, pick } from "@/lib/fields";

export default function PriceTable({ rec, size = "md" }: { rec: Prices; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "text-sm" : "";

  // helper to extract first available value by possible keys
  const first = (keys: string[]) => pick<any>(rec as any, keys, null);

  const entries: Array<[string, React.ReactNode]> = [
    ["от 20", first(["price_per_m2_20", "price per m2 20"])],
    ["от 50", first(["price_per_m2_50", "price per m2 50"])],
    ["от 100", first(["price_per_m2_100", "price per m2 100"])],
    ["от 400", first(["price_per_m2_400", "price per m2 400"])],
    ["от 700", first(["price_per_m2_700", "price per m2 700"])],
    ["от 1500", first(["price_per_m2_1500", "price per m2 1500"])],
  ].map(([label, val]) => {
    const cell = val === null || val === undefined || String(val).trim() === ""
      ? "—"
      : `${formatPrice(val)} ₽`;
    return [label, cell];
  });

  // hide empty table (all rows are "—")
  const hasAny = entries.some(([, v]) => v !== "—");
  if (!hasAny) return null;

  return (
    <div className={`border rounded-xl p-3 ${cls}`}>
      <div className="grid grid-cols-[1fr_auto] gap-y-1 items-center">
        <div className="font-medium opacity-80">₽/м²</div>
        <div className="text-right opacity-60">в месяц</div>
        {entries.map(([k, v]) => (
          <React.Fragment key={k}>
            <div>{k}</div>
            <div className="text-right">{v}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}