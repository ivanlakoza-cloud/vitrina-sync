Patch: v27-fix-bx24-timeout
Files included:
- public/b24/soglasovanie-ceny/app.js  — фикс зависания на «Загрузка…». 
  Логика: если BX24 не доступен (страница открыта не из карточки сделки), 
  скрипт перестает ждать бесконечно, показывает понятное сообщение и выводит диагностику.
Интеграция:
1) Разместите содержимое архива в КОРЕНЬ репозитория.
2) Убедитесь, что index.html подключает этот скрипт:
     <script defer src="/b24/soglasovanie-ceny/app.js?v=27"></script>
   либо через <base href="/b24/soglasovanie-ceny/"> и относительный путь: <script defer src="app.js?v=27"></script>