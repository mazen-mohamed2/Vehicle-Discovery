"use client";

import Link from "next/link";
import { Flag } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VehicleCard } from "@/components/marketplace/VehicleCard";
import { ReportDialog } from "@/components/trust-safety/ReportDialog";
import { TrustBadge } from "@/components/trust-safety/TrustBadge";
import { queryKeys } from "@/lib/query-keys";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/locale";
import { sellerProfilesService } from "@/services/seller-profiles.service";
import { trustSafetyService } from "@/services/trust-safety.service";

export function SellerProfile({ userId }: { userId: string }) {
  const { t, locale } = useI18n();
  const [reportOpen, setReportOpen] = useState(false);
  const auth = useAuth();
  const query = useQuery({
    queryKey: queryKeys.trustSafety.sellerProfile(userId),
    queryFn: () => sellerProfilesService.byId(userId),
  });
  if (query.isPending)
    return (
      <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10" role="status">
        {t("a11y.loading")}
      </main>
    );
  if (query.isError)
    return (
      <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10" role="alert">
        {t("safety.error")}
      </main>
    );
  if (!query.data)
    return (
      <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-black">{t("seller.notFound")}</h1>
        <Button asChild className="mt-5">
          <Link href="/vehicles">{t("nav.vehicles")}</Link>
        </Button>
      </main>
    );
  const profile = query.data;
  const listings = sellerProfilesService.listings(userId);
  const initials = profile.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-center gap-4 rounded-2xl surface-card p-6 shadow-card">
        <Avatar className="h-20 w-20">
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-primary">{t("seller.individual")}</p>
          <h1 className="truncate text-3xl font-black">{profile.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {t("seller.memberSince")} {formatDate(profile.memberSince, locale)}
          </p>
          <TrustBadge status={trustSafetyService.publicStatus("INDIVIDUAL", profile.id)} />
        </div>
        <Button
          variant="outline"
          onClick={() => auth.requireAuth(`/sellers/${userId}`, () => setReportOpen(true))}
        >
          <Flag className="me-2 h-4 w-4" />
          {t("safety.report.seller")}
        </Button>
      </header>
      <section className="mt-8" aria-labelledby="seller-listings">
        <h2 id="seller-listings" className="text-2xl font-black">
          {t("seller.listings")}
        </h2>
        {listings.length ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <VehicleCard key={listing.id} v={listing} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl surface-card p-8 text-muted-foreground">
            {t("seller.noListings")}
          </p>
        )}
      </section>
      <section className="mt-8 rounded-2xl surface-card p-6">
        <h2 className="text-2xl font-black">{t("seller.reputation")}</h2>
        <p className="mt-2 text-muted-foreground">{t("seller.noReviews")}</p>
      </section>
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="USER"
        targetId={profile.id}
      />
    </main>
  );
}
