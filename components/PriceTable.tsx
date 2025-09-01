type Prices = Record<string, any>;

export default function PriceTable({ rec, size = "md" }: { rec: Prices; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "text-sm" : "";
  const rows: Array<[string, any]> = [
    ["от 20", rec.price_per_m2_20],
    ["от 50", rec.price_per_m2_50],
    ["от 100", rec.price_per_m2_100],
    ["от 400", rec.price_per_m2_400],
    ["от 700", rec.price_per_m2_700],
    ["от 1500", rec.price_per_m2_1500],
  ].filter(([, v]) => v !== null && v !== undefined);

  if (!rows.length) return null;

  return (
    <div className={cls}>
      <div className="grid grid-cols-2 gap-x-8">
        <div className="font-semibold">Площадь</div>
        <div className="font-semibold">Цены, ₽/м²</div>
        {rows.map(([label, val]) => (
          <>
            <div>{label}</div>
            <div>{val}</div>
          </>
        ))}
      </div>
    </div>
  );
}
