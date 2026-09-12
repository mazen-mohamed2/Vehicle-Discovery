import type { Metadata } from "next";
import { SellerProfile } from "@/components/trust-safety/SellerProfile";
import { sellerProfilesService } from "@/services/seller-profiles.service";
import { getRequestLocale } from "@/lib/server-locale";

export function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  return Promise.all([params, getRequestLocale()]).then(([{ userId }, locale]) => {
    const profile = sellerProfilesService.byId(userId);
    return profile
      ? {
          title: `${profile.displayName} — ${locale === "ar" ? "سهلة درج" : "Sahla Daraj"}`,
          description:
            locale === "ar"
              ? "ملف البائع الفردي العام والسيارات المنشورة حالياً."
              : "Public individual seller profile and active vehicle listings.",
          alternates: { canonical: `/sellers/${userId}` },
        }
      : {
          title: locale === "ar" ? "البائع غير موجود" : "Seller not found",
          robots: { index: false, follow: false },
        };
  });
}
export default async function SellerPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <SellerProfile userId={userId} />;
}
