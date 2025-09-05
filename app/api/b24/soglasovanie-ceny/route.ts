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
  <title>Проверка полей сделки — перед согласованием</title>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <style>
    :root{
      --bg:#0b1220;--card:#0f172a;--ink:#e7e9ef;--muted:#9aa7c0;--accent:#8b5cf6;--accent-d:#7c3aed;--ok:#22c55e;--err:#ef4444;--br:#1f2937;
      --shadow:0 12px 28px rgba(0,0,0,.35),0 1px 2px rgba(0,0,0,.25);
      --field-filled: rgba(139,92,246,.12);
      --field-border: #5b21b6aa;
      --btn-disabled:#4b5563;
    }
    html,body{height:100%}
    body{margin:0;background:linear-gradient(180deg,#0b1220,#0a1020);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,'Noto Sans',sans-serif}
    .wrap{max-width:1100px;margin:0 auto;padding:24px}
    .hdr{display:flex;align-items:center;gap:24px;margin-bottom:12px}
    .title{font-size:24px;font-weight:800;line-height:1.2}
    .hdr .spacer{flex:1 1 auto}
    .hdr .action{margin-left:100px}
    .card{background:var(--card);border:1px solid var(--br);border-radius:18px;padding:16px;box-shadow:var(--shadow)}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .group{margin-bottom:12px}
    .label{display:block;font-size:13px;font-weight:700;color:var(--ink);margin-bottom:8px}
    .hint{color:var(--muted);font-size:12px;margin:4px 0 0}
    .control{display:block;width:100%;border-radius:12px;border:1px solid #22304a;background:#0b1325;color:var(--ink);padding:12px 12px;outline:none;box-shadow:inset 0 1px 2px rgba(0,0,0,.2)}
    .control:focus{border-color:#3b82f6;box-shadow:inset 0 1px 2px rgba(0,0,0,.2),0 0 0 3px rgba(59,130,246,.25)}
    .invalid{border-color:var(--err)!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.2),0 0 0 3px rgba(239,68,68,.25)!important}
    .filled{background:var(--field-filled);border-color:var(--field-border)}
    .btn{border-radius:14px;border:1px solid #5b21b6;background:linear-gradient(135deg,var(--accent),var(--accent-d));color:white;padding:14px 18px;cursor:pointer;font-weight:800;letter-spacing:.3px;box-shadow:var(--shadow);transition:transform .05s ease;text-transform:uppercase}
    .btn:hover{transform:translateY(-1px)}
    .btn[disabled]{background:var(--btn-disabled);border-color:var(--btn-disabled);cursor:not-allowed;transform:none}
    .bigmsg{font-size:26px;text-align:center;padding:60px 20px;border-radius:18px;background:linear-gradient(180deg,#111827,#0b1220);border:1px solid #273244;box-shadow:var(--shadow);margin-top:18px}
    .muted{color:var(--muted)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div class="title">Проверка полей сделки перед отправкой на согласование:</div>
      <div class="spacer"></div>
      <button class="btn action" id="btnSubmit" disabled>Отправить стоимость м² на согласование</button>
    </div>

    <div class="card">
      <form id="dealForm" class="two-col"></form>
    </div>

    <div id="done" class="bigmsg" style="display:none"></div>
  </div>

  ${boot}
  <script src="/b24/soglasovanie-ceny/app.js?v=15"></script>
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
      "X-Widget": "b24-soglasovanie-v15"
    }
  });
}

export async function GET(req: NextRequest){ const inj = await collectFromRequest(req); return respond(pageHtml(inj)); }
export async function POST(req: NextRequest){ const inj = await collectFromRequest(req); return respond(pageHtml(inj)); }
export async function HEAD(){ return new Response(null, { status: 200 }); }
