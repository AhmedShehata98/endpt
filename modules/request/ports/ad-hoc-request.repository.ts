import type { AdHocRequest } from "../types/http.types";

export interface AdHocRequestRepository {
  getByUserId(userId: string | null): Promise<AdHocRequest | null>;
  save(request: AdHocRequest): Promise<AdHocRequest>;
  delete(id: string): Promise<void>;
}
