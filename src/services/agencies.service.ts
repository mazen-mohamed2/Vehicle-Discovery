import type { Agency } from "@/lib/types";
import { mockAgencies } from "./mock-data";

const delay = <T>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(v), ms));

export const agenciesService = {
  list: (): Promise<Agency[]> => delay(mockAgencies),
  byId: (id: string): Promise<Agency | undefined> => delay(mockAgencies.find((a) => a.id === id)),
  verified: (): Promise<Agency[]> => delay(mockAgencies.filter((a) => a.verified)),
};
