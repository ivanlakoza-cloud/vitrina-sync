# Bitrix24 Widget API Route (v19)

Next.js App Router endpoint:
```
/api/b24/soglasovanie-ceny
```
- Поддерживает **GET**, **POST**, **OPTIONS**. (POST нужен для iframe-навигации Битрикс24.)
- Ассеты раздаются по `?asset=styles.css|app.js|reestr_sopostavleniya.xlsx`.
- По умолчанию отдаёт `index.html`.
- Кэш отключён: `Cache-Control: no-store`.
- Диагностика: заголовок `X-Widget: b24-soglasovanie-v19`.

URL для виджета (пример):
```
https://<your-domain>/api/b24/soglasovanie-ceny?rev=v19
```
