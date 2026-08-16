import { ListingServiceError, type ManagedListing } from "@/lib/listing";

export const LISTING_LIMITS = { images: 12, imageBytes: 8 * 1024 * 1024 } as const;
const VIN = /^[A-HJ-NPR-Z0-9]{17}$/i;

export function validateListing(listing: ManagedListing, publishing = false) {
  const fields: Record<string, string> = {};
  const year = new Date().getFullYear() + 1;
  if (!listing.make.trim()) fields.make = "required";
  if (!listing.model.trim()) fields.model = "required";
  if (listing.year !== undefined && (listing.year < 1900 || listing.year > year))
    fields.year = "range";
  if (listing.mileage !== undefined && listing.mileage < 0) fields.mileage = "nonNegative";
  if (listing.price !== undefined && listing.price <= 0) fields.price = "positive";
  if (listing.description.length > 5000) fields.description = "length";
  if (listing.vin && !VIN.test(listing.vin)) fields.vin = "invalid";
  if (listing.engineSize !== undefined && (listing.engineSize <= 0 || listing.engineSize > 20))
    fields.engineSize = "range";
  if (listing.horsepower !== undefined && (listing.horsepower <= 0 || listing.horsepower > 3000))
    fields.horsepower = "range";
  if (publishing) {
    if (!listing.year) fields.year = "required";
    if (listing.mileage === undefined) fields.mileage = "required";
    if (!listing.transmission) fields.transmission = "required";
    if (!listing.fuelType) fields.fuelType = "required";
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
  const checks = [
    listing.make,
    listing.model,
    listing.year,
    listing.transmission,
    listing.fuelType,
    listing.price,
    listing.location,
    listing.description.trim().length >= 30,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
