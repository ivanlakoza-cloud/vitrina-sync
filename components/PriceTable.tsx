// components/PriceTable.tsx
// Safe typing for possibly-null price fields + compact table rendering

type PriceValue = string | number | null | undefined;

export type Prices = {
  price_per_m2_20?: PriceValue;
  price_per_m2_50?: PriceValue;
  price_per_m2_100?: PriceValue;
  price_per_m2_400?: PriceValue;
  price_per_m2_700?: PriceValue;
  price_per_m2_1500?: PriceValue;
};

function formatPrice(v: PriceValue) {
  if (v === null || v === undefined || v === "") return "—";
  const n =
    typeof v === "string"
      ? Number(v.replace(/\s/g, "").replace(",", "."))
      : Number(v);
  if (!isFinite(n)) return String(v);
  try {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(v);
  }
}

export default function PriceTable({
  rec,
  size = "md",
}: {
  rec: Prices;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "text-sm" : "";

  const rows: Array<[string, PriceValue]> = [
    ["от 20", rec.price_per_m2_20],
    ["от 50", rec.price_per_m2_50],
    ["от 100", rec.price_per_m2_100],
    ["от 400", rec.price_per_m2_400],
    ["от 700", rec.price_per_m2_700],
    ["от 1500", rec.price_per_m2_1500],
  ];

  return (
    <table className={`w-full ${cls}`}>
      <tbody>
        {rows.map(([label, val]) => (
          <tr key={label}>
            <td className="pr-3 py-0.5 whitespace-nowrap">{label}</td>
            <td className="text-right py-0.5">{formatPrice(val)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}