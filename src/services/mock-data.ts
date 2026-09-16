import type { Agency, VehicleListing } from "@/lib/types";
import { isMarketplaceListing, type MarketplaceListing } from "@/lib/marketplace-listing";

const car1 = "/assets/car-1.jpg";
const car2 = "/assets/car-2.jpg";
const car3 = "/assets/car-3.jpg";
const car4 = "/assets/car-4.jpg";

const images = [car1, car2, car3, car4];

export const mockAgencies: Agency[] = [
  {
    id: "ag1",
    name: "الفهد موتورز",
    rating: 4.8,
    completedDeals: 342,
    vehicleCount: 58,
    verified: true,
    location: "القاهرة",
    since: 2015,
  },
  {
    id: "ag2",
    name: "Nile Auto Group",
    rating: 4.7,
    completedDeals: 289,
    vehicleCount: 47,
    verified: true,
    location: "الجيزة",
    since: 2011,
  },
  {
    id: "ag3",
    name: "Sahara Motors",
    rating: 4.9,
    completedDeals: 512,
    vehicleCount: 92,
    verified: true,
    location: "الإسكندرية",
    since: 2008,
  },
  {
    id: "ag4",
    name: "Delta Cars",
    rating: 4.6,
    completedDeals: 178,
    vehicleCount: 33,
    verified: true,
    location: "المنصورة",
    since: 2018,
  },
];

mockAgencies.forEach((agency, index) => {
  agency.reviewCount = 42 + index * 17;
  agency.description = `${agency.name} offers a carefully selected range of new and used vehicles with transparent marketplace support.`;
  agency.address = `${agency.location}, Egypt`;
  agency.workingHours = "Saturday–Thursday, 10:00–20:00";
  agency.phone = "+20 100 000 0000";
  agency.email = `sales@dealer-${index + 1}.example`;
  agency.website = `www.dealer-${index + 1}.example`;
  agency.responseTime = "Within one hour";
});

