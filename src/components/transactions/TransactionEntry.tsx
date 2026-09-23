"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useTransactions } from "@/hooks/use-transactions";
import { useI18n } from "@/lib/i18n";
import {
  transactionBase,
  transactionErrorKey,
  transactionSourceKey,
  transactionProgressKey,
  type MarketplaceTransactionSource,
} from "@/lib/marketplace-transaction";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";
import { authStorageScope } from "@/lib/storage-scope";

export function TransactionEntry({
  source,
  canStart,
}: {
  source: MarketplaceTransactionSource;
  canStart: boolean;
}) {
  const workflow = useTransactions();
  const { t } = useI18n();
  const router = useRouter();
  const { auth, list, start } = workflow;
  if (auth.isHydrating || (auth.user && list.isPending))
    return (
      <p className="mt-4 text-sm" role="status">
        {t("a11y.loading")}
      </p>
    );
  if (!auth.user) return null;
  if (list.isError)
    return (
      <p className="mt-4 text-sm" role="alert">
        {t(transactionErrorKey(list.error))}
      </p>
    );
  const existing = list.data?.find(
    (record) => transactionSourceKey(record.source) === transactionSourceKey(source),
  );
  const base = transactionBase(auth.user.role);
  const begin = async () => {
    try {
      const record = await start.mutateAsync(source);
      const current = await authService.session();
      if (authStorageScope(current?.user) === workflow.scope) router.push(`${base}/${record.id}`);
    } catch {
      /* Localized mutation error below; never simulate financial success. */
    }
  };
  return (
    <div className="mt-4 space-y-2">
      <div>
        <Badge variant="outline" className="max-w-full whitespace-normal">
          {t("transactions.status")}: {t(transactionProgressKey(existing, canStart, source))}
        </Badge>
      </div>
      {existing ? (
        <Button asChild size="sm" variant="outline">
          <Link href={`${base}/${existing.id}`}>{t("transactions.view")}</Link>
        </Button>
      ) : canStart ? (
        <Button size="sm" disabled={start.isPending} onClick={() => void begin()}>
          {t(start.isPending ? "a11y.loading" : "transactions.start")}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(
            source.type === "IMPORT_OFFER"
              ? "transactions.waitingCustomer"
              : "transactions.waitingBuyer",
          )}
        </p>
      )}
      {start.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t(transactionErrorKey(start.error))}
        </p>
      )}
    </div>
  );
}
