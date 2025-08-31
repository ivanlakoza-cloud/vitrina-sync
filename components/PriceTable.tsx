import { pricePairs } from "@/lib/fields";

export default function PriceTable({ rec }: { rec: any }) {
  const pairs = pricePairs(rec);
  if (pairs.length === 0) return null;
  return (
    <div className="mt-2 text-sm">
      <div className="grid grid-cols-2 gap-y-1">
        <div className="font-semibold">Площадь</div>
        <div className="font-semibold text-center">Цены, ₽/м²</div>
        {pairs.map((p) => (
          <>
            <div className="font-semibold">{p.label}</div>
            <div className="text-center">{p.value}</div>
          </>
        ))}
      </div>
    </div>
  );
}
