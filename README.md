# API-обработчик для Bitrix24 (решает 405 POST → белый экран)

Bitrix24 иногда обращается к URL виджета **методом POST**. Статическая страница из `public/` отвечает 405, и в сайд‑панели видишь белый экран.
Этот архив добавляет серверный обработчик, который на **любой метод (GET/POST/HEAD/OPTIONS)** возвращает тот же HTML.

## Что сделать
1. Распаковать архив в корень проекта.
   - Если у вас **Pages Router** (папка `pages/`): используйте файл `pages/api/b24/soglasovanie-ceny.js`.
   - Если у вас **App Router** (папка `app/`): используйте файл `app/api/b24/soglasovanie-ceny/route.js`.
2. Убедитесь, что статические файлы лежат тут:
   ```
   public/b24/_common/quickfill.js
   public/b24/soglasovanie-ceny/index.html
   public/b24/soglasovanie-ceny/config.js
   ```
   В `index.html` пути должны быть **абсолютные**:
   ```html
   <script src="/b24/_common/quickfill.js"></script>
   <script src="/b24/soglasovanie-ceny/config.js"></script>
   ```
3. В Битрикс24 в виджете/плейсменте укажите URL обработчика:
   ```
   https://<ваш-домен>/api/b24/soglasovanie-ceny
   ```
4. Задеплойте проект и обновите карточку сделки (Ctrl+F5).

## Почему работает
- Теперь POST попадает в API-роут Next.js, который возвращает ваш `index.html` и правильные заголовки `Content-Security-Policy: frame-ancestors …`.
- Скрипты/стили продолжают грузиться из `public/b24/...`.

## Подсказки по диагностике
- В DevTools → **Network** запрос к `/api/b24/soglasovanie-ceny` должен быть **200** и `Content-Type: text/html`.
- В **Console** не должно быть синтаксических ошибок из `quickfill.js`.
- Если `BX24 is not defined` — страница открыта не из плейсмента, а прямым URL.
