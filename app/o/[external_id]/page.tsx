// Server component for the details page (no "use client" here)
import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import PhotoStrip from "@/components/PhotoStrip";
import PriceTable from "@/components/PriceTable";
import { fetchByExternalId, getGallery, fetchFieldOrder, mainKeys } from "@/app/data";
import { prettyLabel, chunkEvenly } from "@/lib/fields";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { external_id: string } }): Promise<Metadata> {
  try {
    const rec: any = await fetchByExternalId(params.external_id);
    const title = (rec?.address as string) || "Объект";
    return { title, openGraph: { title } };
  } catch {
    return { title: "Объект" };
  }
}

export default async function Page({ params }: { params: { external_id: string } }) {
  const rec: any = await fetchByExternalId(params.external_id);
  if (!rec) {
    return <div className="p-6 text-lg">Объект не найден</div>;
  }

  // Заголовок берём из адреса
  const title: string = rec.address || rec.zagolovok || String(params.external_id);
  const gallery = await getGallery(String(params.external_id));
  const order = await fetchFieldOrder();

  // Ключи для сводной таблицы (вне "основного блока")
  const keys = Object.keys(rec).filter((k) => !(mainKeys as any).includes(k));
  const sortedKeys = keys.sort((a, b) => {
    const A = order[a]?.sort_order ?? 999999;
    const B = order[b]?.sort_order ?? 999999;
    return A - B;
  });

  const [col1, col2] = chunkEvenly(sortedKeys, 2) as [string[], string[]];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton />
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>

      {/* Галерея */}
      {/* @ts-expect-error allow flexible props */}
      <PhotoStrip items={gallery as any} />

      {/* Основные параметры + цены */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          {/* @ts-expect-error пропсы приводим к any, чтобы не падало по типам */}
          <PriceTable rec={rec as any} />
        </div>

        {/* Прочие параметры в двух колонках */}
        <div className="card">
          <table className="kv">
            <tbody>
              {col1.map((k) => (
                <tr key={k}>
                  <th>{prettyLabel(k, order) || k}</th>
                  <td>{rec[k] == null || rec[k] === "" ? "—" : String(rec[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <table className="kv">
            <tbody>
              {col2.map((k) => (
                <tr key={k}>
                  <th>{prettyLabel(k, order) || k}</th>
                  <td>{rec[k] == null || rec[k] === "" ? "—" : String(rec[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
