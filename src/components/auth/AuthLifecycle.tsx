"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { authService } from "@/services/auth.service";
import { scheduleSessionExpiry } from "@/lib/auth-lifecycle";

export function AuthLifecycle() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.auth.session, queryFn: authService.session });
  useEffect(
    () =>
      authService.subscribe(
        () => void client.invalidateQueries({ queryKey: queryKeys.auth.session }),
      ),
    [client],
  );
  useEffect(() => {
    if (!query.data) return;
    const expire = async () => {
      try {
        await authService.logout();
        client.setQueryData(queryKeys.auth.session, null);
      } catch {
        await client.invalidateQueries({ queryKey: queryKeys.auth.session });
      }
    };
    const cancelExpiry = scheduleSessionExpiry(query.data.expiresAt, () => void expire());
    const revalidate = () => {
      if (document.visibilityState === "visible")
        void client.invalidateQueries({ queryKey: queryKeys.auth.session });
    };
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      cancelExpiry();
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [client, query.data]);
  return null;
}