type LegacyCarSeed = {
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: "EGP" | "USD";
  mileage: number;
  location: string;
  condition: "new" | "used";
  fuel: "gasoline" | "diesel" | "hybrid" | "electric";
  transmission: "automatic" | "manual";
  sellerType: "individual" | "agency";
  sellerId: string;
  sellerUserId?: string;
  sellerName: string;
  verified: boolean;
  featured: boolean;
  createdAt: string;
};
const baseListings: LegacyCarSeed[] = [
  {
    title: "BMW 530i M Sport",
    make: "BMW",
    model: "530i",
    year: 2023,
    price: 2450000,
    currency: "EGP",
    mileage: 12000,
    location: "القاهرة",
    condition: "used",
    fuel: "gasoline",
    transmission: "automatic",
    sellerType: "agency",
    sellerId: "ag1",
    sellerUserId: "dealer-demo",
    sellerName: "الفهد موتورز",
    verified: true,
    featured: true,
    createdAt: "2026-06-01",
  },
  {
    title: "Mercedes-Benz C200 AMG Line",
    make: "Mercedes",
    model: "C200",
    year: 2024,
    price: 3100000,
    currency: "EGP",
    mileage: 0,
    location: "الجيزة",
    condition: "new",
    fuel: "gasoline",
    transmission: "automatic",
    sellerType: "agency",
    sellerId: "ag2",
    sellerUserId: "dealer-qa-b",
    sellerName: "Nile Auto Group",
    verified: true,
    featured: true,
    createdAt: "2026-06-04",
  },
  {
    title: "Toyota Corolla XLI",
    make: "Toyota",
    model: "Corolla",
    year: 2022,
    price: 720000,
    currency: "EGP",
    mileage: 45000,
    location: "الإسكندرية",
    condition: "used",
    fuel: "gasoline",
    transmission: "automatic",
    sellerType: "individual",
    sellerId: "user-demo",
    sellerUserId: "user-demo",
    sellerName: "أحمد م.",
    verified: false,
    featured: false,
    createdAt: "2026-06-07",
  },
  {
    title: "Hyundai Tucson GLS",
    make: "Hyundai",
    model: "Tucson",
    year: 2023,
    price: 1180000,
    currency: "EGP",
    mileage: 22000,
    location: "القاهرة",
    condition: "used",
    fuel: "gasoline",
    transmission: "automatic",
    sellerType: "agency",
    sellerId: "ag3",
    sellerName: "Sahara Motors",
    verified: true,
    featured: true,
    createdAt: "2026-06-09",
  },
  {
    title: "Kia Sportage EX",
    make: "Kia",
    model: "Sportage",
    year: 2024,
    price: 1490000,
    currency: "EGP",
    mileage: 0,
    location: "المنصورة",
    condition: "new",
    fuel: "hybrid",
    transmission: "automatic",
    sellerType: "agency",
    sellerId: "ag4",
    sellerName: "Delta Cars",
    verified: true,
    featured: false,
    createdAt: "2026-06-10",
  },
  {
    title: "Nissan Sunny Super Salon",
    make: "Nissan",
    model: "Sunny",
    year: 2021,
    price: 540000,
    currency: "EGP",
    mileage: 62000,
    location: "القاهرة",
    condition: "used",
    fuel: "gasoline",
    transmission: "manual",
    sellerType: "individual",
    sellerId: "user-qa-b",
    sellerUserId: "user-qa-b",
    sellerName: "محمد س.",
    verified: false,
    featured: false,
    createdAt: "2026-06-11",
  },
  {
    title: "Audi Q5 Quattro",
    make: "Audi",
    model: "Q5",
    year: 2023,
    price: 3450000,
    currency: "EGP",
    mileage: 8000,
    location: "القاهرة",
    condition: "used",
    fuel: "gasoline",
    transmission: "automatic",
    sellerType: "agency",
    sellerId: "ag1",
    sellerUserId: "dealer-demo",
    sellerName: "الفهد موتورز",
    verified: true,
    featured: true,
    createdAt: "2026-06-12",
  },
  {
    title: "MG ZS 1.5",
    make: "MG",
    model: "ZS",
    year: 2024,
    price: 780000,
    currency: "EGP",
    mileage: 0,
    location: "الجيزة",
    condition: "new",
    fuel: "gasoline",
    transmission: "automatic",
    sellerType: "agency",
    sellerId: "ag2",
    sellerUserId: "dealer-qa-b",
    sellerName: "Nile Auto Group",
    verified: true,
    featured: false,
    createdAt: "2026-06-13",
  },
];

const carListings: VehicleListing[] = baseListings.map((l, i) => ({
  title: l.title,
  year: l.year,
  price: l.price,
  currency: l.currency,
  location: l.location,
  condition: l.condition,
  sellerType: l.sellerType,
  sellerId: l.sellerId,
  sellerUserId: l.sellerUserId,
  sellerName: l.sellerName,
  verified: l.verified,
  featured: l.featured,
  createdAt: l.createdAt,
  category: "CAR" as const,
  specs: {
    make: l.make,
    model: l.model,
    trim: "",
    mileage: l.mileage,
    transmission: l.transmission,
    fuelType: l.fuel,
    bodyType: ["Sedan", "SUV", "Sedan", "SUV"][i % 4],
    drivetrain: "",
    exteriorColor: ["Black", "White", "Silver", "Blue"][i % 4],
    interiorColor: "",
    engineSize: i % 2 === 0 ? 2 : 1.6,
    engineDisplay: l.fuel === "electric" ? "Electric motor" : i % 2 === 0 ? "2.0 L" : "1.6 L",
    accidentHistory: "unknown" as const,
    importStatus: "unknown" as const,
    warrantyStatus: "unknown" as const,
    serviceHistoryAvailable: false,
    vin: `SD${String(i + 1).padStart(15, "0")}`,
  },
  id: `v${i + 1}`,
  images: images.map((url, imageIndex) => ({
    id: `m${i}-${imageIndex}`,
    url: images[(i + imageIndex) % images.length],
    alt: `${l.title} ${imageIndex + 1}`,
  })),
  updatedAt: i % 2 === 0 ? "2026-06-15" : l.createdAt,
  stockId: `SD-${String(i + 1).padStart(5, "0")}`,
  views: 180 + i * 73,
}));

