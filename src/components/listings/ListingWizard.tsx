"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useManagedListings } from "@/hooks/use-managed-listings";
import { useI18n } from "@/lib/i18n";
import { validateListing } from "@/lib/listing-validators";
import type { ListingImage, ListingStep, ManagedListing } from "@/lib/listing";
import { managedListingsService } from "@/services/managed-listings.service";
import { categoryFormFields, type CategoryField } from "@/lib/category-form";
import { listingCategoryRegistry } from "@/lib/marketplace-listing";
import { listingTitle } from "@/lib/listing";

const steps: ListingStep[] = [
  "basics",
  "specifications",
  "history",
  "commercial",
  "photos",
  "declarations",
  "review",
];
const numeric = (value: string) => (value === "" ? undefined : Number(value));

export function ListingWizard({ listingId }: { listingId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const data = useManagedListings(listingId);
  const updateListing = data.updateListing;
  const [draft, setDraft] = useState<ManagedListing>();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lastSaved = useRef("");
  const imagesAtUnmount = useRef<ListingImage[]>([]);
  useEffect(() => {
    if (data.listing && !draft) {
      setDraft(data.listing);
      setStep(Math.max(0, steps.indexOf(data.listing.currentStep)));
      lastSaved.current = JSON.stringify(data.listing);
    }
  }, [data.listing, draft]);
  useEffect(() => {
    if (!draft) return;
    const serialized = JSON.stringify(draft);
    if (serialized === lastSaved.current) return;
    const timer = window.setTimeout(() => {
      void updateListing({ listingId, patch: draft })
        .then((saved) => {
          lastSaved.current = JSON.stringify(saved);
          setDraft((current) =>
            current && JSON.stringify(current) === serialized ? saved : current,
          );
        })
        .catch(() => toast.error(t("listing.error.save")));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [draft, listingId, t, updateListing]);
  useEffect(() => {
    imagesAtUnmount.current = draft?.images ?? [];
  }, [draft?.images]);
  useEffect(() => () => imagesAtUnmount.current.forEach(managedListingsService.revokeImage), []);
  const active = steps[step];
  const invalid = useMemo(() => (draft ? validateListing(draft, false) : {}), [draft]);
  if (data.isError)
    return (
      <AuthBoundary>
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6" role="alert">
          <p>
            {t(
              data.error instanceof Error &&
                "code" in data.error &&
                data.error.code === "LISTING_NOT_FOUND"
                ? "listing.error.notFound"
                : "listing.error.load",
            )}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/account/listings">{t("listing.backToList")}</Link>
          </Button>
        </main>
      </AuthBoundary>
    );
  if (data.isLoading || !draft)
    return (
      <AuthBoundary>
        <main className="mx-auto min-h-[60vh] max-w-5xl px-4 py-12" role="status">
          {t("a11y.loading")}
        </main>
      </AuthBoundary>
    );
  const set = <K extends keyof ManagedListing>(key: K, value: ManagedListing[K]) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
            ...(current.category === "CAR" && key in current.specs
              ? { specs: { ...current.specs, [key]: value } }
              : {}),
          }
        : current,
    );
  const setSpec = (name: string, value: string | number | undefined) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            specs: { ...current.specs, [name]: value },
            ...(name === "make" || name === "model" || name === "mileage" || name === "transmission"
              ? { [name]: value }
              : {}),
          }
        : current,
    );
  const next = () => {
    const currentErrors = validateListing(draft, false);
    setErrors(currentErrors);
    if (Object.keys(currentErrors).length) {
      document.getElementById("listing-errors")?.focus();
      return;
    }
    const nextStep = Math.min(steps.length - 1, step + 1);
    setStep(nextStep);
    set("currentStep", steps[nextStep]);
  };
  const publish = async () => {
    try {
      await data.updateListing({ listingId, patch: draft });
      await data.runAction({ name: "publish", listingId });
      toast.success(t("listing.success.published"));
      router.push("/account/listings");
    } catch (error) {
      const fields =
        error && typeof error === "object" && "fields" in error
          ? (error.fields as Record<string, string>)
          : validateListing(draft, true);
      setErrors(fields);
      document.getElementById("listing-errors")?.focus();
      toast.error(t("listing.error.publish"));
    }
  };
  const field = (name: string) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const message = (name: string) =>
    errors[name] ? (
      <p id={`${name}-error`} className="text-sm text-destructive">
        {t(`listing.validation.${errors[name]}`)}
      </p>
    ) : null;
  return (
    <AuthBoundary>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-primary">{t("listing.wizard.eyebrow")}</p>
            <h1 className="text-3xl font-black">{t("listing.wizard.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t(listingCategoryRegistry[draft.category].labelKey)}
            </p>
            <p className="text-sm text-muted-foreground">
              {draft.completionPercentage}% ·{" "}
              {data.isSaving ? t("listing.saving") : t("listing.saved")}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/account/listings">{t("listing.saveExit")}</Link>
          </Button>
        </header>
        <ol
          aria-label={t("listing.steps.label")}
          className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
        >
          {steps.map((item, index) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => setStep(index)}
                aria-current={index === step ? "step" : undefined}
                className={`w-full rounded-lg border p-2 text-xs ${index === step ? "border-primary bg-primary/10" : "border-border"}`}
              >
                {index + 1}. {t(`listing.step.${item}`)}
              </button>
            </li>
          ))}
        </ol>
        {Object.keys(errors).length > 0 && (
          <div
            id="listing-errors"
            tabIndex={-1}
            role="alert"
            className="mb-5 rounded-lg border border-destructive p-4"
          >
            <strong>{t("listing.error.summary")}</strong>
            <p>{t("listing.error.correct")}</p>
          </div>
        )}
        <section className="surface-card rounded-2xl p-5 shadow-card sm:p-7">
          <h2 className="mb-5 text-xl font-black">{t(`listing.step.${active}`)}</h2>
          {active === "basics" && draft.category !== "CAR" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <CategoryFields
                fields={categoryFormFields[draft.category].basics}
                draft={draft}
                setSpec={setSpec}
                errors={errors}
              />
              <Field label={t("form.year")} required>
                <Input
                  type="number"
                  min="1900"
                  value={draft.year ?? ""}
                  onChange={(e) => set("year", numeric(e.target.value))}
                  {...field("year")}
                />
                {message("year")}
              </Field>
            </div>
          )}
          {active === "basics" && draft.category === "CAR" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("form.make")} required>
                <Input
                  value={draft.make}
                  onChange={(e) => {
                    set("make", e.target.value);
                    set("model", "");
                  }}
                  {...field("make")}
                />
                {message("make")}
              </Field>
              <Field label={t("form.model")} required>
                <Input
                  value={draft.model}
                  onChange={(e) => set("model", e.target.value)}
                  {...field("model")}
                />
                {message("model")}
              </Field>
              <Field label={t("form.year")}>
                <Input
                  type="number"
                  min="1900"
                  value={draft.year ?? ""}
                  onChange={(e) => set("year", numeric(e.target.value))}
                  {...field("year")}
                />
                {message("year")}
              </Field>
              <Field label={t("listing.field.trim")}>
                <Input value={draft.trim} onChange={(e) => set("trim", e.target.value)} />
              </Field>
              <Field label={t("vehicle.bodyType")}>
                <Input value={draft.bodyType} onChange={(e) => set("bodyType", e.target.value)} />
              </Field>
            </div>
          )}
          {active === "specifications" && draft.category !== "CAR" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <CategoryFields
                fields={categoryFormFields[draft.category].specifications}
                draft={draft}
                setSpec={setSpec}
                errors={errors}
              />
            </div>
          )}
          {active === "specifications" && draft.category === "CAR" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("listing.field.mileage")}>
                <Input
                  type="number"
                  min="0"
                  value={draft.mileage ?? ""}
                  onChange={(e) => set("mileage", numeric(e.target.value))}
                  {...field("mileage")}
                />
                {message("mileage")}
              </Field>
              <SelectField
                label={t("vehicle.transmission")}
                value={draft.transmission}
                onChange={(v) => set("transmission", v as ManagedListing["transmission"])}
                options={["automatic", "manual"]}
              />
              <SelectField
                label={t("vehicle.fuel")}
                value={draft.fuelType}
                onChange={(v) => set("fuelType", v as ManagedListing["fuelType"])}
                options={["gasoline", "diesel", "hybrid", "electric"]}
              />
              <Field label={t("listing.field.color")}>
                <Input
                  value={draft.exteriorColor}
                  onChange={(e) => set("exteriorColor", e.target.value)}
                />
              </Field>
              <Field label={t("listing.field.horsepower")}>
                <Input
                  type="number"
                  min="1"
                  value={draft.horsepower ?? ""}
                  onChange={(e) => set("horsepower", numeric(e.target.value))}
                />
              </Field>
            </div>
          )}
          {active === "history" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label={t("vehicle.condition")}
                value={draft.condition}
                onChange={(v) => set("condition", v as ManagedListing["condition"])}
                options={["new", "used"]}
              />
              {draft.category === "CAR" && (
                <>
                  <SelectField
                    label={t("listing.field.accident")}
                    value={draft.accidentHistory}
                    onChange={(v) => set("accidentHistory", v as ManagedListing["accidentHistory"])}
                    options={["none", "declared", "unknown"]}
                  />
                  <SelectField
                    label={t("listing.field.import")}
                    value={draft.importStatus}
                    onChange={(v) => set("importStatus", v as ManagedListing["importStatus"])}
                    options={["local", "imported", "unknown"]}
                  />
                  <Field label={t("vehicle.vin")}>
                    <Input
                      value={draft.vin ?? ""}
                      maxLength={17}
                      onChange={(e) => set("vin", e.target.value || undefined)}
                      {...field("vin")}
                    />
                    {message("vin")}
                  </Field>
                </>
              )}
            </div>
          )}
          {active === "commercial" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("listing.field.price")} required>
                <Input
                  type="number"
                  min="1"
                  value={draft.price ?? ""}
                  onChange={(e) => set("price", numeric(e.target.value))}
                  {...field("price")}
                />
                {message("price")}
              </Field>
              <SelectField
                label={t("listing.field.currency")}
                value={draft.currency}
                onChange={(v) => set("currency", v as "EGP" | "USD")}
                options={["EGP", "USD"]}
              />
              <Field label={t("vehicle.location")} required>
                <Input
                  value={draft.location}
                  onChange={(e) => set("location", e.target.value)}
                  {...field("location")}
                />
                {message("location")}
              </Field>
            </div>
          )}
          {active === "photos" && (
            <Photos
              draft={draft}
              setImages={(images) => set("images", images)}
              message={message("images")}
            />
          )}
          {active === "declarations" && (
            <div className="space-y-5">
              <Field label={t("listing.field.description")} required>
                <Textarea
                  rows={7}
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  {...field("description")}
                />
                {message("description")}
              </Field>
              {(
                [
                  "informationAccuracyAccepted",
                  "ownershipOrAuthorizationAccepted",
                  "termsAccepted",
                  "externalTransactionRiskAcknowledged",
                ] as const
              ).map((name) => (
                <label key={name} className="flex items-start gap-3">
                  <Checkbox
                    checked={draft.declarations[name]}
                    onCheckedChange={(checked) =>
                      set("declarations", { ...draft.declarations, [name]: checked === true })
                    }
                  />
                  <span>{t(`listing.declaration.${name}`)}</span>
                </label>
              ))}
              {message("declarations")}
            </div>
          )}
          {active === "review" && (
            <div className="space-y-4">
              <p className="rounded-lg bg-secondary p-4">{t("listing.preview.private")}</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">{t("form.make")}</dt>
                  <dd className="font-bold">{listingTitle(draft)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("listing.field.price")}</dt>
                  <dd className="font-bold">
                    {draft.price ?? "—"} {draft.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("listing.status")}</dt>
                  <dd>{t(`listing.status.${draft.status}`)}</dd>
                </div>
              </dl>
              <Button type="button" onClick={() => void publish()} disabled={data.isActing}>
                {t("listing.publish")}
              </Button>
            </div>
          )}
        </section>
        <footer className="mt-5 flex justify-between">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            {t("pagination.previous")}
          </Button>
          {step < steps.length - 1 && <Button onClick={next}>{t("pagination.next")}</Button>}
        </footer>
      </main>
    </AuthBoundary>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </Label>
      {children}
    </div>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3"
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}
function CategoryFields({
  fields,
  draft,
  setSpec,
  errors,
}: {
  fields: readonly CategoryField[];
  draft: ManagedListing;
  setSpec: (name: string, value: string | number | undefined) => void;
  errors: Record<string, string>;
}) {
  const { t } = useI18n();
  return fields.map((field) => {
    const value = Reflect.get(draft.specs, field.name) as string | number | undefined;
    const id = `listing-spec-${field.name}`;
    const errorId = `${id}-error`;
    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={id}>
          {t(field.labelKey)}
          {field.required && <span aria-hidden="true"> *</span>}
        </Label>
        {field.kind === "select" ? (
          <select
            id={id}
            value={value ?? ""}
            onChange={(event) => setSpec(field.name, event.target.value)}
            aria-invalid={Boolean(errors[field.name])}
            aria-describedby={errors[field.name] ? errorId : undefined}
            className="h-10 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t("discovery.all")}</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {t(`${field.name}.${option}`)}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id={id}
            type={field.kind}
            min={field.kind === "number" ? 0 : undefined}
            value={value ?? ""}
            onChange={(event) =>
              setSpec(
                field.name,
                field.kind === "number" ? numeric(event.target.value) : event.target.value,
              )
            }
            aria-invalid={Boolean(errors[field.name])}
            aria-describedby={errors[field.name] ? errorId : undefined}
          />
        )}
        {errors[field.name] && (
          <p id={errorId} className="text-sm text-destructive">
            {t(`listing.validation.${errors[field.name]}`)}
          </p>
        )}
      </div>
    );
  });
}
function Photos({
  draft,
  setImages,
  message,
}: {
  draft: ManagedListing;
  setImages: (images: ListingImage[]) => void;
  message: React.ReactNode;
}) {
  const { t } = useI18n();
  const add = (files: FileList | null) => {
    if (!files) return;
    try {
      setImages(
        [...draft.images, ...managedListingsService.temporaryImages([...files])]
          .slice(0, 12)
          .map((image, order) => ({
            ...image,
            order,
            isCover: draft.images.length ? image.isCover : order === 0,
          })),
      );
    } catch {
      toast.error(t("listing.image.invalid"));
    }
  };
  const remove = (id: string) => {
    const target = draft.images.find((image) => image.id === id);
    if (target) managedListingsService.revokeImage(target);
    const next = draft.images
      .filter((image) => image.id !== id)
      .map((image, order) => ({ ...image, order }));
    if (next.length && !next.some((image) => image.isCover))
      next[0] = { ...next[0], isCover: true };
    setImages(next);
  };
  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= draft.images.length) return;
    const next = [...draft.images];
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next.map((image, order) => ({ ...image, order })));
  };
  return (
    <div>
      <Label htmlFor="listing-images">{t("listing.image.select")}</Label>
      <Input
        id="listing-images"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => add(e.target.files)}
      />
      <p className="mt-2 text-sm text-muted-foreground">{t("listing.image.temporary")}</p>
      {!draft.images.some((image) => !image.temporary) && (
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() =>
            setImages([
              ...draft.images.map((image) => ({ ...image, isCover: false })),
              { ...managedListingsService.demoImage(), order: draft.images.length },
            ])
          }
        >
          {t("listing.image.useDemo")}
        </Button>
      )}
      {message}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {draft.images.map((image, index) => (
          <figure key={image.id} className="rounded-lg border p-3">
            <div className="relative aspect-video overflow-hidden rounded">
              <Image
                src={image.url}
                alt={image.name}
                fill
                unoptimized={image.temporary}
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 truncate text-sm">
              {image.name}
              {image.isCover ? ` · ${t("listing.image.cover")}` : ""}
            </figcaption>
            <div className="mt-2 flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setImages(
                    draft.images.map((item) => ({ ...item, isCover: item.id === image.id })),
                  )
                }
              >
                {t("listing.image.makeCover")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label={t("listing.image.up")}
                onClick={() => move(index, -1)}
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label={t("listing.image.down")}
                onClick={() => move(index, 1)}
              >
                ↓
              </Button>
              <Button size="sm" variant="destructive" onClick={() => remove(image.id)}>
                {t("listing.delete")}
              </Button>
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
