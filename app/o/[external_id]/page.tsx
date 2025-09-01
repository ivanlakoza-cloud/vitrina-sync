"use client";
import React, { Fragment } from "react";
import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import { fetchByExternalId, getGallery, fetchFieldOrder, mainKeys } from "@/app/data";
import { prettyLabel, chunkEvenly } from "@/lib/fields";
import PriceTable from "@/components/PriceTable";
import PhotoStrip from "@/components/PhotoStrip";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { external_id: string } }): Promise<Metadata> {
  try {
    const rec: any = await fetchByExternalId(params.external_id);
    const title = (rec?.address as string) || "Объект";
    return { title };
  } catch {
    return { title: "Объект" };
  }
}

export default async function ObjectPage({ params }: { params: { external_id: string } }) {
  const id = params.external_id;
  const rec: any = await fetchByExternalId(id);
  if (!rec) {
    return <div className="p-6">Объект не найден</div>;
  }
  const gallery = await getGallery(id);
  const order: any[] = await fetchFieldOrder();

  const main = mainKeys(rec);

  const otherPairs: Array<{ label: string; value: any; key: string }> = [];
  for (const [key, value] of Object.entries(rec as Record<string, any>)) {
    if (main.includes(key)) continue;
    const row = order.find((r: any) => r.column_name === key);
    if (row && row.visible === false) continue;
    const display = row?.display_name_ru || prettyLabel(key);
    otherPairs.push({ key, label: display, value });
  }
  otherPairs.sort((a, b) => {
    const ao = (order.find((r: any) => r.column_name === a.key)?.sort_order) ?? 9999;
    const bo = (order.find((r: any) => r.column_name === b.key)?.sort_order) ?? 9999;
    return ao - bo;
  });

  const columns = chunkEvenly(otherPairs, 2);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-2xl font-semibold">{rec.address}</h1>
      </div>

      <PhotoStrip images={gallery} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-5">
          <PriceTable rec={rec} />
        </div>

        {columns.map((col, idx) => (
          <div key={idx} className="card p-5">
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2">
              {col.map(({ label, value, key }) => (
                <Fragment key={key}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>{value ?? "—"}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
