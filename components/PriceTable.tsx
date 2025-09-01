
import React from "react";

type PriceVal = number | string | null | undefined;

export type PricesRec = {
  price_per_m2_20?: PriceVal;
  price_per_m2_50?: PriceVal;
  price_per_m2_100?: PriceVal;
  price_per_m2_400?: PriceVal;
  price_per_m2_700?: PriceVal;
  price_per_m2_1500?: PriceVal;
};

/** Simple price table with safe typing (no external type imports) */
export default function PriceTable({
  rec,
  size = "md",
}: {
  rec: PricesRec;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "text-sm" : "";

  const rows: Array<[string, React.ReactNode]> = [
    ["от 20", rec.price_per_m2_20],
    ["от 50", rec.price_per_m2_50],
    ["от 100", rec.price_per_m2_100],
    ["от 400", rec.price_per_m2_400],
    ["от 700", rec.price_per_m2_700],
    ["от 1500", rec.price_per_m2_1500],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  if (rows.length === 0) return null;

  return (
    <div className={`grid grid-cols-2 gap-x-6 ${cls}`}>
      <div className="text-muted-foreground">Площадь</div>
      <div className="text-muted-foreground">Цены, ₽/м²</div>
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <div className="text-muted-foreground">{label}</div>
          <div>{String(value)}</div>
        </React.Fragment>
      ))}
    </div>
  );
}
