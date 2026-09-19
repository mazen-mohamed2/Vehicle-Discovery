import type { ListingCategory } from "@/lib/marketplace-listing";

export type CategoryField = {
  name: string;
  labelKey: string;
  kind: "text" | "number" | "select";
  options?: readonly string[];
  required?: boolean;
};

/** Shared Create/Edit descriptors; CAR retains its mature hand-tuned inputs. */
export const categoryFormFields: Record<
  Exclude<ListingCategory, "CAR">,
  {
    basics: readonly CategoryField[];
    specifications: readonly CategoryField[];
  }
> = {
  MOTORCYCLE: {
    basics: [
      { name: "make", labelKey: "form.make", kind: "text", required: true },
      { name: "model", labelKey: "form.model", kind: "text", required: true },
      {
        name: "motorcycleType",
        labelKey: "category.motorcycleType",
        kind: "select",
        options: ["scooter", "sport", "cruiser", "touring", "adventure", "naked", "off-road"],
        required: true,
      },
    ],
    specifications: [
      { name: "mileage", labelKey: "listing.field.mileage", kind: "number", required: true },
      {
        name: "engineCapacityCc",
        labelKey: "category.engineCapacity",
        kind: "number",
        required: true,
      },
      {
        name: "transmission",
        labelKey: "vehicle.transmission",
        kind: "select",
        options: ["automatic", "manual"],
      },
    ],
  },
  BOAT: {
    basics: [
      { name: "make", labelKey: "form.make", kind: "text", required: true },
      { name: "model", labelKey: "form.model", kind: "text", required: true },
      {
        name: "boatType",
        labelKey: "category.boatType",
        kind: "select",
        options: ["motorboat", "yacht", "speedboat", "fishing", "sailboat", "personal-watercraft"],
        required: true,
      },
    ],
    specifications: [
      { name: "lengthMeters", labelKey: "category.length", kind: "number", required: true },
      {
        name: "propulsion",
        labelKey: "category.propulsion",
        kind: "select",
        options: ["outboard", "inboard", "sail", "jet"],
        required: true,
      },
      { name: "engineCount", labelKey: "category.engineCount", kind: "number" },
      { name: "enginePowerHp", labelKey: "category.enginePower", kind: "number" },
      { name: "engineHours", labelKey: "category.engineHours", kind: "number" },
      {
        name: "fuelType",
        labelKey: "vehicle.fuel",
        kind: "select",
        options: ["gasoline", "diesel", "electric"],
      },
      { name: "passengerCapacity", labelKey: "category.passengerCapacity", kind: "number" },
      { name: "hullMaterial", labelKey: "category.hullMaterial", kind: "text" },
    ],
  },
};
