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
  assert.match(detail, /listings\.length/);
  assert.match(card, /vehicleCount: number/);
  assert.doesNotMatch(card, /a\.vehicleCount/);
});

test("favorites use shared optimistic query mutation", async () => {
  const card = await read("src/components/marketplace/VehicleCard.tsx");
  for (const pattern of [
    /useMutation/,
    /queryKeys\.favorites\.all/,
    /onMutate/,
    /onError/,
    /aria-pressed/,
  ])
    assert.match(card, pattern);
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
