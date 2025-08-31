import Link from "next/link";
import { titleOf, shortAddress } from "@/lib/fields";

function Img({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="w-full h-40 object-cover rounded-t-2xl" />;
}

export default function PropertyCard({ rec, href, cover } : { rec: any, href: string, cover: string }) {
  const addr = shortAddress(rec);
  return (
    <Link href={href} className="card hover:shadow-md transition-shadow block">
      {cover ? <Img src={cover} alt={titleOf(rec)} /> : <div className="h-40 bg-neutral-100 rounded-t-2xl" />}
      <div className="card-pad">
        <div className="text-sm text-neutral-500">{rec.city || ""} {addr && `• ${addr}`}</div>
        <div className="font-semibold line-clamp-2">{titleOf(rec)}</div>
        <div className="text-sm mt-1">{[rec.tip_pomescheniya, rec.etazh].filter(Boolean).join(" • ")}</div>
        <div className="text-sm mt-1">Площадь: {rec.dostupnaya_ploschad || "—"}</div>
      </div>
    </Link>
  );
}
