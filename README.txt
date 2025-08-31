Что внутри:
- app/page.tsx — главная: сетка 6 колонок, выпадающий фильтр, карточка с заголовком «Город, Адрес», строка «тип + этаж», строка цен «от 20 — N · от 50 — …».

Установка (PowerShell):
Expand-Archive -Path .\vitrina_home_header_city_only.zip -DestinationPath C:\work\vitrina-sync -Force
cd C:\work\vitrina-sync
git add -A; git commit -m "home ui 1.1"; git push
