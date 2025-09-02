"use client";
import React from "react";

type Props = { address?: string | null };

/**
 * Small icon link row for external maps.
 * Put icons in /public: 2gis.png, ya_mao.png, goglemap.png
 */
export default function MapLinks({ address }: Props) {
  if (!address) return null;
  const q = encodeURIComponent(address);

  const items = [
    { href: `https://2gis.ru/search/${q}`,                          icon: "/2gis.png",     alt: "2GIS" },
    { href: `https://yandex.ru/maps/?ll=&z=&whathere=1&text=${q}`,  icon: "/ya_mao.png",   alt: "Yandex Maps" },
    { href: `https://www.google.com/maps/search/?api=1&query=${q}`, icon: "/goglemap.png", alt: "Google Maps" },
  ];

  return (
    <div className="flex items-center gap-[20px]">
      {items.map(i => (
        <a key={i.href} href={i.href} target="_blank" rel="noopener noreferrer">
          <img src={i.icon} alt={i.alt} className="w-[30px] h-[30px]" />
        </a>
      ))}
    </div>
  );
}
