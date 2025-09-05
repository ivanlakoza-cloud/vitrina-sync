// app/api/b24/diagnostics/route.ts
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function pageHtml(injected: any){
  const boot = `<script>window.__B24_POST=${JSON.stringify(injected||{})};</script>`;
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>B24 Diagnostics</title>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <style>
    :root{--bg:#0b1220;--card:#0f172a;--ink:#e2e8f0;--muted:#94a3b8;--accent:#38bdf8;--ok:#34d399;--err:#f87171;--br:#1f2937}
    html,body{height:100%}
    body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,'Noto Sans',sans-serif}
    .wrap{max-width:980px;margin:0 auto;padding:20px}
    h1{font-size:20px;margin:0 0 12px;display:flex;align-items:center;gap:10px}
    .tag{background:#0ea5e9; color:#06131f; font-weight:700; padding:2px 8px; border-radius:999px; font-size:12px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .card{background:var(--card);border:1px solid var(--br);border-radius:12px;padding:14px}
    .title{font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
    pre{white-space:pre-wrap;word-break:break-word;background:#0b1220;border:1px solid var(--br);border-radius:10px;padding:10px;max-height:280px;overflow:auto}
    code{color:#93c5fd}
    .row{display:flex;gap:8px;align-items:center;margin-top:8px}
    input,select,button{border-radius:10px;border:1px solid var(--br);background:#0b1220;color:#e2e8f0;padding:8px 10px}
    button{cursor:pointer;font-weight:600}
    .ok{color:var(--ok)} .err{color:var(--err)} .muted{color:var(--muted)}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
    .footer{margin-top:12px;font-size:12px;color:var(--muted)}
    .btn-accent{background:#0284c7;border-color:#0284c7}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Bitrix24 Diagnostics <span class="tag">for iframe widget</span></h1>

    <div class="grid">
      <div class="card">
        <div class="title">URL шаблон (в «URL обработчика виджета»)</div>
        <div class="row">
          <input id="tpl" class="mono" style="flex:1" value="https://vitran.ru/api/b24/diagnostics?id=#ID#&deal_id=#DEAL_ID#&entityId=#ENTITY_ID#"/>
          <button id="copyTpl" class="btn-accent">Копировать</button>
        </div>
        <div class="footer">Подставляем сразу 3 макроса — Bitrix заменит хотя бы один.</div>
      </div>

      <div class="card">
        <div class="title">Сводка</div>
        <div id="summary" class="mono"></div>
      </div>

      <div class="card">
        <div class="title">SERVER: полученные POST-поля</div>
        <pre id="server" class="mono muted">…</pre>
      </div>

      <div class="card">
        <div class="title">placement.info</div>
        <pre id="placement" class="mono muted">…</pre>
        <div class="row">
          <button id="btnPlacement">Обновить placement.info</button>
          <span id="placementStatus" class="muted"></span>
        </div>
      </div>

      <div class="card">
        <div class="title">Query / Referrer</div>
        <pre id="query" class="mono muted">…</pre>
        <pre id="ref" class="mono muted" style="margin-top:8px">…</pre>
      </div>

      <div class="card">
        <div class="title">Определение ID сделки</div>
        <div id="idDetect" class="mono"></div>
        <div class="row">
          <input id="manualId" class="mono" placeholder="ID сделки вручную (например: 6443)"/>
          <button id="btnGetDeal">crm.deal.get</button>
        </div>
        <pre id="deal" class="mono muted" style="margin-top:8px">…</pre>
      </div>

      <div class="card">
        <div class="title">Auth / Права</div>
        <pre id="auth" class="mono muted">…</pre>
        <div class="row">
          <button id="btnAuth">BX24.getAuth</button>
          <button id="btnScope">app.info</button>
        </div>
      </div>
    </div>

    <div class="footer">Эта страница также читает поля, которые Bitrix отправляет POST-ом при открытии слайдера (например PLACEMENT/PLACEMENT_OPTIONS). Если где-то пусто — пришлите скрин «Сводки» + «SERVER: POST» + «placement.info».</div>
  </div>

  ${boot}
  <script src="/b24/diagnostics/diag.js?v=1.2"></script>
</body>
</html>`;
}

function asPlain(obj: any){
  const out: any = {};
  for (const k in obj){ out[k] = obj[k]; }
  return out;
}

async function collectFromRequest(req: NextRequest){
  const method = req.method.toUpperCase();
  const injected: any = { method };
  if (method === "POST") {
    try{
      const form = await req.formData();
      for (const [k, v] of form.entries()) {
        injected[k] = typeof v === "string" ? v : "(file)";
      }
      // If PLACEMENT_OPTIONS is JSON – try parse
      if (typeof injected.PLACEMENT_OPTIONS === "string") {
        try{ injected.PLACEMENT_OPTIONS_PARSED = JSON.parse(injected.PLACEMENT_OPTIONS); }catch{}
      }
    }catch(e){
      injected.POST_PARSE_ERROR = String(e);
    }
  } else {
    // also show url query (to compare with macros)
    const url = new URL(req.url);
    injected.query = asPlain(Object.fromEntries(url.searchParams.entries()));
  }
  return injected;
}

function respond(html: string){
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Diagnostics": "b24-diag-v1.2"
    }
  });
}

export async function GET(req: NextRequest){ const inj = await collectFromRequest(req); return respond(pageHtml(inj)); }
export async function POST(req: NextRequest){ const inj = await collectFromRequest(req); return respond(pageHtml(inj)); }
export async function HEAD(){ return new Response(null, { status: 200 }); }
