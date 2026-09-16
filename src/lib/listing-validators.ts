import { ListingServiceError, type ManagedListing } from "@/lib/listing";

export const LISTING_LIMITS = { images: 12, imageBytes: 8 * 1024 * 1024 } as const;
const VIN = /^[A-HJ-NPR-Z0-9]{17}$/i;

export function validateListing(listing: ManagedListing, publishing = false) {
  const fields: Record<string, string> = {};
  const year = new Date().getFullYear() + 1;
  if (!listing.specs.make.trim()) fields.make = "required";
  if (!listing.specs.model.trim()) fields.model = "required";
  if (listing.year !== undefined && (listing.year < 1900 || listing.year > year))
    fields.year = "range";
  if (
    "mileage" in listing.specs &&
    listing.specs.mileage !== undefined &&
    listing.specs.mileage < 0
  )
    fields.mileage = "nonNegative";
  if (listing.price !== undefined && listing.price <= 0) fields.price = "positive";
  if (listing.description.length > 5000) fields.description = "length";
  if (listing.category === "CAR") {
    const specs = listing.specs;
    if ("vin" in specs && specs.vin && !VIN.test(specs.vin)) fields.vin = "invalid";
    if (
      "engineSize" in specs &&
      specs.engineSize !== undefined &&
      (specs.engineSize <= 0 || specs.engineSize > 20)
    )
      fields.engineSize = "range";
    if (
      "horsepower" in specs &&
      specs.horsepower !== undefined &&
      (specs.horsepower <= 0 || specs.horsepower > 3000)
    )
      fields.horsepower = "range";
  }
  if (listing.category === "MOTORCYCLE") {
    if (
      "engineCapacityCc" in listing.specs &&
      listing.specs.engineCapacityCc !== undefined &&
      (listing.specs.engineCapacityCc <= 0 || listing.specs.engineCapacityCc > 3000)
    )
      fields.engineCapacityCc = "range";
  }
  if (listing.category === "BOAT") {
    if (
      "lengthMeters" in listing.specs &&
      listing.specs.lengthMeters !== undefined &&
      (listing.specs.lengthMeters <= 0 || listing.specs.lengthMeters > 100)
    )
      fields.lengthMeters = "range";
  }
  if (publishing) {
    if (!listing.year) fields.year = "required";
    if (listing.category === "CAR") {
      if (!("mileage" in listing.specs) || listing.specs.mileage === undefined)
        fields.mileage = "required";
      if (!("transmission" in listing.specs) || !listing.specs.transmission)
        fields.transmission = "required";
      if (!("fuelType" in listing.specs) || !listing.specs.fuelType) fields.fuelType = "required";
    }
    if (listing.category === "MOTORCYCLE") {
      if (!("mileage" in listing.specs) || listing.specs.mileage === undefined)
        fields.mileage = "required";
      if (!("motorcycleType" in listing.specs) || !listing.specs.motorcycleType)
        fields.motorcycleType = "required";
      if (!("engineCapacityCc" in listing.specs) || !listing.specs.engineCapacityCc)
        fields.engineCapacityCc = "required";
    }
    if (listing.category === "BOAT") {
      if (!("boatType" in listing.specs) || !listing.specs.boatType) fields.boatType = "required";
      if (!("lengthMeters" in listing.specs) || !listing.specs.lengthMeters)
        fields.lengthMeters = "required";
      if (!("propulsion" in listing.specs) || !listing.specs.propulsion)
        fields.propulsion = "required";
    }
    if (!listing.price) fields.price = "required";
    if (!listing.location.trim()) fields.location = "required";
    if (listing.description.trim().length < 30) fields.description = "minimum";
    const durableImages = listing.images.filter((image) => !image.temporary);
    if (durableImages.length > 0 && durableImages.filter((image) => image.isCover).length !== 1)
      fields.images = "cover";
    if (
      Object.entries(listing.declarations).some(
        ([key, value]) => key !== "acceptedAt" && value !== true,
      )
    )
      fields.declarations = "required";
  }
  return fields;
}

export function assertPublishable(listing: ManagedListing) {
  const fields = validateListing(listing, true);
  if (Object.keys(fields).length)
    throw new ListingServiceError("PUBLISH_REQUIREMENTS_NOT_MET", fields);
}

export function calculateCompletion(listing: ManagedListing) {
  const specs = listing.specs;
  const categoryChecks =
    listing.category === "CAR"
      ? ["transmission" in specs && specs.transmission, "fuelType" in specs && specs.fuelType]
      : listing.category === "MOTORCYCLE"
        ? [
            "motorcycleType" in specs && specs.motorcycleType,
            "engineCapacityCc" in specs && specs.engineCapacityCc,
          ]
        : [
            "boatType" in specs && specs.boatType,
            "lengthMeters" in specs && specs.lengthMeters,
            "propulsion" in specs && specs.propulsion,
          ];
  const checks = [
    specs.make,
    specs.model,
    listing.year,
    ...categoryChecks,
    listing.price,
    listing.location,
    listing.description.trim().length >= 30,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
