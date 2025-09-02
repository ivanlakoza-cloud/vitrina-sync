"use client";
import Image from "next/image";
import React from "react";

type Props = {
  address?: string;
  className?: string;
};

/**
 * Small row of map buttons (2ГИС, Яндекс.Карты, Google) shown to the right of the Back button.
 * - Each icon is 30px.
 * - Gap between icons is 20px.
 * - If address is missing, buttons are disabled visually.
 */
export default function MapLinks({ address, className = "" }: Props) {
  const addr = (address ?? "").trim();
  const q = encodeURIComponent(addr);
  const disabled = !addr;

  const imgCls = "w-[30px] h-[30px] opacity-90 hover:opacity-100";
  const wrapCls = `ml-3 flex items-center gap-[20px] ${className}`;

  const Btn = ({
    href,
    src,
    alt,
  }: {
    href: string;
    src: string;
    alt: string;
  }) =>
    disabled ? (
      <span className="inline-flex items-center opacity-40 cursor-not-allowed" title={alt}>
        <Image src={src} alt={alt} width={30} height={30} className={imgCls} />
      </span>
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center"
        title={alt}
      >
        <Image src={src} alt={alt} width={30} height={30} className={imgCls} />
      </a>
    );

  return (
    <div className={wrapCls}>
      <Btn href={`https://2gis.ru/search/${q}`} src="/2gis.png" alt="Открыть в 2ГИС" />
      <Btn
        href={`https://yandex.ru/maps/?ll=&z=&whathere=1&text=${q}`}
        src="/ya_mao.png"
        alt="Открыть в Яндекс.Картах"
      />
      <Btn
        href={`https://www.google.com/maps/search/?api=1&query=${q}`}
        src="/goglemap.png"
        alt="Открыть в Google Maps"
      />
    </div>
  );
}
