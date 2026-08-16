"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { useManagedListings } from "@/hooks/use-managed-listings";
import { useI18n } from "@/lib/i18n";

export function CreateListing() {
  const router = useRouter();
  const { t } = useI18n();
  const { createDraft } = useManagedListings();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void createDraft().then((listing) => router.replace(`/account/listings/${listing.id}/edit`));
  }, [createDraft, router]);
  return (
    <AuthBoundary>
      <main className="mx-auto grid min-h-[60vh] place-items-center px-4" role="status">
        {t("listing.creating")}
      </main>
    </AuthBoundary>
  );
}
