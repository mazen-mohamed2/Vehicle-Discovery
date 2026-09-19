"use client";
import { useEffect, useRef, useState } from "react";
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
import { validateListing, validateListingStep } from "@/lib/listing-validators";
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
    setErrors((current) => {
      if (Object.keys(current).length === 0) return current;
      const currentValidation = validateListing(draft, true);
      const next = Object.fromEntries(
        Object.keys(current).flatMap((name) =>
          currentValidation[name] ? [[name, currentValidation[name]]] : [],
        ),
      );
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [draft]);
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
  const set = <K extends keyof ManagedListing>(key: K, value: ManagedListing[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };
  const setSpec = (name: string, value: string | number | undefined) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            specs: { ...current.specs, [name]: value },
            ...(current.category === "CAR" ? { [name]: value } : {}),
          }
        : current,
    );
  };
  const revealErrors = (currentErrors: Record<string, string>) => {
    setErrors(currentErrors);
    window.requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      (first ?? document.getElementById("listing-errors"))?.focus();
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };
  const navigateTo = (target: number) => {
    if (target <= step) {
      setErrors({});
      setStep(target);
      set("currentStep", steps[target]);
      return;
    }
    for (let index = step; index < target; index += 1) {
      const currentErrors = validateListingStep(draft, steps[index]);
      if (Object.keys(currentErrors).length) {
        setStep(index);
        set("currentStep", steps[index]);
        revealErrors(currentErrors);
        return;
      }
    }
    setErrors({});
    setStep(target);
    set("currentStep", steps[target]);
  };
  const next = () => navigateTo(Math.min(steps.length - 1, step + 1));
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
      const firstStepWithError = steps.findIndex((item) =>
        Object.keys(validateListingStep(draft, item)).some((name) => fields[name]),
      );
      if (firstStepWithError >= 0) setStep(firstStepWithError);
      revealErrors(fields);
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
                onClick={() => navigateTo(index)}
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
              <Field label={t("form.year")} htmlFor="listing-year" required>
                <Input
                  id="listing-year"
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
              <Field label={t("form.make")} htmlFor="listing-make" required>
                <Input
                  id="listing-make"
                  value={draft.make}
                  onChange={(e) => {
                    setSpec("make", e.target.value);
                    setSpec("model", "");
                  }}
                  {...field("make")}
                />
                {message("make")}
              </Field>
              <Field label={t("form.model")} htmlFor="listing-model" required>
                <Input
                  id="listing-model"
                  value={draft.model}
                  onChange={(e) => setSpec("model", e.target.value)}
                  {...field("model")}
                />
                {message("model")}
              </Field>
              <Field label={t("form.year")} htmlFor="listing-year" required>
                <Input
                  id="listing-year"
                  type="number"
                  min="1900"
                  value={draft.year ?? ""}
                  onChange={(e) => set("year", numeric(e.target.value))}
                  {...field("year")}
                />
                {message("year")}
              </Field>
              <Field label={t("listing.field.trim")} htmlFor="listing-trim">
                <Input
                  id="listing-trim"
                  value={draft.trim}
                  onChange={(e) => setSpec("trim", e.target.value)}
                />
              </Field>
              <Field label={t("vehicle.bodyType")} htmlFor="listing-bodyType">
                <Input
                  id="listing-bodyType"
                  value={draft.bodyType}
                  onChange={(e) => setSpec("bodyType", e.target.value)}
                />
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
              <Field label={t("listing.field.mileage")} htmlFor="listing-mileage" required>
                <Input
                  id="listing-mileage"
                  type="number"
                  min="0"
                  value={draft.mileage ?? ""}
                  onChange={(e) => setSpec("mileage", numeric(e.target.value))}
                  {...field("mileage")}
                />
                {message("mileage")}
              </Field>
              <SelectField
                label={t("vehicle.transmission")}
                value={draft.transmission}
                onChange={(v) => setSpec("transmission", v)}
                options={["automatic", "manual"]}
                name="transmission"
                error={errors.transmission}
              />
              <SelectField
                label={t("vehicle.fuel")}
                value={draft.fuelType}
                onChange={(v) => setSpec("fuelType", v)}
                options={["gasoline", "diesel", "hybrid", "electric"]}
                name="fuelType"
                error={errors.fuelType}
              />
              <Field label={t("listing.field.color")} htmlFor="listing-exteriorColor">
                <Input
                  id="listing-exteriorColor"
                  value={draft.exteriorColor}
                  onChange={(e) => setSpec("exteriorColor", e.target.value)}
                />
              </Field>
              <Field label={t("listing.field.horsepower")} htmlFor="listing-horsepower">
                <Input
                  id="listing-horsepower"
                  type="number"
                  min="1"
                  value={draft.horsepower ?? ""}
                  onChange={(e) => setSpec("horsepower", numeric(e.target.value))}
                  {...field("horsepower")}
                />
                {message("horsepower")}
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
                    onChange={(v) => setSpec("accidentHistory", v)}
                    options={["none", "declared", "unknown"]}
                  />
                  <SelectField
                    label={t("listing.field.import")}
                    value={draft.importStatus}
                    onChange={(v) => setSpec("importStatus", v)}
                    options={["local", "imported", "unknown"]}
                  />
                  <Field label={t("vehicle.vin")} htmlFor="listing-vin">
                    <Input
                      id="listing-vin"
                      value={draft.vin ?? ""}
                      maxLength={17}
                      onChange={(e) => setSpec("vin", e.target.value || undefined)}
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
              <Field label={t("listing.field.price")} htmlFor="listing-price" required>
                <Input
                  id="listing-price"
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
              <Field label={t("vehicle.location")} htmlFor="listing-location" required>
                <Input
                  id="listing-location"
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
              <Field label={t("listing.field.description")} htmlFor="listing-description" required>
                <Textarea
                  id="listing-description"
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
            onClick={() => navigateTo(Math.max(0, step - 1))}
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
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
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
  name,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  name?: string;
  error?: string;
}) {
  const { t } = useI18n();
  const id = name ? `listing-${name}` : undefined;
  const errorId = error && name ? `${name}-error` : undefined;
  return (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className="h-10 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {errorId && (
        <p id={errorId} className="text-sm text-destructive">
          {t(`listing.validation.${error}`)}
        </p>
      )}
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
                {t(`${field.name === "fuelType" ? "fuel" : field.name}.${option}`)}
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
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-primary/50 bg-primary/5 p-4 sm:p-5">
        <Label htmlFor="listing-images" className="font-bold">
          {t("listing.image.select")}
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">{t("listing.image.guidance")}</p>
        <Input
          id="listing-images"
          className="mt-3 min-h-11 cursor-pointer"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => add(e.target.files)}
        />
        <p className="mt-2 text-sm text-muted-foreground">{t("listing.image.temporary")}</p>
      </div>
      <p className="text-sm font-semibold" role="status">
        {t("listing.image.count").replace("{count}", String(draft.images.length))}
      </p>
      {draft.images.length === 0 && (
        <div className="rounded-xl bg-secondary p-5 text-center text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">{t("listing.image.emptyTitle")}</p>
          <p className="mt-1">{t("listing.image.emptyDescription")}</p>
        </div>
      )}
      {!draft.images.some((image) => !image.temporary) && (
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                type="button"
                size="sm"
                variant="outline"
                className="min-h-10 flex-1"
                onClick={() =>
                  setImages(
                    draft.images.map((item) => ({ ...item, isCover: item.id === image.id })),
                  )
                }
              >
                {t("listing.image.makeCover")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-10 min-w-10"
                aria-label={t("listing.image.up")}
                onClick={() => move(index, -1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-10 min-w-10"
                aria-label={t("listing.image.down")}
                onClick={() => move(index, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="min-h-10"
                onClick={() => remove(image.id)}
              >
                {t("listing.delete")}
              </Button>
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
