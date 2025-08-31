import Link from "next/link";
import PriceTable from "@/components/PriceTable";
import { shortAddress } from "@/lib/fields";

function Img({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="w-full h-40 object-cover rounded-t-2xl" />;
}

export default function PropertyCard({ rec, href, cover } : { rec: any, href: string, cover: string }) {
  const addr = shortAddress(rec);
  const city = rec.otobrazit_vse || rec.city || "";
  const typeFloor = [rec.tip_pomescheniya, rec.etazh ? `Этаж - ${rec.etazh}` : ""].filter(Boolean).join(" • ");

  return (
    <Link href={href} className="card hover:shadow-md transition-shadow block">
      {cover ? <Img src={cover} alt={addr || city || 'Объект'} /> : <div className="h-40 bg-neutral-100 rounded-t-2xl" />}
      <div className="card-pad">
        <div className="text-sm text-neutral-500">
          {addr ? `• ${city ? city + ", " : ""}${addr}` : (city ? `• ${city}` : "")}
        </div>
        <div className="text-sm mt-1">{typeFloor}</div>
        <div className="text-sm mt-1">Площадь: {rec.dostupnaya_ploschad || "—"}</div>
        <PriceTable rec={rec} />
      </div>
    </Link>
  );
}
