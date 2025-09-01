
import BackButton from "@/components/BackButton";
import PriceTable from "@/components/PriceTable";
import PhotoStrip from "@/components/PhotoStrip";
import { fetchByExternalId, getGallery, fetchColumnLabels } from "@/app/data";
import { buildDetailItems, splitIntoN } from "@/lib/detail-utils";

export default async function DetailPage({ params }: { params: { external_id: string } }) {
  const raw = params.external_id;
  const rec = await fetchByExternalId(raw);
  if (!rec) {
    return <div className="max-w-6xl mx-auto p-4">Объект не найден</div>;
  }
  const idForPhotos = rec.id ?? rec.external_id;
  const [images, labels] = await Promise.all([getGallery(idForPhotos), fetchColumnLabels()]);

  const details = buildDetailItems(rec, labels);
  const columns = splitIntoN(details, 3);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <BackButton />
      <h1 className="text-2xl font-semibold">{String(rec.zagolovok || "")}</h1>

      <PhotoStrip images={images} />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="text-gray-600">Тип помещения</div>
              <div className="font-medium">{rec.tip_pomeshcheniya || "—"}</div>

              <div className="text-gray-600">Этаж</div>
              <div className="font-medium">{rec.etazh ?? "—"}</div>

              <div className="text-gray-600">Доступная площадь</div>
              <div className="font-medium">{rec.dostupnaya_ploschad ? `${rec.dostupnaya_ploschad} м²` : "—"}</div>
            </div>

            <PriceTable rec={rec} />

            {(rec.km_ ?? rec.km) && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2">
                <div className="text-gray-600">KM %</div>
                <div className="font-medium">{rec.km_ ?? rec.km}</div>
              </div>
            )}

            <div className="pt-4 space-y-2">
              {columns[0].map((it, idx) => (
                it.isSection ?
                  <div key={idx} className="pt-2 font-semibold">{it.label}</div> :
                  <div key={idx} className="grid grid-cols-2 gap-x-6">
                    <div className="text-gray-600">{it.label}</div>
                    <div className="font-medium break-words">{String(it.value)}</div>
                  </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-2">
          {columns[1].map((it, idx) => (
            it.isSection ?
              <div key={idx} className="pt-2 font-semibold">{it.label}</div> :
              <div key={idx} className="grid grid-cols-2 gap-x-6">
                <div className="text-gray-600">{it.label}</div>
                <div className="font-medium break-words">{String(it.value)}</div>
              </div>
          ))}
        </div>

        <div className="card p-6 space-y-2">
          {columns[2].map((it, idx) => (
            it.isSection ?
              <div key={idx} className="pt-2 font-semibold">{it.label}</div> :
              <div key={idx} className="grid grid-cols-2 gap-x-6">
                <div className="text-gray-600">{it.label}</div>
                <div className="font-medium break-words">{String(it.value)}</div>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}
