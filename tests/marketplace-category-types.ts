import type {
  BoatSpecs,
  CarSpecs,
  MarketplaceListing,
  MarketplaceListingCommon,
  MotorcycleSpecs,
} from "../src/lib/marketplace-listing";

declare const common: MarketplaceListingCommon;
declare const car: CarSpecs;
declare const motorcycle: MotorcycleSpecs;
declare const boat: BoatSpecs;

const validCar: MarketplaceListing = { ...common, category: "CAR", specs: car };
const validMotorcycle: MarketplaceListing = {
  ...common,
  category: "MOTORCYCLE",
  specs: motorcycle,
};
const validBoat: MarketplaceListing = { ...common, category: "BOAT", specs: boat };

// @ts-expect-error A boat cannot carry car specifications.
const invalidBoat: MarketplaceListing = { ...common, category: "BOAT", specs: car };
// @ts-expect-error A motorcycle cannot carry boat specifications.
const invalidMotorcycle: MarketplaceListing = { ...common, category: "MOTORCYCLE", specs: boat };
// @ts-expect-error A car cannot carry motorcycle specifications.
const invalidCar: MarketplaceListing = { ...common, category: "CAR", specs: motorcycle };

void [validCar, validMotorcycle, validBoat, invalidBoat, invalidMotorcycle, invalidCar];
