import { NextResponse } from 'next/server';

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Проверка полей (2c (api/soglasovanie-ceny))</title>
<style>
  body{margin:0;background:#0f1115;color:#e9eef6;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial}
  .bar{position:sticky;top:0;background:#151823;padding:14px 18px;border-bottom:1px solid #222638}
  .wrap{max-width:1100px;margin:0 auto;padding:20px}
  .badge{display:inline-block;margin-left:10px;padding:3px 8px;border-radius:999px;background:#1b2133;border:1px solid #2f3550;color:#cbd5ff;font-size:12px}
</style></head>
<body>
  <div class="bar"><div class="wrap"><h1 style="margin:0">Проверка полей сделки перед отправкой на согласование — <b>2c (api/soglasovanie-ceny)</b></h1></div></div>
  <div class="wrap"><p>Это API-роут, который рендерит HTML прямо из <code>app/api/…/route.ts</code>. Если вы видите этот текст — используется вариант 2c (api/soglasovanie-ceny).</p></div>
</body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
