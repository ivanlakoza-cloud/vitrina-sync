// app/page.tsx
import { getCatalog } from '@/lib/data'

export default async function Page() {
  const items = await getCatalog() // ← внутри стоит tag: "catalog"
  return (
    // ...рендер списка объектов
  )
}
