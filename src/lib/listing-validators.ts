import { ListingServiceError, type ListingStep, type ManagedListing } from "@/lib/listing";
import type { CategorySpecs } from "@/lib/marketplace-listing";

export const LISTING_LIMITS = { images: 12, imageBytes: 8 * 1024 * 1024 } as const;
const VIN = /^[A-HJ-NPR-Z0-9]{17}$/i;
type Errors = Record<string, string>;

function validateBasics(listing: ManagedListing): Errors {
  const fields: Errors = {};
  const latestYear = new Date().getFullYear() + 1;
  if (!listing.specs.make.trim()) fields.make = "required";
  if (!listing.specs.model.trim()) fields.model = "required";
  if (listing.year === undefined) fields.year = "required";
  else if (listing.year < 1900 || listing.year > latestYear) fields.year = "range";
  if (
    listing.category === "MOTORCYCLE" &&
    !(listing.specs as CategorySpecs["MOTORCYCLE"]).motorcycleType
  )
    fields.motorcycleType = "required";
  if (listing.category === "BOAT" && !(listing.specs as CategorySpecs["BOAT"]).boatType)
    fields.boatType = "required";
  return fields;
}

function validateSpecifications(listing: ManagedListing): Errors {
  const fields: Errors = {};
  if (listing.category === "CAR") {
    const specs = listing.specs as CategorySpecs["CAR"];
    if (specs.mileage === undefined) fields.mileage = "required";
    else if (specs.mileage < 0) fields.mileage = "nonNegative";
    if (!specs.transmission) fields.transmission = "required";
    if (!specs.fuelType) fields.fuelType = "required";
    if (specs.engineSize !== undefined && (specs.engineSize <= 0 || specs.engineSize > 20))
      fields.engineSize = "range";
    if (specs.horsepower !== undefined && (specs.horsepower <= 0 || specs.horsepower > 3000))
      fields.horsepower = "range";
  } else if (listing.category === "MOTORCYCLE") {
    const specs = listing.specs as CategorySpecs["MOTORCYCLE"];
    if (specs.mileage === undefined) fields.mileage = "required";
    else if (specs.mileage < 0) fields.mileage = "nonNegative";
    if (!specs.engineCapacityCc) fields.engineCapacityCc = "required";
    else if (specs.engineCapacityCc > 3000) fields.engineCapacityCc = "range";
  } else {
    const specs = listing.specs as CategorySpecs["BOAT"];
    if (!specs.lengthMeters) fields.lengthMeters = "required";
    else if (specs.lengthMeters > 100) fields.lengthMeters = "range";
    if (!specs.propulsion) fields.propulsion = "required";
    if (specs.engineCount !== undefined && specs.engineCount < 1) fields.engineCount = "positive";
    if (specs.enginePowerHp !== undefined && specs.enginePowerHp <= 0)
      fields.enginePowerHp = "positive";
    if (specs.engineHours !== undefined && specs.engineHours < 0)
      fields.engineHours = "nonNegative";
    if (specs.passengerCapacity !== undefined && specs.passengerCapacity < 1)
      fields.passengerCapacity = "positive";
  }
  return fields;
}

function validateHistory(listing: ManagedListing): Errors {
  const fields: Errors = {};
  if (listing.category === "CAR") {
    const vin = (listing.specs as CategorySpecs["CAR"]).vin;
    if (!vin?.trim()) fields.vin = "required";
    else if (!VIN.test(vin)) fields.vin = "invalid";
  }
  return fields;
}

function validateCommercial(listing: ManagedListing): Errors {
  const fields: Errors = {};
  if (listing.price === undefined) fields.price = "required";
  else if (listing.price <= 0) fields.price = "positive";
  if (!listing.location.trim()) fields.location = "required";
  return fields;
}

function validatePhotos(listing: ManagedListing): Errors {
  const fields: Errors = {};
  if (listing.images.length === 0) fields.images = "photoRequired";
  else if (listing.images.filter((image) => image.isCover).length !== 1) fields.images = "cover";
  return fields;
}

function validateDeclarations(listing: ManagedListing): Errors {
  const fields: Errors = {};
  const descriptionLength = listing.description.trim().length;
  if (descriptionLength < 30) fields.description = "minimum";
  else if (listing.description.length > 5000) fields.description = "length";
  if (
    Object.entries(listing.declarations).some(
      ([key, value]) => key !== "acceptedAt" && value !== true,
    )
  )
    fields.declarations = "required";
  return fields;
}

/** Validates only fields owned by the active wizard step. */
export function validateListingStep(listing: ManagedListing, step: ListingStep): Errors {
  if (step === "basics") return validateBasics(listing);
  if (step === "specifications") return validateSpecifications(listing);
  if (step === "history") return validateHistory(listing);
  if (step === "commercial") return validateCommercial(listing);
  if (step === "photos") return validatePhotos(listing);
  if (step === "declarations") return validateDeclarations(listing);
  return {};
}

export function firstInvalidListingStep(
  listing: ManagedListing,
  candidateSteps: readonly ListingStep[],
) {
  for (const step of candidateSteps) {
    const fields = validateListingStep(listing, step);
    if (Object.keys(fields).length) return { step, fields };
  }
  return undefined;
}

export function validateListing(listing: ManagedListing, publishing = false) {
  if (publishing)
    return (
      ["basics", "specifications", "history", "commercial", "photos", "declarations"] as const
    ).reduce<Errors>((fields, step) => ({ ...fields, ...validateListingStep(listing, step) }), {});

  const fields: Errors = { ...validateHistory(listing) };
  const latestYear = new Date().getFullYear() + 1;
  if (listing.year !== undefined && (listing.year < 1900 || listing.year > latestYear))
    fields.year = "range";
  if (listing.price !== undefined && listing.price <= 0) fields.price = "positive";
  if (listing.description.length > 5000) fields.description = "length";
  if (
    "mileage" in listing.specs &&
    listing.specs.mileage !== undefined &&
    listing.specs.mileage < 0
  )
    fields.mileage = "nonNegative";
  Object.entries(validateSpecifications(listing)).forEach(([name, error]) => {
    if (error !== "required") fields[name] = error;
  });
  return fields;
}

export function assertPublishable(listing: ManagedListing) {
  const fields = validateListing(listing, true);
  if (Object.keys(fields).length)
    throw new ListingServiceError("PUBLISH_REQUIREMENTS_NOT_MET", fields);
}

export function calculateCompletion(listing: ManagedListing) {
  const requiredSteps = [
    "basics",
    "specifications",
    "history",
    "commercial",
    "photos",
    "declarations",
  ] as const;
  const complete = requiredSteps.filter(
    (step) => Object.keys(validateListingStep(listing, step)).length === 0,
  ).length;
  return Math.round((complete / requiredSteps.length) * 100);
}
