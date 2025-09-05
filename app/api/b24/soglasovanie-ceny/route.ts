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
    :root{
      --bg:#0b1220;--card:#0f172a;--ink:#e2e8f0;--muted:#94a3b8;--accent:#8b5cf6;--ok:#22c55e;--err:#ef4444;--br:#1f2937;
      --shadow:0 10px 25px rgba(0,0,0,.35),0 1px 2px rgba(0,0,0,.25)
    }
    html,body{height:100%}
    body{margin:0;background:linear-gradient(180deg,#0b1220,#0a1020);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,'Noto Sans',sans-serif}
    .wrap{max-width:1100px;margin:0 auto;padding:24px}
    h1{font-size:26px;margin:0 0 14px;display:flex;align-items:center;gap:12px}
    .badge{background:#172554;border:1px solid #1e293b;border-radius:999px;padding:8px 12px;box-shadow:var(--shadow)}
    .muted{color:var(--muted)} .ok{color:var(--ok)} .err{color:var(--err)}
    .card{background:var(--card);border:1px solid var(--br);border-radius:18px;padding:16px;box-shadow:var(--shadow)}
    .grid{display:grid;gap:18px;grid-template-columns:1fr 1fr}
    .label{display:block;font-size:12px;color:var(--muted);margin-bottom:8px}
    .control{display:block;width:100%;border-radius:12px;border:1px solid #22304a;background:#0b1325;color:var(--ink);padding:12px 12px;outline:none;box-shadow:inset 0 1px 2px rgba(0,0,0,.2)}
    .control:focus{border-color:#3b82f6;box-shadow:inset 0 1px 2px rgba(0,0,0,.2),0 0 0 3px rgba(59,130,246,.25)}
    .invalid{border-color:var(--err)!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.2),0 0 0 3px rgba(239,68,68,.25)!important}
    .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .btn{border-radius:14px;border:1px solid #5b21b6;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;padding:14px 18px;cursor:pointer;font-weight:700;letter-spacing:.3px;box-shadow:var(--shadow);transition:transform .05s ease}
    .btn:hover{transform:translateY(-1px)}
    .footer-note{margin-top:10px;color:var(--muted);font-size:12px}
    .pill{display:inline-flex;align-items:center;border:1px solid #243045;border-radius:999px;padding:8px 12px;gap:8px;background:#0b1325;box-shadow:var(--shadow)}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .group{margin-bottom:14px}
    .bigmsg{font-size:34px;text-align:center;padding:60px 20px;border-radius:18px;background:linear-gradient(180deg,#111827,#0b1220);border:1px solid #273244;box-shadow:var(--shadow)}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Согласование цены <span id="state" class="ok" style="display:none">готово</span></h1>

    <div class="card" id="cardInit">
      <div class="row">
        <div class="pill mono">Placement: <b id="pServer" style="margin-left:6px"></b></div>
        <div class="pill mono">Deal ID: <b id="dealId" style="margin-left:6px"></b></div>
      </div>
      <div class="footer-note" id="hint"></div>
    </div>

    <div class="grid" style="margin-top:18px">
      <div class="card">
        <h3 style="margin:0 0 10px">Поля сделки</h3>
        <form id="dealForm" class="two-col"></form>
      </div>
      <div class="card">
        <h3 style="margin:0 0 10px">Действия</h3>
        <div class="group">
          <button class="btn" id="btnSubmit">Отправить стоимость на согласование</button>
        </div>
        <div id="status" class="mono muted"></div>
      </div>
    </div>

    <div id="done" class="bigmsg" style="display:none">
      <div>Спасибо :) Отправлено!</div>
      <div style="margin-top:8px">Ждем вас снова! ;)</div>
    </div>
  </div>

  ${boot}
  <script src="/b24/soglasovanie-ceny/app.js?v=14"></script>
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
      "X-Widget": "b24-soglasovanie-v14"
    }
  });
}

export async function GET(req: NextRequest){ const inj = await collectFromRequest(req); return respond(pageHtml(inj)); }
export async function POST(req: NextRequest){ const inj = await collectFromRequest(req); return respond(pageHtml(inj)); }
export async function HEAD(){ return new Response(null, { status: 200 }); }
