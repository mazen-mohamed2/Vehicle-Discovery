import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const read = (path) => readFile(resolve(process.cwd(), path), "utf8");

test("all public route entry points exist", async () => {
  const routes = [
    "src/app/(site)/page.tsx",
    "src/app/(site)/vehicles/page.tsx",
    "src/app/(site)/vehicles/[id]/page.tsx",
    "src/app/(site)/c2c/page.tsx",
    "src/app/(site)/dealers/page.tsx",
    "src/app/(site)/dealers/[id]/page.tsx",
    "src/app/(site)/favorites/page.tsx",
    "src/app/(site)/compare/page.tsx",
    "src/app/(site)/import/page.tsx",
    "src/app/auth/login/page.tsx",
    "src/app/auth/register/page.tsx",
    "src/app/(site)/about/page.tsx",
    "src/app/(site)/contact/page.tsx",
    "src/app/(site)/how-it-works/page.tsx",
  ];
  await Promise.all(routes.map(async (route) => assert.match(await read(route), /export default/)));
});

test("dynamic routes invoke notFound for invalid ids", async () => {
  assert.match(await read("src/app/(site)/vehicles/[id]/page.tsx"), /if \(!vehicle\) notFound\(\)/);
  assert.match(await read("src/app/(site)/dealers/[id]/page.tsx"), /if \(!agency\) notFound\(\)/);
});

test("dealer inventory is scoped and keyed by agency id", async () => {
  const service = await read("src/services/listings.service.ts");
  const page = await read("src/app/(site)/dealers/[id]/page.tsx");
  assert.match(service, /byAgency: \(agencyId: string\)/);
  assert.match(service, /l\.sellerId === agencyId/);
  assert.match(page, /queryKeys\.listings\.byAgency\(id\)/);
  assert.match(page, /listingsService\.byAgency\(id\)/);
});

test("dealer card counts use the same scoped inventory as dealer details", async () => {
  const data = await read("src/services/mock-data.ts");
  const directory = await read("src/app/(site)/dealers/dealers-client.tsx");
  const detail = await read("src/app/(site)/dealers/[id]/dealer-detail-client.tsx");
  const card = await read("src/components/marketplace/AgencyCard.tsx");
  const ag1Count = [...data.matchAll(/sellerId: "ag1"/g)].length;
  const ag2Count = [...data.matchAll(/sellerId: "ag2"/g)].length;

  assert.ok(ag1Count > 0 && ag2Count > 0);
  assert.match(directory, /listingsService\.byAgency\(agency\.id\)/);
  assert.match(directory, /vehicleCount={inventoryQueries\[index\]\.data\?\.length \?\? 0}/);
  assert.match(detail, /listingsService\.byAgency\(id\)/);
  assert.match(detail, /inventory\.length/);
  assert.match(card, /vehicleCount: number/);
  assert.doesNotMatch(card, /a\.vehicleCount/);
});

test("favorites use shared optimistic query mutation", async () => {
  const card = await read("src/components/marketplace/VehicleCard.tsx");
  const hook = await read("src/hooks/use-favorites.ts");
  for (const pattern of [/useMutation/, /queryKeys\.favorites\.all/, /onMutate/, /onError/])
    assert.match(hook, pattern);
  assert.match(card, /useFavorites/);
  assert.match(card, /aria-pressed/);
});

test("vehicle discovery is URL-driven and service-owned", async () => {
  const component = await read("src/components/marketplace/VehicleDiscovery.tsx");
  const service = await read("src/services/listings.service.ts");
  const parser = await read("src/lib/vehicle-discovery.ts");
  assert.match(component, /useSearchParams/);
  assert.match(component, /router\.replace/);
  assert.match(component, /queryKeys\.listings\.discovery\(params\)/);
  for (const field of [
    "make",
    "model",
    "year",
    "priceMin",
    "priceMax",
    "mileageMin",
    "mileageMax",
    "fuel",
    "transmission",
    "condition",
    "sellerType",
    "location",
  ]) {
    assert.match(service, new RegExp(`params\\.${field}`));
    assert.match(parser, new RegExp(`${field}:`));
  }
  for (const sort of ["newest", "oldest", "price-asc", "price-desc", "mileage-asc", "mileage-desc"])
    assert.match(service, new RegExp(`"?${sort}"?`));
});

