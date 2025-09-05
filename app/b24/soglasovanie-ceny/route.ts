
export const dynamic = 'force-dynamic';

function html(postData: any = null) {
  const injected = postData ? `<script>window.__B24_POST__=${JSON.stringify(postData)}</script>` : '';
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Проверка полей сделки</title>
  <link rel="preconnect" href="https://api.bitrix24.com" crossorigin>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <link href="/b24/soglasovanie-ceny/styles.css?v=v25" rel="stylesheet">
  ${injected}
</head>
<body>
  <header class="topbar">
    <h1>Проверка полей сделки перед отправкой на согласование:</h1>
    <button id="submit" class="cta" disabled>ОТПРАВИТЬ СТОИМОСТЬ М² НА СОГЛАСОВАНИЕ</button>
  </header>

  <main id="app">
    <section class="card">
      <h2>Диагностика</h2>
      <ul id="diag"></ul>
    </section>

    <section class="card">
      <div id="status" class="status info">Подключаемся к порталу…</div>
    </section>

    <section class="card success" id="done" style="display:none">
      <h2>Спасибо :) Отправлено!</h2>
      <p>Благодарю за заявку! Желаю продуктивного дня 🚀</p>
    </section>
  </main>

  <script src="/b24/soglasovanie-ceny/app.js?v=v25" defer></script>
</body>
</html>`;
}

export async function GET(request: Request) {
  return new Response(html(), {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}

export async function POST(request: Request) {
  let postData: Record<string,string> = {};
  try {
    const form = await request.formData();
    for (const [k,v] of form.entries()) postData[k] = String(v);
  } catch {}
  return new Response(html(postData), {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}
