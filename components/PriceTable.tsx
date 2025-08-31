import { pricePairs } from "@/lib/fields";
export default function PriceTable({ rec, alignPrices = "center", size = "base" }: { rec: any, alignPrices?: "left" | "center", size?: "base" | "sm" }) {
  const pairs = pricePairs(rec); if (pairs.length === 0) return null;
  const alignClass = alignPrices === "left" ? "text-left" : "text-center";
  const headSize = size === "sm" ? "text-sm" : "text-base";
  return (<div className="mt-2">
    <div className="grid grid-cols-2 gap-y-1">
      <div className={`font-semibold ${headSize}`}>Площадь</div>
      <div className={`font-semibold ${headSize} ${alignClass}`}>Цены, ₽/м²</div>
      {pairs.map((p,i)=>(<div key={i} className="contents">
        <div className="font-semibold text-sm">{p.label}</div>
        <div className={`${alignClass} text-sm`}>{p.value}</div>
      </div>))}
    </div>
  </div>);
}