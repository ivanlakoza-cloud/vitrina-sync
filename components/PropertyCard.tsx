import Link from "next/link";
import PriceTable from "@/components/PriceTable";
import { shortAddress } from "@/lib/fields";

function Img({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="w-full h-40 object-cover rounded-t-2xl" />;
}

export default function PropertyCard({ rec, href, cover } : { rec: any, href: string, cover: string }) {
  const addr = shortAddress(rec);
  const city = rec.otobrazit_vse || rec.city || "";
  const parts: string[] = [];
  if (rec.tip_pomescheniya) parts.push(String(rec.tip_pomescheniya));
  if (rec.etazh) parts.push(`Этаж - ${rec.etazh}`);
  const typeFloor = parts.join(", ");
  const heading = city && addr ? `${city}, ${addr}` : (addr || city || "");

  return (
    <Link href={href} className="card hover:shadow-md transition-shadow block">
      {cover ? <Img src={cover} alt={heading || 'Объект'} /> : <div className="h-40 bg-neutral-100 rounded-t-2xl" />}
      <div className="card-pad">
        {heading && <div className="font-semibold">{heading}</div>}
        {typeFloor && <div className="text-sm mt-1">{typeFloor}</div>}
        <div className="text-sm mt-1">Доступно: {(rec.dostupnaya_ploschad ? String(rec.dostupnaya_ploschad) + " м²" : "—")}</div>
        <PriceTable rec={rec} />
      </div>
    </Link>
  );
}
