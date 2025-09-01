Drop-in r3 (без "@/lib/supabase")
-------------------------------
Что внутри:
- app/data.ts — серверные функции, теперь напрямую используют @supabase/supabase-js.
- public/placeholder.svg — заглушка, если нет фото.

Как применить:
1) Распаковать в корень репозитория с заменой `app/data.ts` и `public/placeholder.svg` (если хотите заглушку).
2) Коммит + деплой.

Зачем правка:
- В логах Vercel: "Attempted import error: 'createClient' is not exported from '@/lib/supabase'".
  Этот drop-in устраняет зависимость от '@/lib/supabase' и использует официальный SDK напрямую.
