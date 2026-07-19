# Development notes

The services use delayed mock data, not a multi-user boundary. Guest favorites persist locally under `sd-favorites`; each record stores only the canonical `VehicleListing.id` as `listingId` plus its real `createdAt` saved timestamp. `useFavorites` and the `favorites` TanStack Query cache are the only UI source of truth. Legacy records without a usable timestamp remain valid.

Guest comparisons persist canonical vehicle IDs only under `sd-compare`. `useCompare`, `compareService`, and the `compare` query key synchronize all cards and enforce a maximum of four unique vehicles. `/compare?vehicles=id-1,id-2` is the share format: IDs are validated against current listings, duplicates and invalid IDs are removed, and the list is truncated to four. URL changes from browser back/forward replace the local comparison; in-page changes update both without a replacement loop.

Favorites and Compare are intentionally independent. Clearing or removing from one never mutates the other. A future account backend should migrate these local IDs after authentication, merge them by canonical listing ID, then replace local persistence without changing the hook APIs.

Query keys are centralized in `src/lib/query-keys.ts`. Dynamic resources include their identifier, including dealer inventory (`["listings", "agency", agencyId]`).

During assisted implementation run `npm run typecheck`, `npm run lint`, and `npm test`. The project owner stops the development server and owns the production build, using `NEXT_DIST_DIR=.next-build npm run build` after QA.

## Localization

UI translations live in the Arabic and English dictionaries in `src/lib/i18n.tsx`. Add every new key to both dictionaries, then read it in client components with `useI18n()`. To add a language, extend the `Locale` type, add its dictionary, direction, cookie handling, and locale tag in `src/lib/locale.ts`.

Use the helpers in `src/lib/locale.ts` for numbers, currency, dates, relative time, mileage, and years. Language and theme preferences are stored in `sd-locale` and `sd-theme` cookies so the server renders the correct language, direction, and theme after refresh; local storage mirrors the preference for client tooling.

## Vehicle discovery

Discovery state is parsed from the URL by `src/lib/vehicle-discovery.ts`. The reusable UI updates URL parameters, and `listingsService.discover()` owns all search, filter, sort, facet, and pagination behavior. TanStack Query keys include the normalized discovery parameters, so browser navigation and shared URLs restore the same results without coupling filtering to components.

To add a filter, extend `VehicleDiscoveryParams`, parse its URL value, add the service predicate, expose the control in `VehicleDiscovery`, and add both translations. A future backend can replace `listingsService.discover()` with a paginated API call while preserving the URL, component, and query-key contracts.
