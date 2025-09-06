# Bitrix24 Widget — API Route (Next.js)

Все файлы виджета живут в одной папке: `app/api/b24/soglasovanie-ceny`.

## Как это работает
- **GET /api/b24/soglasovanie-ceny** — отдаёт `index.html`
- **GET /api/b24/soglasovanie-ceny?asset=styles.css** — отдаёт css
- **GET /api/b24/soglasovanie-ceny?asset=app.js** — отдаёт js
- **GET /api/b24/soglasovanie-ceny?asset=reestr_sopostavleniya.xlsx** — отдаёт плейсхолдер XLSX

Роут принудительно работает в Node‑runtime и отдаёт заголовки кэша `no-store`, чтобы избежать залипания.
