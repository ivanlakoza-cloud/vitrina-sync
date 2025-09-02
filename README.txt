Vitrina — Map links near Back button (drop-in patch)
===================================================

What this adds
--------------
A small component `components/MapLinks.tsx` that renders three 30px map buttons
(2ГИС, Яндекс.Карты, Google) with 20px gaps. Buttons open maps search for the
address from your record (prefer `adres_avito`, fallback to `address`).

Files in this archive
---------------------
components/MapLinks.tsx

How to wire it (2 lines of code)
--------------------------------
1) Import the component in `app/o/[external_id]/page.tsx`:
   -------------------------------------------------------
   import MapLinks from "@/components/MapLinks";

2) Render it to the right of the Back button:
   ------------------------------------------
   Replace your Back-button container with something like:

   <div className="flex items-center">
     <BackButton />
     <MapLinks address={rec?.adres_avito || rec?.address} />
   </div>

That’s it. The icons will sit to the right of your Back button with a small left
margin and 20px spacing between themselves. Buttons are disabled (greyed out) if
the address is empty, so the page won't break if the field is missing.

Notes
-----
- Icons expected at public root: /2gis.png, /ya_mao.png, /goglemap.png
  (use the ones you sent earlier). If you keep them in a subfolder, update the src.
- The component is client-side for hover/opacity only; it doesn’t require state.
- Uses Tailwind classes. If you don’t use Tailwind, replace classes with your CSS.
