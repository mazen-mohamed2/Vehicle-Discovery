"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTrustSafety } from "@/hooks/use-trust-safety";
import { useI18n } from "@/lib/i18n";
import { TrustSafetyError, type ReportReason, type ReportTargetType } from "@/lib/trust-safety";

const reasons: ReportReason[] = [
  "SCAM_OR_FRAUD",
  "MISLEADING_INFORMATION",
  "HARASSMENT",
  "SPAM",
  "SUSPICIOUS_IDENTITY",
  "INAPPROPRIATE_CONTENT",
  "OTHER",
];

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
}) {
  const { t } = useI18n();
  const safety = useTrustSafety();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) {
      setError(t("safety.report.reasonRequired"));
      return;
    }
    try {
      await safety.submitReport({ targetType, targetId, reason, description });
      toast.success(t("safety.report.success"));
      setReason("");
      setDescription("");
      setError("");
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof TrustSafetyError && caught.code === "DUPLICATE_ACTIVE_REPORT"
          ? t("safety.report.duplicate")
          : t("safety.error"),
      );
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("safety.report.title")}</DialogTitle>
          <DialogDescription>{t("safety.report.description")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="report-reason">{t("safety.report.reason")}</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as ReportReason)}>
              <SelectTrigger id="report-reason" aria-invalid={Boolean(error && !reason)}>
                <SelectValue placeholder={t("safety.report.selectReason")} />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`safety.report.reason.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-description">{t("safety.report.optional")}</Label>
            <Textarea
              id="report-description"
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button disabled={safety.isPending}>{t("safety.report.submit")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
