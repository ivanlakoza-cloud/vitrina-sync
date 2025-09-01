Что внутри
==========
1) patches/app-page-fix.diff — минимальный патч для `app/page.tsx`.
   Устраняет сборочную ошибку:
     Property 'id_obekta' does not exist on type '{ id: string; rec: DomusRow; photo: string; }'
   Причина: `fetchList()` теперь возвращает элементы в виде { id, rec, photo }.
   В цикле рендера нужно брать `id` и `rec` из этого объекта.

Применение
----------
В корне репозитория выполните (unix/macOS, git установлен):
  git apply patches/app-page-fix.diff

Если Git отсутствует — откройте `app/page.tsx` и внесите изменения вручную по diff.

Примечание
----------
Патч не меняет разметку. Он только:
  - переименовывает переменную в map (чтобы избежать конфликта имён),
  - берёт id через item.id,
  - прокидывает в shortAddress(item.rec),
  - объявляет локальную переменную const rec = item.rec; чтобы остальная разметка не ломалась.