test("home search and brand shortcuts preserve discovery parameters", async () => {
  const home = await read("src/app/(site)/home-client.tsx");
  assert.match(home, /new URLSearchParams/);
  assert.match(home, /canonicalMake/);
  assert.match(home, /\/vehicles\?make=/);
});

test("all sort options are visible, URL-backed, and reset pagination", async () => {
  const component = await read("src/components/marketplace/VehicleDiscovery.tsx");
  for (const sort of ["newest", "oldest", "price-asc", "price-desc", "mileage-asc", "mileage-desc"])
    assert.ok(component.includes(`["${sort}"`));
  assert.match(component, /update\(\{ sort:/);
  assert.match(component, /if \(resetPage\) next\.delete\("page"\)/);
  assert.match(component, /compact \? "block"/);
  assert.match(component, /<span className={compact \? "sr-only"/);
});

test("price and mileage ranges use dual-thumb draft sliders committed on drag end", async () => {
  const component = await read("src/components/marketplace/VehicleDiscovery.tsx");
  const slider = await read("src/components/ui/slider.tsx");
  assert.match(component, /const \[price, setPrice\] = useState/);
  assert.match(component, /const \[mileage, setMileage\] = useState/);
  assert.match(component, /onValueChange=.*setPrice/);
  assert.match(component, /onValueCommit={commitPrice}/);
  assert.match(component, /onValueChange=.*setMileage/);
  assert.match(component, /onValueCommit={commitMileage}/);
  assert.match(component, /minStepsBetweenThumbs={1}/);
  assert.match(component, /formatCurrency/);
  assert.match(component, /formatMileage/);
  assert.match(slider, /thumbCount/);
  assert.match(slider, /thumbLabels/);
  assert.doesNotMatch(component, /onClick={apply}/);
  assert.doesNotMatch(component, /discovery\.apply/);
});

test("unchanged URLs are skipped and C2C stays owner-only", async () => {
  const component = await read("src/components/marketplace/VehicleDiscovery.tsx");
  const c2c = await read("src/app/(site)/c2c/c2c-client.tsx");
  const service = await read("src/services/listings.service.ts");
  assert.match(component, /next\.toString\(\) === searchParams\.toString\(\)/);
  assert.match(component, /placeholderData: keepPreviousData/);
  assert.match(c2c, /lockedSellerType="individual"/);
  assert.match(service, /params\.sellerType/);
  assert.match(service, /comparators\[params\.sort\]/);
});

test("discovery toolbar, sticky sidebar, and mobile drawer remain coordinated", async () => {
  const component = await read("src/components/marketplace/VehicleDiscovery.tsx");
  assert.match(component, /rounded-2xl surface-card p-4 shadow-card/);
  assert.match(component, /activeFilterCount/);
  assert.match(component, /max-h-\[calc\(100vh-6rem\)\]/);
  assert.match(component, /overflow-y-auto/);
  assert.match(component, /overscroll-contain/);
  assert.match(component, /<Sheet>/);
  assert.match(component, /<SheetTrigger asChild>/);
  assert.match(component, /closeLabel={t\("common\.close"\)}/);
  assert.match(component, /onClick={clear}/);
});

test("range bounds are service-provided and URL normalized", async () => {
  const service = await read("src/services/listings.service.ts");
  const parser = await read("src/lib/vehicle-discovery.ts");
  assert.match(service, /priceRange:/);
  assert.match(service, /mileageRange:/);
  assert.match(service, /params\.mileageMin/);
  assert.match(parser, /mileageMin: positiveNumber/);
});

test("search draft commits only the latest value without losing fast input", async () => {
  const component = await read("src/components/marketplace/VehicleDiscovery.tsx");
  assert.match(component, /const \[search, setSearch\] = useState\(committedSearch\)/);
  assert.match(component, /searchDraftRef\.current = value;\s*setSearch\(value\)/);
  assert.match(component, /cancelSearchCommit\(\);\s*if \(composingRef\.current\) return/);
  assert.match(component, /sequence !== searchSequenceRef\.current/);
  assert.match(component, /commitSearch\(searchDraftRef\.current\)/);
  assert.match(component, /}, 400\)/);
  assert.match(component, /useEffect\(\(\) => cancelSearchCommit, \[cancelSearchCommit\]\)/);
  assert.match(component, /const normalized = draft\.trim\(\)/);
  assert.doesNotMatch(component, /setSearch\(.*\.trim\(\)\)/);
});

test("search clear, history synchronization, and IME composition are safe", async () => {
  const component = await read("src/components/marketplace/VehicleDiscovery.tsx");
  assert.match(component, /if \(draft === ""\) \{\s*commitSearch\(""\)/);
  assert.match(component, /updateRef\.current\(\{ q: normalized \|\| undefined \}\)/);
  assert.match(component, /if \(next\.toString\(\) === searchParams\.toString\(\)\) return/);
  assert.match(component, /if \(searchIsLocallyDirtyRef\.current\)/);
  assert.match(
    component,
    /searchDraftRef\.current = committedSearch;\s*setSearch\(committedSearch\)/,
  );
  assert.match(component, /onCompositionStart/);
  assert.match(component, /onCompositionEnd/);
  assert.match(
    component,
    /composingRef\.current = false;\s*changeSearch\(event\.currentTarget\.value\)/,
  );
  assert.match(component, /queryKeys\.listings\.discovery\(params\)/);
  assert.doesNotMatch(component, /queryKeys\.listings\.discovery\(search\)/);
});

test("vehicle gallery supports navigation, swipe, fullscreen, loading, and fallback", async () => {
  const gallery = await read("src/app/(site)/vehicles/[id]/vehicle-gallery.tsx");
  assert.match(gallery, /const previous = useCallback/);
  assert.match(gallery, /const next = useCallback/);
  assert.match(gallery, /event\.key === "ArrowLeft"/);
  assert.match(gallery, /onTouchStart/);
  assert.match(gallery, /onTouchEnd/);
  assert.match(gallery, /<Dialog open={fullscreen}/);
  assert.match(gallery, /<Skeleton className="absolute inset-0"/);
  assert.match(gallery, /onError=/);
  assert.match(gallery, /ImageOff/);
  for (const label of [
    "vehicle.gallery.previous",
    "vehicle.gallery.next",
    "vehicle.gallery.fullscreen",
  ])
    assert.match(gallery, new RegExp(label.replaceAll(".", "\\.")));
});

test("vehicle detail presents grouped localized facts and seller-specific cards", async () => {
  const detail = await read("src/app/(site)/vehicles/[id]/vehicle-detail-client.tsx");
  const locale = await read("src/lib/locale.ts");
  assert.match(detail, /vehicle\.overview/);
  assert.match(detail, /vehicle\.mechanical/);
  assert.match(detail, /vehicle\.listingDetails/);
  assert.match(detail, /vehicle\.sellerType === "agency"/);
  assert.match(detail, /href={`\/dealers\/\$\{seller\.id\}`}/);
  assert.match(detail, /vehicle\.individualSeller/);
  assert.match(detail, /seller\.vehicleCount/);
  assert.match(detail, /formatCurrency/);
  assert.match(detail, /formatMileage/);
  assert.match(detail, /formatDate/);
  assert.match(locale, /"ar-EG"/);
  assert.match(locale, /"en-US"/);
});

test("related vehicles are service-ranked and exclude the active listing", async () => {
  const service = await read("src/services/listings.service.ts");
  const page = await read("src/app/(site)/vehicles/[id]/page.tsx");
  const detail = await read("src/app/(site)/vehicles/[id]/vehicle-detail-client.tsx");
  assert.match(service, /listing\.id !== listingId/);
  assert.match(service, /normalizeMake\(listing\.make\) === normalizeMake\(source\.make\)/);
  assert.match(service, /listing\.bodyType === source\.bodyType/);
  assert.match(service, /Math\.abs\(listing\.price - source\.price\)/);
  assert.match(page, /listingsService\.related\(id, 4\)/);
  assert.match(detail, /related\.map\(\(vehicle\) =>/);
  assert.match(detail, /vehicle\.noRelated/);
});

test("vehicle detail metadata and invalid route handling are production-ready", async () => {
  const page = await read("src/app/(site)/vehicles/[id]/page.tsx");
  const notFound = await read("src/app/(site)/vehicles/[id]/not-found.tsx");
  assert.match(page, /if \(!vehicle\) notFound\(\)/);
  assert.match(page, /alternates: \{ canonical:/);
  assert.match(page, /openGraph:/);
  assert.match(page, /twitter:/);
  assert.match(page, /images: image/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(notFound, /notFound\.vehicle/);
  assert.match(notFound, /notFound\.backVehicles/);
});

test("favorites hydrate from browser storage and persist every mutation", async () => {
  const service = await read("src/services/favorites.service.ts");
  const detail = await read("src/app/(site)/vehicles/[id]/vehicle-detail-client.tsx");
  assert.match(service, /const storageKey = "sd-favorites"/);
  assert.match(service, /window\.localStorage\.getItem\(storageKey\)/);
  assert.match(service, /store\.set\(item\.listingId/);
  assert.match(service, /window\.localStorage\.setItem\(storageKey/);
  assert.match(service, /hydrate\(\);\s*return delay\(Array\.from\(store\.values\(\)\)\)/);
  assert.match(service, /store\.set\(listingId, fav\);\s*persist\(\)/);
  assert.match(service, /store\.delete\(listingId\);\s*persist\(\)/);
  assert.match(detail, /useFavorites\(\)/);
});

test("report listing opens an accessible reason dialog and confirms locally", async () => {
  const detail = await read("src/app/(site)/vehicles/[id]/vehicle-detail-client.tsx");
  assert.match(detail, /onClick=\{\(\) => setReportOpen\(true\)\}/);
  assert.match(detail, /<Dialog open=\{open\} onOpenChange=\{onOpenChange\}>/);
  assert.match(detail, /<DialogTitle>/);
  assert.match(detail, /<DialogDescription>/);
  assert.match(detail, /<RadioGroup/);
  assert.match(detail, /aria-label=\{t\("vehicle\.report\.reasonLabel"\)\}/);
  assert.match(detail, /disabled=\{!reason\}/);
  assert.match(detail, /toast\.success\(t\("vehicle\.report\.successTitle"\)/);
  for (const reason of ["incorrect", "sold", "fraud", "duplicate", "other"])
    assert.match(detail, new RegExp(`"${reason}"`));
});

test("vehicle favorite control stays neutral until persisted favorites are hydrated", async () => {
  const detail = await read("src/app/(site)/vehicles/[id]/vehicle-detail-client.tsx");
  const gallery = await read("src/app/(site)/vehicles/[id]/vehicle-gallery.tsx");
  assert.match(detail, /isFavorite, toggleFavorite, isHydrating, togglingListingId/);
  assert.match(detail, /isHydrating \? \(/);
  assert.match(detail, /<Skeleton\s+role="status"\s+aria-label=\{t\("a11y\.loading"\)\}/);
  assert.match(detail, /const saved = isFavorite\(v\.id\)/);
  assert.match(detail, /aria-pressed=\{saved\}/);
  assert.match(detail, /toggleFavorite\(v\.id\)/);
  assert.doesNotMatch(gallery, /favorites|favoriteMutation|queryKeys\.favorites/);
});

test("main gallery image is prioritized while thumbnails remain lazy", async () => {
  const gallery = await read("src/app/(site)/vehicles/[id]/vehicle-gallery.tsx");
  assert.match(gallery, /import Image from "next\/image"/);
  assert.match(gallery, /priority=\{isPrimary && active === 0\}/);
  assert.match(gallery, /fetchPriority=\{isPrimary && active === 0 \? "high" : "auto"\}/);
  assert.match(gallery, /sizes="\(min-width: 1280px\) 800px, \(min-width: 1024px\) 65vw, 100vw"/);
  assert.match(gallery, /className="relative aspect-\[16\/10\] w-full/);
  assert.match(gallery, /loading="lazy"\s+sizes="112px"/);
  assert.match(gallery, /loadedImageId !== current\.id/);
  assert.match(gallery, /onLoad=\{\(\) => setLoadedImageId\(current\.id\)\}/);
  assert.match(gallery, /!failed\.has\(current\.id\)/);
  assert.match(gallery, /onError=\{\(\) => setFailed/);
  assert.match(gallery, /galleryImage\(true\)/);
  assert.match(gallery, /galleryImage\(false\)/);
});

test("dealer profile metadata is dynamic, canonical, and social-ready", async () => {
  const page = await read("src/app/(site)/dealers/[id]/page.tsx");
  assert.match(page, /title: `\$\{agency\.name\}/);
  assert.match(page, /description,/);
  assert.match(page, /alternates: \{ canonical: `\/dealers\/\$\{id\}` \}/);
  assert.match(page, /openGraph:/);
  assert.match(page, /twitter:/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
});

test("dealer hero and statistics use scoped inventory and accessible landmarks", async () => {
  const detail = await read("src/app/(site)/dealers/[id]/dealer-detail-client.tsx");
  assert.match(detail, /aria-labelledby="dealer-title"/);
  assert.match(detail, /agency\.logoUrl/);
  assert.match(detail, /agency\.reviewCount/);
  assert.match(detail, /dealer\.responseTime/);
  assert.match(detail, /dealer\.activeListings/);
  assert.match(detail, /inventory\.filter\(\(vehicle\) => vehicle\.condition === "new"\)/);
  assert.match(detail, /const usedVehicles = inventory\.length - newVehicles/);
  assert.match(detail, /reduce\(\(total, vehicle\) => total \+ vehicle\.price/);
  assert.match(detail, /dealer-stats-title/);
  assert.match(detail, /formatCurrency\(averagePrice/);
});

test("dealer inventory search, filters, and sorting remain local", async () => {
  const detail = await read("src/app/(site)/dealers/[id]/dealer-detail-client.tsx");
  const inventory = await read("src/lib/dealer-inventory.ts");
  const service = await read("src/services/listings.service.ts");
  assert.match(detail, /useDeferredValue\(filters\.search\)/);
  assert.match(detail, /filterDealerInventory\(inventory/);
  for (const filter of ["search", "make", "bodyType", "fuel", "transmission", "sort"])
    assert.match(detail, new RegExp(`filters\\.${filter}`));
  assert.match(detail, /queryKeys\.listings\.byAgency\(id\)/);
  assert.match(detail, /<VehicleCard key=\{vehicle\.id\}/);
  assert.match(detail, /<VehicleGridSkeleton/);
  assert.match(detail, /state\.dealer\.empty\.title/);
  assert.match(service, /l\.sellerType === "agency" && l\.sellerId === agencyId/);
  assert.match(inventory, /listing\.bodyType === filters\.bodyType/);
  assert.match(inventory, /listing\.fuel === filters\.fuel/);
  assert.match(inventory, /listing\.transmission === filters\.transmission/);
  assert.match(inventory, /comparators\[filters\.sort\]/);
  assert.doesNotMatch(detail, /router\.(push|replace)/);
});

test("dealer contact, about, map, and sharing remain backend-free placeholders", async () => {
  const detail = await read("src/app/(site)/dealers/[id]/dealer-detail-client.tsx");
  for (const key of [
    "dealer.contact",
    "dealer.call",
    "dealer.whatsapp",
    "dealer.share",
    "dealer.about",
    "dealer.address",
    "dealer.workingHours",
    "dealer.phone",
    "dealer.email",
    "dealer.website",
  ])
    assert.match(detail, new RegExp(key.replaceAll(".", "\\.")));
  assert.match(detail, /navigator\.share/);
  assert.match(detail, /navigator\.clipboard/);
  assert.match(detail, /toast\.(info|success)/);
  assert.match(detail, /role="img"/);
  assert.match(detail, /aria-label=\{t\("dealer\.mapPlaceholder"\)\}/);
  assert.doesNotMatch(detail, /google\.maps|maps\.google|<iframe/i);
  assert.doesNotMatch(detail, /href="tel:|wa\.me/);
});

test("similar dealers are service-ranked without duplicates and use real inventory counts", async () => {
  const service = await read("src/services/agencies.service.ts");
  const page = await read("src/app/(site)/dealers/[id]/page.tsx");
  const detail = await read("src/app/(site)/dealers/[id]/dealer-detail-client.tsx");
  assert.match(service, /agency\.id !== agencyId/);
  assert.match(service, /agency\.location === source\.location/);
  assert.match(service, /sourceBrands\.has\(brand\)/);
  assert.match(service, /Math\.abs\(inventory\.length - sourceInventory\.length\)/);
  assert.match(service, /vehicleCount: inventory\.length/);
  assert.match(page, /queryKeys\.agencies\.similar\(id, 3\)/);
  assert.match(detail, /recommendations\.map/);
  assert.match(detail, /vehicleCount=\{vehicleCount\}/);
});

test("all vehicle surfaces share one persisted favorite cache and canonical listing id", async () => {
  const hook = await read("src/hooks/use-favorites.ts");
  const card = await read("src/components/marketplace/VehicleCard.tsx");
  const detail = await read("src/app/(site)/vehicles/[id]/vehicle-detail-client.tsx");
  const favoritesPage = await read("src/app/(site)/favorites/favorites-client.tsx");
  const dealer = await read("src/app/(site)/dealers/[id]/dealer-detail-client.tsx");
  const discovery = await read("src/components/marketplace/VehicleDiscovery.tsx");
  const home = await read("src/app/(site)/home-client.tsx");

  assert.match(hook, /queryKey: queryKeys\.favorites\.all/);
  assert.match(hook, /queryFn: favoritesService\.list/);
  assert.match(hook, /favorite\.listingId === listingId/);
  assert.match(hook, /favoritesService\.add\(listingId\)/);
  assert.match(hook, /favoritesService\.remove\(listingId\)/);
  assert.match(hook, /onError:.*context/s);
  assert.match(hook, /setQueryData\(queryKeys\.favorites\.all, context\?\.previous\)/);
  assert.match(hook, /invalidateQueries\(\{ queryKey: queryKeys\.favorites\.all \}\)/);

  assert.match(card, /useFavorites\(\)/);
  assert.match(detail, /useFavorites\(\)/);
  assert.match(favoritesPage, /useFavorites\(\)/);
  assert.doesNotMatch(card, /favoritesService|queryKeys\.favorites|useMutation/);
  assert.doesNotMatch(detail, /favoritesService|queryKeys\.favorites|useMutation/);

  assert.match(card, /isHydrating \? \(/);
  assert.match(card, /<Skeleton/);
  assert.match(card, /const fav = isFavorite\(v\.id\)/);
  assert.match(card, /toggleFavorite\(v\.id\)/);
  assert.doesNotMatch(card, /data: favorites = \[\]/);

  assert.match(dealer, /<VehicleCard key=\{vehicle\.id\} v=\{vehicle\}/);
  assert.match(discovery, /<VehicleCard key=\{vehicle\.id\} v=\{vehicle\}/);
  assert.match(home, /<VehicleCard key=\{v\.id\} v=\{v\}/);
  assert.match(detail, /<VehicleCard key=\{vehicle\.id\} v=\{vehicle\}/);
});

test("favorites page uses shared hydration, search, sorting, saved dates, and confirmed clear", async () => {
  const page = await read("src/app/(site)/favorites/favorites-client.tsx");
  const hook = await read("src/hooks/use-favorites.ts");
  const service = await read("src/services/favorites.service.ts");
  assert.match(page, /useFavorites\(\)/);
  assert.match(page, /isHydrating/);
  assert.match(page, /favorites\.search/);
  for (const sort of ["saved", "price-asc", "price-desc", "year-desc", "year-asc"])
    assert.match(page, new RegExp(`"${sort}"`));
  assert.match(page, /createdAt/);
  assert.match(page, /Date\.parse/);
  assert.match(page, /vehicle\.notAvailable/);
  assert.match(page, /<AlertDialog/);
  assert.match(page, /<AlertDialogCancel>/);
  assert.match(page, /clearFavorites\(\)/);
  assert.match(hook, /clearMutation/);
  assert.match(hook, /queryClient\.setQueryData<Favorite\[]>\(queryKeys\.favorites\.all, \[]\)/);
  assert.match(service, /clear: \(\): Promise<void>/);
});

test("compare has one persisted optimistic architecture with a four-vehicle maximum", async () => {
  const service = await read("src/services/compare.service.ts");
  const hook = await read("src/hooks/use-compare.ts");
  const keys = await read("src/lib/query-keys.ts");
  assert.match(service, /MAX_COMPARE_VEHICLES = 4/);
  assert.match(service, /storageKey = "sd-compare"/);
  assert.match(service, /new Set/);
  assert.match(service, /\.slice\(0, MAX_COMPARE_VEHICLES\)/);
  assert.match(service, /localStorage\.getItem/);
  assert.match(service, /localStorage\.setItem/);
  assert.match(hook, /queryKey: queryKeys\.compare\.all/);
  assert.match(hook, /queryFn: compareService\.list/);
  assert.match(hook, /addToCompare/);
  assert.match(hook, /removeFromCompare/);
  assert.match(hook, /toggleCompare/);
  assert.match(hook, /clearCompare/);
  assert.match(hook, /onMutate/);
  assert.match(hook, /onError/);
  assert.match(hook, /context\?\.previous/);
  assert.match(keys, /all: \["compare"\]/);
});

test("shared cards, details, tray, and providers expose synchronized compare controls", async () => {
  const card = await read("src/components/marketplace/VehicleCard.tsx");
  const detail = await read("src/app/(site)/vehicles/[id]/vehicle-detail-client.tsx");
  const tray = await read("src/components/marketplace/CompareTray.tsx");
  const providers = await read("src/app/providers.tsx");
  for (const component of [card, detail]) {
    assert.match(component, /useCompare\(\)/);
    assert.match(component, /isHydrating/);
    assert.match(component, /aria-pressed=/);
    assert.match(component, /compare\.limit/);
  }
  assert.match(card, /toggleCompare\(v\.id\)/);
  assert.match(detail, /toggleCompare\(v\.id\)/);
  assert.match(tray, /compareCount/);
  assert.match(tray, /href="\/compare"/);
  assert.match(tray, /clearCompare/);
  assert.match(providers, /<CompareTray \/>/);
  assert.match(providers, /<Toaster/);
});

test("compare page handles edge states, differences, accessibility, and missing values", async () => {
  const page = await read("src/app/(site)/compare/compare-client.tsx");
  assert.match(page, /vehicles\.length === 0/);
  assert.match(page, /vehicles\.length === 1/);
  assert.match(page, /<table/);
  assert.match(page, /scope="col"/);
  assert.match(page, /scope="row"/);
  assert.match(page, /overflow-x-auto/);
  assert.match(page, /tabIndex=\{0\}/);
  assert.match(page, /new Set\(values\)\.size > 1/);
  assert.match(page, /compare\.differs/);
  assert.match(page, /vehicle\.notAvailable/);
  assert.match(page, /vehicle\.images\[0\]/);
  assert.match(page, /<AlertDialog/);
  assert.match(page, /const remove = \(id: string\)/);
  assert.match(page, /setComparison\(\[]\)/);
});

test("shareable comparison URLs validate, normalize, restore, and avoid replace loops", async () => {
  const url = await read("src/lib/compare-url.ts");
  const page = await read("src/app/(site)/compare/compare-client.tsx");
  assert.match(url, /value\s*\.split\(","\)/);
  assert.match(url, /validIds\.has\(id\)/);
  assert.match(url, /new Set/);
  assert.match(url, /MAX_COMPARE_VEHICLES/);
  assert.match(url, /encodeURIComponent/);
  assert.match(page, /searchParams\.get\("vehicles"\)/);
  assert.match(page, /lastUrlValue/);
  assert.match(page, /if \(next !== current\) router\.replace/);
  assert.match(page, /replaceCompare\(valid\)/);
  assert.match(page, /navigator\.clipboard\.writeText/);
  assert.match(page, /navigator\.share/);
  assert.match(page, /compare\.clipboardFailure/);
});

test("favorites and compare remain independent and documented in both languages", async () => {
  const favorites = await read("src/hooks/use-favorites.ts");
  const compare = await read("src/hooks/use-compare.ts");
  const i18n = await read("src/lib/i18n.tsx");
  const docs = await read("DEVELOPMENT.md");
  assert.doesNotMatch(favorites, /compareService|queryKeys\.compare/);
  assert.doesNotMatch(compare, /favoritesService|queryKeys\.favorites/);
  assert.match(i18n, /"compare\.title": "مقارنة السيارات"/);
  assert.match(i18n, /"compare\.title": "Compare vehicles"/);
  assert.match(i18n, /"favorites\.search":/);
  assert.match(docs, /sd-favorites/);
  assert.match(docs, /sd-compare/);
  assert.match(docs, /maximum of four/);
  assert.match(docs, /Favorites and Compare are intentionally independent/);
  assert.match(docs, /NEXT_DIST_DIR=\.next-build npm run build/);
});

test("persisted favorite and compare controls use matching server hydration snapshots", async () => {
  const hydration = await read("src/hooks/use-hydration-ready.ts");
  const favorites = await read("src/hooks/use-favorites.ts");
  const compare = await read("src/hooks/use-compare.ts");
  const card = await read("src/components/marketplace/VehicleCard.tsx");
  assert.match(hydration, /useSyncExternalStore/);
  assert.match(hydration, /getClientSnapshot = \(\) => true/);
  assert.match(hydration, /getServerSnapshot = \(\) => false/);
  for (const hook of [favorites, compare]) {
    assert.match(hook, /useHydrationReady\(\)/);
    assert.match(hook, /isHydrating: !hydrationReady \|\| query\.isPending/);
  }
  assert.match(card, /compareHydrating \? \(/);
  assert.match(card, /<Skeleton/);
});

test("compare clear and final removal cannot be restored by a stale URL", async () => {
  const page = await read("src/app/(site)/compare/compare-client.tsx");
  const service = await read("src/services/compare.service.ts");
  assert.match(page, /pendingUrlValue = useRef<string \| null \| undefined>/);
  assert.match(page, /pendingUrlValue\.current = expectedValue/);
  assert.match(page, /if \(pendingUrlValue\.current !== undefined\)/);
  assert.match(page, /else return/);
  assert.match(page, /const setComparison = \(ids: string\[]\)/);
  assert.match(page, /replaceCompare\(ids\);\s*updateUrl\(ids\)/);
  assert.match(page, /const next = comparedIds\.filter\(\(item\) => item !== id\)/);
  assert.match(page, /setComparison\(next\)/);
  assert.match(page, /setComparison\(\[]\)/);
  assert.match(service, /next\.length > 0/);
  assert.match(service, /localStorage\.removeItem\(storageKey\)/);
});

test("compare renders dedicated zero, one, and multi-vehicle states", async () => {
  const page = await read("src/app/(site)/compare/compare-client.tsx");
  assert.match(page, /vehicles\.length === 0 \? \(/);
  assert.match(page, /vehicles\.length === 1 \? \(/);
  assert.match(page, /<OneVehicleState/);
  assert.match(page, /function OneVehicleState/);
  assert.match(page, /compare\.minimum/);
  assert.match(page, /hero\.cta\.browse/);
  assert.match(page, /onRemove=\{\(\) => remove\(vehicles\[0\]\.id\)\}/);
  assert.match(page, /<table/);
});

test("shared header exposes hydration-safe desktop and mobile compare navigation", async () => {
  const header = await read("src/components/site/SiteHeader.tsx");
  const comparePage = await read("src/app/(site)/compare/compare-client.tsx");
  const i18n = await read("src/lib/i18n.tsx");
  assert.match(header, /useCompare\(\)/);
  assert.match(header, /compareCount, isHydrating: compareHydrating/);
  assert.match(header, /href="\/compare"/g);
  assert.ok((header.match(/href="\/compare"/g) ?? []).length >= 2);
  assert.match(header, /hidden lg:inline-flex/);
  assert.match(header, /onClick=\{\(\) => setOpen\(false\)\}/);
  assert.match(header, /!compareHydrating && compareCount > 0/);
  assert.match(header, /nav\.compareWithCount/);
  assert.match(header, /aria-label=\{compareLabel\}/);
  assert.match(header, /focus-visible:ring-2/);
  assert.match(i18n, /"nav\.compare": "مقارنة"/);
  assert.match(i18n, /"nav\.compare": "Compare"/);
  assert.match(comparePage, /vehicles\.length === 0/);
  assert.match(comparePage, /vehicles\.length === 1/);
  assert.match(comparePage, /<table/);
});

test("shared header exposes synchronized desktop and mobile favorites navigation", async () => {
  const header = await read("src/components/site/SiteHeader.tsx");
  const hook = await read("src/hooks/use-favorites.ts");
  const i18n = await read("src/lib/i18n.tsx");
  assert.match(header, /useFavorites\(\)/);
  assert.match(header, /favorites, isHydrating: favoritesHydrating/);
  assert.match(header, /const favoritesCount = favorites\.length/);
  assert.ok((header.match(/href="\/favorites"/g) ?? []).length >= 2);
  assert.match(header, /hidden lg:inline-flex/);
  assert.match(header, /onClick=\{\(\) => setOpen\(false\)\}/);
  assert.match(header, /!favoritesHydrating &&/);
  assert.match(header, /nav\.favoritesWithCount/);
  assert.match(header, /aria-label=\{favoritesLabel\}/);
  assert.match(header, /aria-current=\{pathname === "\/favorites" \? "page" : undefined\}/);
  assert.match(hook, /queryKey: queryKeys\.favorites\.all/);
  assert.match(hook, /queryClient\.setQueryData<Favorite\[]>/);
  assert.match(hook, /clearFavorites: clearMutation\.mutate/);
  assert.doesNotMatch(header, /favoritesService|localStorage|queryKeys\.favorites/);
  assert.match(i18n, /"nav\.favoritesWithCount": "المفضلة \(\{count\}\)"/);
  assert.match(i18n, /"nav\.favoritesWithCount": "Favorites \(\{count\}\)"/);
});
