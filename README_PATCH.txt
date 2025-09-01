Fix for city filter not updating URL and TS error "options" prop on TypeFilter.

1) Add/replace these two files:
   - components/CityFilter.tsx
   - components/TypeFilter.tsx

2) In app/page.tsx:
   a) Add imports at the top:
      import CityFilter from "@/components/CityFilter";
      import TypeFilter from "@/components/TypeFilter";

   b) Read selected values from searchParams:
      const selectedCity = (searchParams?.city as string) || "Все города";
      const selectedType = (searchParams?.type as string) || "Все типы";

   c) Replace the existing city <form>...<select>...</select> with:
      <CityFilter cities={cities} selected={selectedCity} />

   d) Replace <TypeFilter options={types} /> with:
      <TypeFilter types={types} selected={selectedType} />

After this, both filters will write to the URL (?city= & ?type=) and preserve each other's values.
