
export const runtime = 'edge';

function pageHTML() {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Проверка полей сделки</title>
  <style>
    :root{
      --bg:#0d1020;
      --card:#121633;
      --card2:#151a3a;
      --text:#E6E9FF;
      --muted:#9AA3B2;
      --accent:#8B5CF6;
      --accent-weak:#8b5cf624;
      --accent-strong:#7C3AED;
      --danger:#FF4D4F;
      --border:#2A2F53;
      --ok:#10B981;
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0;
      background:radial-gradient(1000px 600px at 20% -10%, #1e234d44, transparent 60%),
                 radial-gradient(900px 700px at 120% -20%, #2b2f6940, transparent 60%),
                 var(--bg);
      color:var(--text);
      font:16px/1.45 system-ui, -apple-system, Segoe UI, Roboto, Inter, "Helvetica Neue", Arial;
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
    }
    .wrap{max-width:1180px;margin:0 auto;padding:24px 20px 80px}
    .hdr{
      position:sticky; top:0; z-index:9;
      backdrop-filter:saturate(1.2) blur(8px);
      background:linear-gradient(180deg, #0d1020e6 0%, #0d1020bf 85%, transparent);
      margin:0 -20px 16px;
      padding:14px 20px 10px;
      border-bottom:1px solid var(--border);
    }
    .hdrRow{ display:flex; align-items:center; gap:24px; }
    .title{
      font-weight:700; letter-spacing:0.2px;
      font-size:20px; line-height:1.2;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .spacer{flex:1}
    .btn{
      user-select:none; border:0; cursor:pointer;
      padding:14px 22px; border-radius:14px;
      background:linear-gradient(180deg, var(--accent), var(--accent-strong));
      color:white; font-weight:800; letter-spacing:.2px;
      box-shadow:0 10px 18px -6px #7c3aed52, inset 0 1px 0 #ffffff25;
      transition:transform .04s ease, filter .2s ease, opacity .2s ease;
      text-transform:uppercase; font-size:14px;
      white-space:nowrap;
    }
    .btn:active{ transform:translateY(1px)}
    .btn[disabled]{opacity:.45; cursor:not-allowed; filter:saturate(.6)}
    .card{
      background:linear-gradient(180deg, var(--card), var(--card2));
      border:1px solid var(--border); border-radius:18px;
      box-shadow:0 18px 40px -32px #000, 0 10px 30px -18px #12143a90;
      padding:24px;
    }
    .grid{ display:grid; grid-template-columns:1fr 1fr; gap:40px 28px; }
    @media (max-width: 1060px){ .grid{ grid-template-columns:1fr; } .hdrRow{flex-wrap:wrap; gap:12px} }
    .group{ display:flex; flex-direction:column; gap:10px; }
    .label{ color:#C4CBEE; font-size:14px; font-weight:500; letter-spacing:.2px }
    .row-pair{ display:grid; grid-template-columns:1fr 1fr; gap:28px; }
    .input, textarea, select{
      width:100%; background:#0e1230; color:var(--text);
      border:1px solid var(--border); border-radius:12px;
      padding:14px 14px; min-height:44px;
      box-shadow:inset 0 1px 0 #FFFFFF0A;
      outline:0; transition:border-color .2s ease, box-shadow .2s ease, background .2s ease;
    }
    textarea{ min-height:124px; resize:vertical }
    .filled{ background:#0e1236; border-color:#6F62FF52; box-shadow:0 0 0 2px #6F62FF22 inset }
    .invalid{ border-color: var(--danger); box-shadow:0 0 0 2px #ff4d4f22 inset }
    .divider{ height:1px; background:var(--border); margin:0 }
    .longPair{ display:grid; grid-template-columns: 1.3fr 2fr; gap:24px; align-items:stretch; }
    @media (max-width: 960px){ .longPair{ grid-template-columns:1fr; } }
    .longLabel{ white-space:pre-wrap; }
    .final{ text-align:center; padding:70px 14px; }
    .big{ font-size:28px; font-weight:800; margin:4px 0 8px }
    .ok{ color:var(--ok) }
    .notice{ padding:18px 20px; background:#111738; border:1px solid var(--border); border-radius:16px; color:#c9cff7 }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div class="hdrRow">
        <div class="title">Проверка полей сделки перед отправкой на согласование:</div>
        <div class="spacer"></div>
        <button class="btn" id="submit" disabled>ОТПРАВИТЬ СТОИМОСТЬ М² НА СОГЛАСОВАНИЕ</button>
      </div>
    </div>

    <div class="card">
      <div id="app"></div>
    </div>
  </div>

  <!-- Обязателен для BX24 в iframe -->
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <script src="/b24/soglasovanie-ceny/app.js"></script>
</body>
</html>`;
}

export async function GET() {
  return new Response(pageHTML(), { headers: { "content-type":"text/html; charset=utf-8" } });
}
export async function POST() {
  return new Response(pageHTML(), { headers: { "content-type":"text/html; charset=utf-8" } });
}
