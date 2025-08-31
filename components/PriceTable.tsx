import { pricePairs } from "@/lib/fields";

export default function PriceTable({ rec }: { rec: any }) {
  const pairs = pricePairs(rec);
  if (pairs.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="text-xs text-neutral-500 mb-1">Цены, ₽/м²</div>
      <div className="grid grid-cols-6 gap-1 text-sm">
        {pairs.map(p => (
          <div key={p.key} className="card text-center py-2">
            <div className="text-xs text-neutral-500">{p.label}</div>
            <div className="font-semibold">{p.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
