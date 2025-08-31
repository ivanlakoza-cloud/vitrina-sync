import { pricePairs } from "@/lib/fields";

export default function PriceTable({ rec }: { rec: any }) {
  const pairs = pricePairs(rec);
  if (pairs.length === 0) return null;
  return (
    <div className="mt-0">
      <div className="text-sm font-semibold text-center mb-1">Цены, ₽/м²</div>
      <div className="grid grid-cols-2 gap-y-1 text-sm">
        {pairs.map(p => (
          <>
            <div className="font-semibold">{p.label}</div>
            <div className="text-center">{p.value}</div>
          </>
        ))}
      </div>
    </div>
  );
}
