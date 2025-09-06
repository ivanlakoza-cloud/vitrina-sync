import { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      'X-Widget': 'b24-soglasovanie-v20',
      ...extra,
    },
  });
}

async function serveAsset(name: string) {
  if (!name) return null;

  const map: Record<string, string> = {
    'styles.css': 'text/css; charset=utf-8',
    'app.js': 'application/javascript; charset=utf-8',
    'index.html': 'text/html; charset=utf-8',
    'reestr_sopostavleniya.xlsx':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  const ctype = map[name];
  if (!ctype) return new Response('Not found', { status: 404 });

  const p = path.join(__dirname, name);
  const buf = await readFile(p);

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

    // Раздача ассетов /api/b24/soglasovanie-ceny?asset=styles.css
    if (asset) {
      const res = await serveAsset(asset);
      return res!;
    }

    // Отдаём страницу — и подменяем ссылки на ассеты, чтобы они уходили в этот же роут
    const htmlPath = path.join(__dirname, 'index.html');
    let html = await readFile(htmlPath, 'utf8');

    const base = `${url.origin}${url.pathname}`;
    html = html
      .replace(/href="\.?\/?styles\.css"/g, `href="${base}?asset=styles.css"`)
      .replace(/src="\.?\/?app\.js"/g, `src="${base}?asset=app.js"`);

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
