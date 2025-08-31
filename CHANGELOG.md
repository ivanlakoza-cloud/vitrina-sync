# Patch: app/api/catalog/route.ts

- Stop querying `city_name` and `external_id` (which do not exist in your view).
- Use `city` directly and compute `city_name` in the API response for backward compatibility.
- `external_id` now uses `uuid` (fallback to `id`).
- Covers are resolved from the public `photos` bucket by trying folders: `uuid`, `id`, `title`.
- Adds `prices_line` and returns `title` as "Город, Адрес".
