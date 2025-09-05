// v21 — Next.js App Route with GET+POST returning full HTML
export const runtime = 'edge';

function html(){
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Проверка полей сделки</title>
  <link rel="stylesheet" href="/b24/soglasovanie-ceny/styles.css?v=21" />
</head>
<body>
  <header class="sticky">
    <div class="wrap">
      <h1>Проверка полей сделки перед отправкой на согласование:</h1>
      <button id="submit" class="btn" type="button" disabled>ОТПРАВИТЬ СТОИМОСТЬ М² НА СОГЛАСОВАНИЕ</button>
    </div>
  </header>

  <main class="wrap">
    <div id="diag" class="diag">
      <div><b>Диагностика</b></div>
      <ul id="diag-list"></ul>
    </div>

    <div id="status" class="status info">Загрузка…</div>

    <form id="form" class="grid two-col" autocomplete="off" novalidate onsubmit="return false"></form>

    <section id="final" class="final hidden">
      <div class="big ok">Спасибо :) Отправлено!</div>
      <div class="muted">Благодарю за заявку! Желаю продуктивного дня 🚀</div>
    </section>
  </main>

  <!-- Bitrix24 SDK must be loaded inside iframe -->
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <script src="/b24/soglasovanie-ceny/app.js?v=21"></script>
</body>
</html>`;
}

export async function GET(){ return new Response(html(), { headers: { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' } }); }
export async function POST(){ return new Response(html(), { headers: { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' } }); }
