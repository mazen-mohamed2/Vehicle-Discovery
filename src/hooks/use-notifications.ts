"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { communicationActor } from "@/lib/communication";
import { queryKeys } from "@/lib/query-keys";
import { authStorageScope } from "@/lib/storage-scope";
import { notificationsService } from "@/services/notifications.service";

export function useNotifications() {
  const auth = useAuth();
  const client = useQueryClient();
  const scope = authStorageScope(auth.user);
  const actor = useMemo(() => (auth.user ? communicationActor(auth.user) : null), [auth.user]);
  const invalidate = useCallback(
    async () => client.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    [client],
  );
  useEffect(() => notificationsService.subscribe(() => void invalidate()), [invalidate]);
  const list = useQuery({
    queryKey: queryKeys.notifications.list(scope),
    queryFn: () => notificationsService.list(actor!),
    enabled: Boolean(actor),
  });
  const unread = useQuery({
    queryKey: queryKeys.notifications.unread(scope),
    queryFn: () => notificationsService.unreadCount(actor!),
    enabled: Boolean(actor),
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => notificationsService.markRead(actor!, id),
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: async () => notificationsService.markAllRead(actor!),
    onSuccess: invalidate,
  });
  return {
    actor,
    notifications: list.data ?? [],
    unreadCount: unread.data ?? 0,
    isHydrating: auth.isHydrating || list.isPending || unread.isPending,
    isError: list.isError || unread.isError,
    isPending: markRead.isPending || markAllRead.isPending,
    markRead: markRead.mutateAsync,
    markAllRead: markAllRead.mutateAsync,
  };
}
