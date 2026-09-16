"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { useManagedListings } from "@/hooks/use-managed-listings";
import { useI18n } from "@/lib/i18n";
import {
  listingCategories,
  listingCategoryRegistry,
  type ListingCategory,
} from "@/lib/marketplace-listing";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CreateListing() {
  const router = useRouter();
  const { t } = useI18n();
  const { createDraft } = useManagedListings();
  const [busy, setBusy] = useState(false);
  const choose = async (category: ListingCategory) => {
    if (busy) return;
    setBusy(true);
    try {
      const listing = await createDraft(category);
      router.replace(`/account/listings/${listing.id}/edit`);
    } catch {
      setBusy(false);
      toast.error(t("listing.error.save"));
    }
  };
  return (
    <AuthBoundary>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-black">{t("category.choose")}</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {listingCategories.map((category) => (
            <Button
              key={category}
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void choose(category)}
              className="h-auto min-h-24 flex-col gap-2 whitespace-normal rounded-2xl p-5 text-center focus-visible:ring-2"
            >
              <span className="text-lg font-bold">
                {t(listingCategoryRegistry[category].labelKey)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(`category.description.${category}`)}
              </span>
            </Button>
          ))}
        </div>
        {busy && (
          <p className="mt-4" role="status">
            {t("listing.creating")}
          </p>
        )}
      </main>
    </AuthBoundary>
  );
}