const categoryListings: MarketplaceListing[] = [
  {
    id: "moto1",
    category: "MOTORCYCLE",
    title: "Yamaha MT-07",
    year: 2024,
    price: 420000,
    currency: "EGP",
    location: "Cairo",
    condition: "used",
    sellerType: "individual",
    sellerId: "user-qa-b",
    sellerUserId: "user-qa-b",
    sellerName: "Mohamed S.",
    verified: false,
    featured: false,
    images: [],
    createdAt: "2026-06-14",
    updatedAt: "2026-06-14",
    specs: {
      make: "Yamaha",
      model: "MT-07",
      mileage: 3500,
      motorcycleType: "naked",
      engineCapacityCc: 689,
      transmission: "manual",
    },
  },
  {
    id: "boat1",
    category: "BOAT",
    title: "Bayliner VR5",
    year: 2022,
    price: 1850000,
    currency: "EGP",
    location: "Alexandria",
    condition: "used",
    sellerType: "agency",
    sellerId: "ag1",
    sellerUserId: "dealer-demo",
    sellerName: "Al Fahd Motors",
    verified: false,
    featured: false,
    images: [],
    createdAt: "2026-06-15",
    updatedAt: "2026-06-15",
    specs: {
      make: "Bayliner",
      model: "VR5",
      boatType: "motorboat",
      lengthMeters: 6.23,
      propulsion: "inboard",
      engineCount: 1,
      engineHours: 140,
      hullMaterial: "Fiberglass",
    },
  },
];

export const mockListings: VehicleListing[] = [...carListings, ...categoryListings].map(
  (listing) => {
    if (!isMarketplaceListing(listing)) throw new Error("Invalid mock marketplace listing");
    return listing;
  },
);

export const mockBrands = [
  "BMW",
  "Mercedes",
  "Toyota",
  "Hyundai",
  "Kia",
  "Nissan",
  "Audi",
  "MG",
  "Honda",
  "Chevrolet",
  "Peugeot",
  "Renault",
];

export const mockStats = {
  listings: 12480,
  agencies: 214,
  deals: 8340,
  users: 56000,
};

export const mockTestimonials = [
  {
    id: "t1",
    author: "سارة ع.",
    role: "مشترية",
    quote: "اشتريت سيارتي بأمان تام والدفع كان محمي بالضمان. تجربة ممتازة.",
  },
  {
    id: "t2",
    author: "خالد م.",
    role: "بائع",
    quote: "بعت سيارتي خلال أسبوع فقط، والمنصة سهلة جداً.",
  },
  {
    id: "t3",
    author: "Nour A.",
    role: "Buyer",
    quote: "The escrow made me feel completely safe buying my first car online.",
  },
];

export const mockFaqs = [
  {
    q: "كيف يعمل الدفع الآمن؟",
    a: "أموالك محفوظة في حساب ضمان حتى استلامك للسيارة والتأكد من مطابقتها للمواصفات.",
  },
  {
    q: "ما الفرق بين البائع الفردي والوكيل؟",
    a: "الوكلاء معتمدون وموثقون وتخضع منشآتهم للتحقق، بينما الأفراد يبيعون سياراتهم الشخصية مباشرة.",
  },
  {
    q: "كم يستغرق طلب الاستيراد الخاص؟",
    a: "يعتمد على البلد ونوع السيارة، عادة بين 4 و12 أسبوعاً بعد قبول العرض.",
  },
  {
    q: "هل يمكنني إلغاء الصفقة؟",
    a: "نعم، يمكن استرداد الأموال المحفوظة في الضمان وفق شروط الحماية قبل الإفراج عنها.",
  },
];
