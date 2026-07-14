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
