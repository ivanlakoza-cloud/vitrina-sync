
import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import { fetchByExternalId, getGallery, fetchColumnLabels } from "@/app/data";
import PriceTable from "@/components/PriceTable";
import { prettyLabels, labelFor, HIDDEN_KEYS, HEADING_KEYS, isEmpty } from "@/lib/fields";

export const metadata: Metadata = {
  title: "Объект",
};

function Columns({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border p-4">{children}</div>;
}

export default async function Page({ params }: { params: { external_id: string } }) {
  const rec = await fetchByExternalId(params.external_id);
  if (!rec) return <div className="p-6">Объект не найден</div>;

  const id = String(rec.external_id || rec.id);
  const title =
    (rec.city ? `${rec.city}, ` : "") + (rec.address || rec.adres || rec.adres_avito || rec.zagolovok || "Объект");

  const labels = { ...(await fetchColumnLabels()), ...prettyLabels };
  const photos = await getGallery(String(rec.id));

  const mainRows: Array<[string, any]> = [];
  const push = (k:string, v:any, name?:string) => {
    if (isEmpty(v)) return;
    mainRows.push([name || (labels[k] || labelFor(k)), v]);
  };

  push("Тип помещения", rec.tip_pomescheniya || rec["tip pomescheniya"], "Тип помещения");
  push("Этаж", rec.etazh, "Этаж");
  push("Доступная площадь", rec.dostupnaya_ploschad || rec["dostupno"], "Доступная площадь");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div className="text-2xl font-semibold">{title}</div>
      </div>

      {/* photos */}
      {photos?.length ? (
        <div className="flex gap-3 overflow-x-auto snap-x">
          {photos.map((src, i) => (
            <img key={i} src={src} className="h-44 rounded-lg object-cover snap-start" alt="" />
          ))}
        </div>
      ) : null}

      <Columns>
        {/* main block */}
        <Card>
          <div className="grid grid-cols-[1fr_auto] gap-y-2 gap-x-8 text-sm">
            {mainRows.map(([k, v]) => (
              <>
                <div className="font-medium">{k}</div>
                <div>{String(v)}</div>
              </>
            ))}
            <div className="col-span-2 mt-3">
              <PriceTable rec={rec} />
            </div>
            {/* KM right under prices */}
            {rec.km || rec["km %"] || rec.km_ ? (
              <>
                <div className="font-medium mt-3">КМ %</div>
                <div className="mt-3">{String(rec.km || rec["km %"] || rec.km_)}</div>
              </>
            ) : null}
          </div>
        </Card>

        {/* two more columns - we spread the rest equally */}
        {[0,1].map((col) => (
          <Card key={col}>
            <div className="space-y-4">
              {HEADING_KEYS.map((h, idx) => (
                <div key={h.key + "_" + col + "_" + idx}>
                  <div className="text-sm font-semibold mb-2">{h.title}</div>
                  <div className="grid grid-cols-[1fr_auto] gap-x-8 gap-y-1 text-sm">
                    {Object.entries(rec)
                      .filter(([k]) => k.startsWith(h.key) || (!HEADING_KEYS.some(x=>k===x.key) && !HIDDEN_KEYS.has(k)))
                      .filter(([k]) => !["id","external_id","created_at","updated_at"].includes(k))
                      .filter(([,v]) => !isEmpty(v))
                      .filter((_, i, arr) => i % 2 === col) // распределяем равномерно по двум картам
                      .slice(0, 200)
                      .map(([k, v]) => (
                        <>
                          <div className="text-slate-600">{labels[k] || labelFor(k)}</div>
                          <div>{String(v)}</div>
                        </>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </Columns>
    </div>
  );
}
