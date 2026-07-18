"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, ImageOff } from "lucide-react";
import type { VehicleMedia } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function VehicleGallery({ images, title }: { images: VehicleMedia[]; title: string }) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [loadedImageId, setLoadedImageId] = useState<string | null>(null);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const touchStart = useRef<number | null>(null);
  const safeImages = images.filter((image) => image.url);
  const current = safeImages[active];

  const previous = useCallback(() => {
    if (safeImages.length < 2) return;
    setActive((index) => (index - 1 + safeImages.length) % safeImages.length);
  }, [safeImages.length]);
  const next = useCallback(() => {
    if (safeImages.length < 2) return;
    setActive((index) => (index + 1) % safeImages.length);
  }, [safeImages.length]);

  useEffect(() => {
    if (!fullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, next, previous]);

  const galleryImage = (isPrimary: boolean) =>
    current && !failed.has(current.id) ? (
      <Image
        key={current.id}
        src={current.url}
        alt={current.alt || title}
        fill
        priority={isPrimary && active === 0}
        fetchPriority={isPrimary && active === 0 ? "high" : "auto"}
        sizes="(min-width: 1280px) 800px, (min-width: 1024px) 65vw, 100vw"
        className={cn(
          "object-cover transition-opacity",
          loadedImageId === current.id ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoadedImageId(current.id)}
        onError={() => setFailed((items) => new Set(items).add(current.id))}
      />
    ) : (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 bg-muted text-muted-foreground">
        <ImageOff className="h-10 w-10" aria-hidden="true" />
        <span className="text-sm font-semibold">{t("vehicle.gallery.noImages")}</span>
      </div>
    );

  const controls = safeImages.length > 1 && (
    <>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label={t("vehicle.gallery.previous")}
        onClick={previous}
        className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full"
      >
        <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label={t("vehicle.gallery.next")}
        onClick={next}
        className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full"
      >
        <ChevronRight className="h-5 w-5 rtl:rotate-180" />
      </Button>
    </>
  );

  return (
    <section aria-label={t("vehicle.gallery.label")}>
      <div
        className="relative aspect-[16/10] w-full touch-pan-y overflow-hidden rounded-2xl surface-card shadow-card"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") previous();
          if (event.key === "ArrowRight") next();
        }}
        onTouchStart={(event) => (touchStart.current = event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return;
          const distance =
            (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
          if (Math.abs(distance) > 45) {
            if (distance > 0) previous();
            else next();
          }
          touchStart.current = null;
        }}
      >
        {current && loadedImageId !== current.id && !failed.has(current.id) && (
          <Skeleton className="absolute inset-0" />
        )}
        {galleryImage(true)}
        {controls}
        {current && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label={t("vehicle.gallery.fullscreen")}
            onClick={() => setFullscreen(true)}
            className="absolute end-3 top-3 rounded-full"
          >
            <Expand className="h-4 w-4" />
          </Button>
        )}
        {safeImages.length > 0 && (
          <span className="absolute bottom-3 end-3 rounded-full bg-background/90 px-3 py-1 text-xs font-bold">
            {active + 1} / {safeImages.length}
          </span>
        )}
      </div>

      {safeImages.length > 1 && (
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-2"
          aria-label={t("vehicle.gallery.thumbnails")}
        >
          {safeImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={t("vehicle.gallery.select").replace("{number}", String(index + 1))}
              aria-current={active === index ? "true" : undefined}
              onClick={() => setActive(index)}
              className={cn(
                "relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border-2 bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active === index
                  ? "border-primary"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                loading="lazy"
                sizes="112px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="h-[90vh] max-w-[95vw] border-0 bg-black p-0 text-white">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("vehicle.gallery.fullscreenDescription")}
          </DialogDescription>
          <div className="relative h-full overflow-hidden rounded-lg">
            {galleryImage(false)}
            {controls}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
