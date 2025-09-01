
export type Prices = {
  price_per_m2_20?: number | string | null;
  price_per_m2_50?: number | string | null;
  price_per_m2_100?: number | string | null;
  price_per_m2_400?: number | string | null;
  price_per_m2_700?: number | string | null;
  price_per_m2_1500?: number | string | null;
};

export default function PriceTable({ rec, size }: { rec: Prices; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "text-sm" : "";
  const rows: Array<[string, any]> = [
    ["от 20", rec.price_per_m2_20],
    ["от 50", rec.price_per_m2_50],
    ["от 100", rec.price_per_m2_100],
    ["от 400", rec.price_per_m2_400],
    ["от 700", rec.price_per_m2_700],
    ["от 1500", rec.price_per_m2_1500],
  ].filter(([_, v]) => v !== null && v !== undefined && String(v).trim() !== "");

  if (!rows.length) return null;

  return (
    <div className={`grid grid-cols-2 gap-x-4 ${cls}`}>
      {rows.map(([k, v]) => (
        <>
          <div className="text-muted-foreground">{k}</div>
          <div className="text-right">{v}</div>
        </>
      ))}
    </div>
  );
}
