// app/api/b24/soglasovanie-ceny/route.ts
import { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PUB_ROOT = path.join(process.cwd(), 'public', 'b24', 'soglasovanie-ceny');

function ok(
  body: string | Uint8Array,
  type: string,
  extra: HeadersInit = {},
  status = 200
) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'X-Widget': 'b24-soglasovanie-v21',
      ...extra,
    },
  });
}

async function serveStatic(name: string) {
  const map: Record<string, string> = {
    'styles.css': 'text/css; charset=utf-8',
    'app.js': 'application/javascript; charset=utf-8',
    'index.html': 'text/html; charset=utf-8',
    'reestr_sopostavleniya.xlsx':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  const ctype = map[name];
  if (!ctype) return new Response('Not found', { status: 404 });

  const filePath = path.join(PUB_ROOT, name);
  const buf = await readFile(filePath);

  const extra: HeadersInit = {};
  if (name.endsWith('.xlsx')) {
    (extra as any)['Content-Disposition'] =
      'attachment; filename="reestr_sopostavleniya.xlsx"';
  }
  return ok(buf, ctype, extra);
}

async function handler(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const asset = url.searchParams.get('asset');

    // Раздача ассетов через этот же endpoint (опционально)
    if (asset) {
      const res = await serveStatic(asset);
      return res!;
    }

    // Читаем index.html из public
    const htmlPath = path.join(PUB_ROOT, 'index.html');
    let html = await readFile(htmlPath, 'utf8');

    // Подменим относительные ссылки на абсолютные к /public
    const publicBase = `${url.origin}/b24/soglasovanie-ceny`;
    html = html
      .replace(/href="\.?\/?styles\.css"/g, `href="${publicBase}/styles.css"`)
      .replace(/src="\.?\/?app\.js"/g, `src="${publicBase}/app.js"`);

    return ok(html, 'text/html; charset=utf-8');
  } catch (e: any) {
    const msg = (e?.stack || e?.message || String(e)).replace(/</g, '&lt;');
    const debugHtml = `<!doctype html><meta charset="utf-8">
<style>
  body{background:#0b1220;color:#f5f7ff;font:14px/1.5 ui-sans-serif,system-ui,Segoe UI,Roboto}
  pre{white-space:pre-wrap;background:#111a2b;border:1px solid #24314d;border-radius:12px;padding:16px}
</style>
<h2 style="font-weight:700">B24 Widget route error</h2>
<pre>${msg}</pre>`;
    return ok(debugHtml, 'text/html; charset=utf-8', {}, 500);
  }
}

export const GET = handler;
export const POST = handler;
export const OPTIONS = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
  });
