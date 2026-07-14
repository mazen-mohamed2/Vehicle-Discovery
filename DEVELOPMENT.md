# Development notes

The services use delayed in-memory mock data, not a persistence or multi-user boundary. Favorites are client-session only and reset when the browser runtime reloads; UI synchronization uses the `favorites` TanStack Query cache.

Query keys are centralized in `src/lib/query-keys.ts`. Dynamic resources include their identifier, including dealer inventory (`["listings", "agency", agencyId]`).

Run `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test` before delivery.
