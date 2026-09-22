"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useHydrationReady } from "@/hooks/use-hydration-ready";
import { queryKeys } from "@/lib/query-keys";
import {
  safeReturnPath,
  type LoginCredentials,
  type RegistrationPayload,
  type UserRole,
} from "@/lib/auth";
import { authService } from "@/services/auth.service";

export function useAuth() {
  const client = useQueryClient();
  const router = useRouter();
  const hydrationReady = useHydrationReady();
  const query = useQuery({ queryKey: queryKeys.auth.session, queryFn: authService.session });
  const sync = async () => {
    await client.invalidateQueries({ queryKey: queryKeys.auth.session });
  };
  const loginMutation = useMutation({
    mutationFn: (value: LoginCredentials) => authService.login(value),
    onSuccess: sync,
  });
  const registrationMutation = useMutation({
    mutationFn: (value: RegistrationPayload) => authService.register(value),
    onSuccess: sync,
  });
  const googleMutation = useMutation({
    mutationFn: () => authService.loginWithGoogleMock(),
    onSuccess: sync,
  });
  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      client.removeQueries({
        predicate: (item) =>
          [
            "communication",
            "notifications",
            "import-workflow",
            "managed-listings",
            "favorites",
            "compare",
            "trust-safety",
            "transactions",
          ].includes(String(item.queryKey[0])),
      });
      client.setQueryData(queryKeys.auth.session, null);
    },
  });
  const session = query.data ?? null;
  const user = session?.user ?? null;
  const isHydrating = !hydrationReady || query.isPending;
  return {
    user,
    session,
    role: user?.role ?? null,
    isAuthenticated: !isHydrating && Boolean(user),
    isGuest: !isHydrating && !user,
    isHydrating,
    login: loginMutation.mutateAsync,
    registerIndividual: registrationMutation.mutateAsync,
    registerDealer: registrationMutation.mutateAsync,
    loginWithGoogleMock: googleMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    forgotPassword: authService.forgotPassword,
    resetPassword: authService.resetPassword,
    hasRole: (role: UserRole) => user?.role === role,
    requireAuth(returnPath: string, authenticated: () => void) {
      if (user) authenticated();
      else
        router.push(
          `/auth/login?returnTo=${encodeURIComponent(safeReturnPath(returnPath) ?? "/")}`,
        );
    },
    isPending:
      loginMutation.isPending ||
      registrationMutation.isPending ||
      googleMutation.isPending ||
      logoutMutation.isPending,
  };
}
