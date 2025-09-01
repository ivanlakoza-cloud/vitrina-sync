
type Props = {
  rec: Record<string, any>;
  size?: "sm" | "md";
};

const rows = [
  { key: "price_per_m2_20", label: "от 20" },
  { key: "price_per_m2_50", label: "от 50" },
  { key: "price_per_m2_100", label: "от 100" },
  { key: "price_per_m2_400", label: "от 400" },
  { key: "price_per_m2_700", label: "от 700" },
  { key: "price_per_m2_1500", label: "от 1500" },
];

export default function PriceTable({ rec, size = "md" }: Props) {
  const text = size === "sm" ? "text-sm" : "text-base";
  const priceRows = rows.filter(r => rec[r.key]);
  if (priceRows.length === 0) return null;

  return (
    <div className={`mt-3 ${text}`}>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="font-semibold">Площадь</div>
          {priceRows.map(r => <div key={r.key} className="mt-2">{r.label}</div>)}
        </div>
        <div>
          <div className="font-semibold">Цены, ₽/м²</div>
          {priceRows.map(r => <div key={r.key} className="mt-2">{rec[r.key]}</div>)}
        </div>
      </div>
    </div>
  );
}
