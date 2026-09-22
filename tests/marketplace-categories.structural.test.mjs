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
  assert.match(compare, /reconcileCompareIds\(parseCompareUrlIds/);
  assert.match(compare, /listingsQuery\.isFetching[\s\S]*!listingsQuery\.data/);
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
    "category.single.CAR",
    "category.single.MOTORCYCLE",
    "category.single.BOAT",
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
  assert.match(translations, /"compare\.title": "مقارنة الإعلانات"/);
  assert.match(translations, /"vehicleOffers\.mine": "العروض التي قدمتها"/);
  assert.match(
    translations,
    /"hero\.title": "Explore cars, motorcycles, and boats with confidence"/,
  );
});

test("wizard gates every step and exposes accessible inline photo and validation UX", async () => {
  const [wizard, validators] = await Promise.all([
    read("src/components/listings/ListingWizard.tsx"),
    read("src/lib/listing-validators.ts"),
  ]);
  assert.match(validators, /export function validateListingStep/);
  assert.match(validators, /step === "basics"/);
  assert.match(validators, /step === "specifications"/);
  assert.match(validators, /step === "declarations"/);
  assert.match(wizard, /firstInvalidListingStep\(draft, steps\.slice\(step, target\)\)/);
  assert.match(wizard, /navigateTo\(index\)/);
  assert.match(wizard, /querySelector<HTMLElement>\('\[aria-invalid="true"\]'/);
  assert.match(wizard, /currentValidation\[name\]/);
  assert.match(wizard, /listing\.image\.count/);
  assert.match(wizard, /listing\.image\.emptyDescription/);
  assert.match(wizard, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(wizard, /managedListingsService\.revokeImage/);
});

test("shared listing context is used by chat offers and notifications without record snapshots", async () => {
  const [context, conversation, offers, notifications, communicationDomain] = await Promise.all([
    read("src/components/marketplace/ListingContext.tsx"),
    read("src/components/communication/ConversationDetail.tsx"),
    read("src/components/communication/VehicleOffers.tsx"),
    read("src/components/communication/NotificationCenter.tsx"),
    read("src/lib/communication.ts"),
  ]);
  assert.match(context, /listingContextService\.resolve\(listingId\)/);
  assert.match(context, /listing\.context\.unavailable/);
  assert.match(context, /href=\{context\.href\}/);
  assert.match(conversation, /<ListingContext listingId=\{workflow\.conversation\.listingId\}/);
  assert.match(offers, /<ListingContext listingId=\{offer\.listingId\}/);
  assert.match(notifications, /listingIdForNotification/);
  assert.match(notifications, /destinationForNotification/);
  assert.match(notifications, /compact/);
  assert.match(notifications, /<ListingContext/);
  assert.ok(
    notifications.indexOf("</Link>") < notifications.indexOf("<ListingContext"),
    "the secondary listing link must be a sibling, not nested inside the event link",
  );
  assert.doesNotMatch(communicationDomain, /listingSnapshot|imageBase64|imageBinary/);
  assert.doesNotMatch(`${context}${conversation}${offers}${notifications}`, /QuickPreview/);
});

test("recreational boat fields and fixture thumbnails remain within Sprint 11 scope", async () => {
  const [domain, form, fixtures] = await Promise.all([
    read("src/lib/marketplace-listing.ts"),
    read("src/lib/category-form.ts"),
    read("src/services/mock-data.ts"),
  ]);
  for (const field of ["enginePowerHp", "fuelType", "passengerCapacity"])
    assert.match(domain, new RegExp(field));
  assert.match(form, /name: "enginePowerHp"/);
  assert.match(form, /name: "passengerCapacity"/);
  assert.match(fixtures, /\/assets\/motorcycle-1\.png/);
  assert.match(fixtures, /\/assets\/boat-1\.png/);
  for (const prohibited of ["IMO", "cargoCapacity", "commercialTonnage", "classSociety"])
    assert.doesNotMatch(`${domain}${form}`, new RegExp(prohibited));
});
