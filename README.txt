# Quick Fix: Tailwind styles not loading

**What broke**  
Карточки «разъехались», ссылки фиолетовые/подчёркнутые, изображения гигантские — это классический признак того, что Tailwind CSS не подключился (или из него не попали нужные классы).

**Что внутри архива**
- `app/globals.css` — базовые директивы Tailwind + небольшие компоненты (`.card`, `.section`, `.photos`, и т.п.).
- `app/layout.tsx` — гарантирован импорт `./globals.css` и окантовка контейнера.
- `tailwind.config.ts` — правильные `content`-глобbing для `./app` и `./components`.
- `postcss.config.js` — стандартная связка `tailwindcss` + `autoprefixer`.

**Как накатить**
1. Распаковать в корень репозитория с заменой файлов.
2. Убедиться, что `@/components` и `@/app` используют классы Tailwind (что уже так).
3. Коммит/деплой.

Если у вас уже есть свои `layout.tsx`/`globals.css`, просто:
- добавьте `import "./globals.css"` в `app/layout.tsx` (до рендеринга),
- объедините содержимое `globals.css` (важны строки `@tailwind base; @tailwind components; @tailwind utilities;`),
- проверьте, что в `tailwind.config.ts` указанны пути `./app/**/*` и `./components/**/*`.
