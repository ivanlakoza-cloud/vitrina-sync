
"use client";

type Prices = {
  "price per m2 20"?: string | number | null;
  "price per m2 50"?: string | number | null;
  "price per m2 100"?: string | number | null;
  "price per m2 400"?: string | number | null;
  "price per m2 700"?: string | number | null;
  "price per m2 1500"?: string | number | null;
  price_per_m2_20?: string | number | null;
  price_per_m2_50?: string | number | null;
  price_per_m2_100?: string | number | null;
  price_per_m2_400?: string | number | null;
  price_per_m2_700?: string | number | null;
  price_per_m2_1500?: string | number | null;
};

function pick(v:any) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export default function PriceTable({ rec }: { rec: Prices }) {
  const rows = [
    ["от 20", pick(rec["price per m2 20"] ?? rec.price_per_m2_20)],
    ["от 50", pick(rec["price per m2 50"] ?? rec.price_per_m2_50)],
    ["от 100", pick(rec["price per m2 100"] ?? rec.price_per_m2_100)],
    ["от 400", pick(rec["price per m2 400"] ?? rec.price_per_m2_400)],
    ["от 700", pick(rec["price per m2 700"] ?? rec.price_per_m2_700)],
    ["от 1500", pick(rec["price per m2 1500"] ?? rec.price_per_m2_1500)],
  ].filter(([,v]) => v);

  if (!rows.length) return null;

  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-8 text-sm">
      <div className="font-semibold">Площадь</div>
      <div className="font-semibold">Цены, ₽/м²</div>
      {rows.map(([label, val]) => (
        <>
          <div>{label}</div>
          <div className="text-left">{String(val)}</div>
        </>
      ))}
    </div>
  );
}
