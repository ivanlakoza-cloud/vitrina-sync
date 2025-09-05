// app/api/b24/soglasovanie-ceny/route.ts
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime  = "edge";

function pageHtml(injected: any){
  const boot = `<script>window.__B24_POST=${JSON.stringify(injected||{})};</script>`;
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Согласование цены — виджет</title>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <style>
    :root{--bg:#0b1220;--card:#0f172a;--ink:#e2e8f0;--muted:#94a3b8;--accent:#38bdf8;--ok:#34d399;--err:#f87171;--br:#1f2937}
    html,body{height:100%}
    body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,'Noto Sans',sans-serif}
    .wrap{max-width:980px;margin:0 auto;padding:18px}
    h1{font-size:20px;margin:0 0 10px;display:flex;align-items:center;gap:10px}
    .muted{color:var(--muted)} .ok{color:var(--ok)} .err{color:var(--err)}
    .card{background:var(--card);border:1px solid var(--br);border-radius:12px;padding:14px}
    .row{display:flex;gap:8px;align-items:center}
    .btn{border-radius:10px;border:1px solid var(--br);background:#0b1220;color:var(--ink);padding:8px 12px;cursor:pointer;font-weight:600}
    .btn-primary{background:#0284c7;border-color:#0284c7}
    .grid{display:grid;gap:12px;grid-template-columns:1fr 1fr}
    label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px}
    input,textarea,select{width:100%;border-radius:10px;border:1px solid var(--br);background:#0b1220;color:var(--ink);padding:8px 10px}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
    .hidden{display:none}
    .pill{display:inline-flex;align-items:center;border:1px solid var(--br);border-radius:999px;padding:6px 10px;gap:8px}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Согласование цены <span id="state" class="muted">— инициализация…</span></h1>

    <div class="card" id="cardInit">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="pill mono">Placement (server): <b id="pServer" style="margin-left:6px"></b></div>
        <div class="pill mono">Deal ID: <b id="dealId" style="margin-left:6px"></b></div>
      </div>
      <div class="mono muted" id="hint" style="margin-top:8px"></div>
    </div>

    <div class="grid" style="margin-top:12px">
      <div class="card">
        <h3 style="margin:0 0 8px">Поля сделки</h3>
        <div id="fields">Загружаю поля…</div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 8px">Действия</h3>
        <div class="row" style="margin-bottom:10px">
          <button class="btn btn-primary" id="btnStartBp">Запустить БП #209</button>
          <span class="muted" id="bpStatus"></span>
        </div>
        <div class="mono muted" id="log"></div>
      </div>
    </div>
  </div>

  ${boot}
  <script src="/b24/soglasovanie-ceny/app.js?v=13"></script>
</body>
</html>`;
}

async function collectFromRequest(req: NextRequest){
  const method = req.method.toUpperCase();
  const injected: any = { method };
  if (method === "POST") {
    try{
      const form = await req.formData();
      for (const [k, v] of (form as any).entries()) {
        injected[k] = typeof v === "string" ? v : "(file)";
      }
      if (typeof injected.PLACEMENT_OPTIONS === "string") {
        try{ injected.PLACEMENT_OPTIONS_PARSED = JSON.parse(injected.PLACEMENT_OPTIONS); }catch{}
      }
    }catch(e){
      injected.POST_PARSE_ERROR = String(e);
    }
  } else {
    const url = new URL(req.url);
    injected.query = Object.fromEntries(url.searchParams.entries());
  }
  return injected;
}

function respond(html: string){
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Widget": "b24-soglasovanie-v13"
    }
  });
}

export async function GET(req: NextRequest){ const inj = await collectFromRequest(req); return respond(pageHtml(inj)); }
export async function POST(req: NextRequest){ const inj = await collectFromRequest(req); return respond(pageHtml(inj)); }
export async function HEAD(){ return new Response(null, { status: 200 }); }
