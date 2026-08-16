import type { Metadata } from "next";
import { listingsService } from "@/services/listings.service";
import { agenciesService } from "@/services/agencies.service";
import { VehicleDetailClient } from "./vehicle-detail-client";
import { getRequestLocale } from "@/lib/server-locale";
import { formatCurrency, formatMileage, formatYear } from "@/lib/locale";
import { PublicVehicleDetailResolver } from "./public-vehicle-detail-resolver";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await listingsService.byId(id);
  const locale = await getRequestLocale();
  const brand = locale === "ar" ? "سهلة درج" : "Sahla Daraj";
  if (!vehicle) {
    return {
      title: `${locale === "ar" ? "سيارة غير موجودة" : "Vehicle not found"} — ${brand}`,
      robots: { index: false, follow: false },
    };
  }
  const description =
    locale === "ar"
      ? `${vehicle.title}، موديل ${formatYear(vehicle.year, locale)}، بسعر ${formatCurrency(vehicle.price, vehicle.currency, locale)} ومسافة ${formatMileage(vehicle.mileage, locale, "كم")}.`
      : `${vehicle.title}, ${formatYear(vehicle.year, locale)}, priced at ${formatCurrency(vehicle.price, vehicle.currency, locale)} with ${formatMileage(vehicle.mileage, locale, "km")}.`;
  const image = vehicle.images[0];
  return {
    title: `${vehicle.title} — ${brand}`,
    description,
    alternates: { canonical: `/vehicles/${id}` },
    openGraph: {
      title: vehicle.title,
      description,
      url: `/vehicles/${id}`,
      type: "website",
      images: image ? [{ url: image.url, alt: image.alt }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: vehicle.title,
      description,
      images: image ? [image.url] : undefined,
    },
  };
}

export default async function VehicleDetailPage({ params }: Props) {
  const { id } = await params;
  const vehicle = await listingsService.byId(id);
  if (!vehicle) return <PublicVehicleDetailResolver id={id} />;

  const [related, seller] = await Promise.all([
    listingsService.related(id, 4),
    vehicle.sellerType === "agency"
      ? Promise.all([
          agenciesService.byId(vehicle.sellerId),
          listingsService.byAgency(vehicle.sellerId),
        ]).then(([agency, inventory]) =>
          agency ? { ...agency, vehicleCount: inventory.length } : undefined,
        )
      : undefined,
  ]);

  return <VehicleDetailClient vehicle={vehicle} seller={seller} related={related} />;
}
