import type { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickPlain(obj: any){
  const out: any = {};
  for (const k in obj) out[k] = (obj as any)[k];
  return out;
}

async function renderWithBoot(postObj: any){
  const p = path.join(process.cwd(), "public", "b24", "soglasovanie-ceny", "index.html");
  let html = await readFile(p, "utf8");
  const boot = `<script>window.__B24_POST=${JSON.stringify(postObj || {})};</script>`;
  // inject right after <head>
  if (/<head>/i.test(html)) {
    html = html.replace(/<head>/i, `<head>\n${boot}`);
  } else {
    html = `${boot}\n${html}`;
  }
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Widget": "b24-soglasovanie-v29"
    }
  });
}

async function collectFromPost(req: NextRequest){
  const out: any = { method: "POST" };
  try{
    const form = await req.formData();
    for (const [k, v] of (form as any).entries()) {
      out[k] = typeof v === "string" ? v : "(file)";
    }
    if (typeof out.PLACEMENT_OPTIONS === "string"){
      try{ out.PLACEMENT_OPTIONS_PARSED = JSON.parse(out.PLACEMENT_OPTIONS); }catch{}
    }
  }catch(e:any){
    out.POST_PARSE_ERROR = String(e);
  }
  return out;
}

export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const query = pickPlain(Object.fromEntries(url.searchParams.entries()));
  return renderWithBoot({ method: "GET", query });
}

export async function POST(req: NextRequest){
  const injected = await collectFromPost(req);
  return renderWithBoot(injected);
}
