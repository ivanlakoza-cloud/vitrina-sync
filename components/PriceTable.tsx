import React from "react";
import type { Prices } from "@/lib/fields";

export default function PriceTable({ rec, size = "md" }: { rec: Prices; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "text-sm" : "";

  // Формируем пары [лейбл, значение] и отбрасываем пустые — с корректным type guard,
  // чтобы сохранить кортежи [string, value] для TypeScript.
  const raw: [string, string | number | null | undefined][] = [
    ["от 20",  (rec as any).price_per_m2_20],
    ["от 50",  (rec as any).price_per_m2_50],
    ["от 100", (rec as any).price_per_m2_100],
    ["от 400", (rec as any).price_per_m2_400],
    ["от 700", (rec as any).price_per_m2_700],
    ["от 1500",(rec as any).price_per_m2_1500],
  ];

  const rows: [string, string | number][] = raw.filter(
    (pair): pair is [string, string | number] =>
      pair[1] !== null && pair[1] !== undefined && pair[1] !== ""
  );

  if (!rows.length) return null;

  return (
    <div className={`grid grid-cols-2 gap-x-6 gap-y-1 ${cls}`}>
      <div className="text-muted-foreground">Площадь</div>
      <div className="text-muted-foreground">Цены, ₽/м²</div>
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <div>{label}</div>
          <div>{value}</div>
        </React.Fragment>
      ))}
    </div>
  );
}
