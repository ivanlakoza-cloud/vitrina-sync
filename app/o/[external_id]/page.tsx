import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";
import { prettyLabels } from "@/lib/fields";
import { buildColumns } from "@/lib/detail-utils";
import { fetchByExternalId, getGallery, fetchColumnLabels } from "@/app/data";

type Props = { params: { external_id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const rec = await fetchByExternalId(params.external_id);
  const title = rec?.adres_avito ?? rec?.zagolovok ?? "Объект";
  return { title };
}

export default async function Page({ params }: Props) {
  const rec: any = await fetchByExternalId(params.external_id);
  if (!rec) {
    return <div className="p-6">Объект не найден</div>;
  }

  const id = String(rec.id || rec.external_id || params.external_id);
  const images: string[] = await getGallery(id);
  const labels = await fetchColumnLabels(); // column->description mapping if available

  // Header: use Avito address if present, fallback to composed address/title
  const headerTitle: string = rec.adres_avito || rec.zagolovok || "Объект";

  // Main block fields
  const tipPom = rec.tip_pomescheniya || rec.tip_pomeshcheniya || rec.tip || rec['Тип помещения'] || "—";
  const etazh = rec.etazh ?? rec.etazh_avito ?? "—";
  const dostupno = rec.dostupnaya_ploschad ? `${rec.dostupnaya_ploschad} м²` : "—";
  const km = (rec.km_ ?? rec.km ?? null);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton />
        <h1 className="text-2xl md:text-3xl font-semibold">{headerTitle}</h1>
      </div>

      {/* Gallery with lightbox */}
      <PhotoStrip images={images} alt={headerTitle} className="mt-2" />

      {/* 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: main info */}
        <div className="card">
          <div className="grid grid-cols-[1fr,1fr] gap-y-3 gap-x-6">
            <div className="text-gray-500">Тип помещения</div>
            <div className="font-medium">{tipPom}</div>

            <div className="text-gray-500">Этаж</div>
            <div>{etazh}</div>

            <div className="text-gray-500">Доступная площадь</div>
            <div>{dostupno}</div>

            <div className="col-span-2">
              <PriceTable rec={rec} />
            </div>

            {km != null && (
              <>
                <div className="text-gray-500">KM %</div>
                <div>{km}</div>
              </>
            )}
          </div>
        </div>

        {/* Middle & Right: other attributes (evenly distributed) */}
        {(() => {
          const [a, b, c] = buildColumns(rec, labels ?? {});
          const render = (items: any[]) => (
            <div className="card space-y-3">
              {items.map((it, i) => {
                if (it.kind === 'section') {
                  return <div key={'s'+i} className="pt-2 text-gray-700 font-semibold">{it.title}</div>;
                }
                return (
                  <div key={it.key} className="grid grid-cols-[1fr,1fr] gap-x-6">
                    <div className="text-gray-500">{it.label}</div>
                    <div className="break-words">{String(it.value)}</div>
                  </div>
                );
              })}
            </div>
          );
          return (
            <>
              {render(a)}
              {render(b)}
              {render(c)}
            </>
          );
        })()}
      </div>

      {/* Footer: title + description */}
      {(rec.zagolovok || rec.tekst_obyavleniya) && (
        <div className="card">
          {rec.zagolovok && <div className="text-xl font-semibold mb-2">{rec.zagolovok}</div>}
          {rec.tekst_obyavleniya && <div className="whitespace-pre-wrap leading-relaxed">{rec.tekst_obyavleniya}</div>}
        </div>
      )}
    </div>
  );
}
