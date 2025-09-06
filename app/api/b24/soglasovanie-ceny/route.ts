import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const widgetHeader = { "X-Widget": "b24-soglasovanie-v19" };
const noStore = { "Cache-Control": "no-store" };

async function serveFile(fileName: string, type: string) {
  const filePath = path.join(process.cwd(), "app", "api", "b24", "soglasovanie-ceny", fileName);
  const data = await fs.readFile(filePath);
  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": type,
      ...noStore,
      ...widgetHeader,
    },
  });
}

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const asset = url.searchParams.get("asset");

  if (asset === "styles.css") return serveFile("styles.css", "text/css; charset=utf-8");
  if (asset === "app.js") return serveFile("app.js", "text/javascript; charset=utf-8");
  if (asset === "reestr_sopostavleniya.xlsx")
    return serveFile("reestr_sopostavleniya.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  // default: HTML
  return serveFile("index.html", "text/html; charset=utf-8");
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  // Bitrix24 iframe навигация присылает POST. Обрабатываем как обычный GET.
  return handler(req);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...noStore,
      ...widgetHeader,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
