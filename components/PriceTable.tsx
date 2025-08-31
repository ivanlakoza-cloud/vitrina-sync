import { pricePairs } from "@/lib/fields";

export default function PriceTable({ rec }: { rec: any }) {
  const pairs = pricePairs(rec);
  if (pairs.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="text-xs font-semibold text-center mb-1">Цены, ₽/м²</div>
      <div className="grid grid-cols-2 gap-y-1 text-sm">
        {pairs.map(p => (
          <>
            <div className="text-neutral-600">{p.label}</div>
            <div className="text-center font-semibold">{p.value}</div>
          </>
        ))}
      </div>
    </div>
  );
}
