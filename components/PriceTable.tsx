import React from "react";

type PricesRec = Record<string, any>;

function pick(rec: PricesRec, keys: string[]) {
  for (const k of keys) {
    const v = rec?.[k];
    if (v !== undefined && v !== null && v !== "" && v !== "—" && v !== "-") return v;
  }
  return null;
}

export default function PriceTable({ rec, size = "md" }: { rec: PricesRec; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "text-sm" : "";

  const rows: Array<[string, React.ReactNode]> = [
    ["от 20",  pick(rec, ["price_per_m2_20",  "price per m2 20"])],
    ["от 50",  pick(rec, ["price_per_m2_50",  "price per m2 50"])],
    ["от 100", pick(rec, ["price_per_m2_100", "price per m2 100"])],
    ["от 400", pick(rec, ["price_per_m2_400", "price per m2 400"])],
    ["от 700", pick(rec, ["price_per_m2_700", "price per m2 700"])],
    ["от 1500",pick(rec, ["price_per_m2_1500","price per m2 1500"])],
  ].filter(([, v]) => v !== null);

  if (rows.length === 0) return null;

  return (
    <table className={"w-full " + cls}>
      <thead>
        <tr>
          <th className="text-left font-semibold">Площадь</th>
          <th className="text-left font-semibold">Цены, ₽/м²</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className="pr-6 py-1">{label}</td>
            <td className="py-1">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
