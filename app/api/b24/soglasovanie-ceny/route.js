// app/api/b24/soglasovanie-ceny/route.js
// Альтернатива для App Router. Если у вас структура `app/`, используйте этот файл.
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

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Content-Security-Policy": `frame-ancestors 'self' ${BITRIX_ANCESTORS}`,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer-when-downgrade",
};

async function renderHtml() {
  const filePath = join(process.cwd(), "public", "b24", "soglasovanie-ceny", "index.html");
  const html = await readFile(filePath, "utf8");
  return new Response(html, { status: 200, headers });
}

export async function GET() { return renderHtml(); }
export async function POST() { return renderHtml(); }
export async function HEAD() { return new Response(null, { status: 200, headers }); }
