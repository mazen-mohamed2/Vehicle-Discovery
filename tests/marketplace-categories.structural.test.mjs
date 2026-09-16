import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("create and edit share category form descriptors without a manual title requirement", async () => {
  const [create, wizard, form] = await Promise.all([
    read("src/components/listings/CreateListing.tsx"),
    read("src/components/listings/ListingWizard.tsx"),
    read("src/lib/category-form.ts"),
  ]);
  assert.match(create, /listingCategories\.map/);
  assert.match(create, /createDraft\(category\)/);
  assert.match(wizard, /categoryFormFields\[draft\.category\]\.basics/);
  assert.match(wizard, /categoryFormFields\[draft\.category\]\.specifications/);
  assert.match(wizard, /listingTitle\(draft\)/);
  assert.doesNotMatch(form, /manualTitle|titleInput/);
});

test("discovery and navigation expose all categories with URL-backed filters", async () => {
  const [discovery, parser, header] = await Promise.all([
    read("src/components/marketplace/VehicleDiscovery.tsx"),
    read("src/lib/vehicle-discovery.ts"),
    read("src/components/site/SiteHeader.tsx"),
  ]);
  assert.match(discovery, /listingCategories\.map/);
  assert.match(discovery, /category: value \|\| undefined/);
  assert.match(discovery, /motorcycleType: undefined/);
  assert.match(discovery, /boatType: undefined/);
  assert.match(parser, /category === "BOAT" \? undefined : positiveNumber/);
  assert.match(header, /href: "\/vehicles"/);
  assert.match(header, /href=\{`\/vehicles\?category=\$\{category\}`\}/);
  assert.match(header, /className="hidden xl:flex/);
  assert.match(header, /xl:hidden inline-flex/);
});

test("cards, details, compare, and preview use canonical category facts", async () => {
  const [card, detail, compare, preview] = await Promise.all([
    read("src/components/marketplace/VehicleCard.tsx"),
    read("src/app/(site)/vehicles/[id]/vehicle-detail-client.tsx"),
    read("src/app/(site)/compare/compare-client.tsx"),
    read("src/components/listings/ListingPreview.tsx"),
  ]);
  assert.match(card, /summary\.map\(\(fact, index\)/);
  assert.match(detail, /v\.category === "MOTORCYCLE"/);
  assert.match(detail, /category\.boatType/);
  assert.match(compare, /sameCategoryCompareIds\(parseCompareUrlIds/);
  assert.match(compare, /comparisonRows\(t, locale, vehicles\[0\]\.category\)/);
  assert.match(preview, /listingSummary\(toPublicVehicle\(listing\), t, locale\)/);
  assert.match(preview, /if \(isError\)/);
  const wizard = await read("src/components/listings/ListingWizard.tsx");
  assert.match(wizard, /if \(data\.isError\)/);
});

test("Arabic and English keys exist for categories and specific facts", async () => {
  const translations = await read("src/lib/i18n.tsx");
  for (const key of [
    "category.CAR",
    "category.MOTORCYCLE",
    "category.BOAT",
    "category.compareSame",
    "category.motorcycleType",
    "category.boatType",
    "category.propulsion",
    "category.length",
  ]) {
    assert.equal(translations.split(`"${key}":`).length - 1, 2, key);
  }
  assert.match(translations, /\.\.\.marketplaceAr/);
  assert.match(translations, /\.\.\.marketplaceEn/);
  assert.match(translations, /"listing\.wizard\.title": "أضف إعلانك"/);
  assert.match(translations, /"compare\.title": "مقارنة المعروضات"/);
  assert.match(translations, /"vehicleOffers\.mine": "العروض التي قدمتها"/);
  assert.match(
    translations,
    /"hero\.title": "Explore cars, motorcycles, and boats with confidence"/,
  );
});
