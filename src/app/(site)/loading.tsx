import { DealerGridSkeleton, VehicleGridSkeleton } from "@/components/marketplace/CollectionStates";
import { Skeleton } from "@/components/ui/skeleton";

export default function SiteLoading() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      aria-label="Loading"
      aria-busy="true"
    >
      <Skeleton className="mb-8 h-10 w-64" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <VehicleGridSkeleton />
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DealerGridSkeleton />
      </div>
    </div>
  );
}
