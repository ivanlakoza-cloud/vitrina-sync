# Map Links patch (overlay)

Files included:
- components/MapLinks.tsx
- public/2gis.png
- public/ya_mao.png
- public/goglemap.png

How to use (page: app/o/[external_id]/page.tsx):
------------------------------------------------
import MapLinks from "@/components/MapLinks";

// get address from record:
const addrAvito = (rec?.adres_avito as string | undefined) ?? null;

// in section header "2. Локация и окружение" put the component on the right:
<div className="flex items-center justify-between mb-4">
  <h2 className="text-xl font-semibold">2. Локация и окружение</h2>
  <MapLinks address={addrAvito} />
</div>

That’s it. Icons are 30px, gaps are 20px. If address is empty, the row hides itself.
