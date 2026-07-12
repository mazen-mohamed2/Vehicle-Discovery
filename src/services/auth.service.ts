import type { AppUser } from "@/lib/types";

// Stub — real auth will hit backend / Lovable Cloud.
export const authService = {
  currentUser: async (): Promise<AppUser | null> => null,
  login: async (_email: string, _password: string): Promise<AppUser> => {
    throw new Error("Auth backend not connected yet");
  },
  register: async (_data: { name: string; email: string; password: string }): Promise<AppUser> => {
    throw new Error("Auth backend not connected yet");
  },
  logout: async (): Promise<void> => {},
};
