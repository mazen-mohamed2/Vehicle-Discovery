import type { AgencyOffer, ImportRequest } from "@/lib/types";

const delay = <T>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(v), ms));

const requests: ImportRequest[] = [];
const offers: AgencyOffer[] = [];

export const importRequestsService = {
  list: (): Promise<ImportRequest[]> => delay(requests),
  create: (data: Omit<ImportRequest, "id" | "createdAt" | "status">): Promise<ImportRequest> => {
    const req: ImportRequest = {
      ...data,
      id: `ir_${Date.now()}`,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    requests.push(req);
    return delay(req);
  },
  offersFor: (requestId: string): Promise<AgencyOffer[]> =>
    delay(offers.filter((o) => o.requestId === requestId)),
};
