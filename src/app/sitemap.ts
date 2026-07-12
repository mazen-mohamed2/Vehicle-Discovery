import type { MetadataRoute } from "next";
import { listingsService } from "@/services/listings.service";
import { agenciesService } from "@/services/agencies.service";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const staticPaths = [
  "/",
  "/vehicles",
  "/c2c",
  "/dealers",
  "/import",
  "/how-it-works",
  "/about",
  "/contact",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, agencies] = await Promise.all([listingsService.list(), agenciesService.list()]);

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly",
  }));

  const vehicleEntries: MetadataRoute.Sitemap = listings.map((v) => ({
    url: `${siteUrl}/vehicles/${v.id}`,
    changeFrequency: "weekly",
  }));

  const dealerEntries: MetadataRoute.Sitemap = agencies.map((a) => ({
    url: `${siteUrl}/dealers/${a.id}`,
    changeFrequency: "weekly",
  }));

  return [...staticEntries, ...vehicleEntries, ...dealerEntries];
}
