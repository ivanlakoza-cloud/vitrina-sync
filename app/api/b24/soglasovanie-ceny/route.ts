// app/api/b24/soglasovanie-ceny/route.ts
// TypeScript-совместимый обработчик для Next.js App Router.
// Возвращает HTML на GET/POST/HEAD, чтобы Bitrix24 мог слать POST в виджет.

import type { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const BITRIX_ANCESTORS = [
  "https://*.bitrix24.ru",
  "https://*.bitrix24.by",
  "https://*.bitrix24.kz",
  "https://*.bitrix24.ua",
  "https://*.bitrix24.de",
  "https://*.bitrix24.com",
  "https://*.bitrix24.site",
].join(" ");

const baseHeaders: Record<string, string> = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Content-Security-Policy": `frame-ancestors 'self' ${BITRIX_ANCESTORS}`,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer-when-downgrade",
};

async function renderHtml(): Promise<Response> {
  const filePath = join(process.cwd(), "public", "b24", "soglasovanie-ceny", "index.html");
  const html = await readFile(filePath, "utf8");
  return new Response(html, { status: 200, headers: baseHeaders });
}

export async function GET(_req: NextRequest): Promise<Response> {
  return renderHtml();
}

export async function POST(_req: NextRequest): Promise<Response> {
  return renderHtml();
}

export async function HEAD(): Promise<Response> {
  return new Response(null, { status: 200, headers: baseHeaders });
}
