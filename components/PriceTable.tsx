import { pricePairs } from "@/lib/fields";

export default function PriceTable({ rec }: { rec: any }) {
  const pairs = pricePairs(rec);
  if (pairs.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="grid grid-cols-2 gap-y-1">
        <div className="font-semibold text-base">Площадь</div>
        <div className="font-semibold text-base text-center">Цены, ₽/м²</div>
        {pairs.map((p, i) => (
          <>
            <div className="font-semibold text-sm">{p.label}</div>
            <div className="text-center text-sm">{p.value}</div>
          </>
        ))}
      </div>
    </div>
  );
}
