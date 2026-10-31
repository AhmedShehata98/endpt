import type { AdHocRequest } from "@modules/request";
import type { AdHocRequestRepository } from "@modules/request/ports/ad-hoc-request.repository";

const GUEST_DRAFT_ID = "ad-hoc-guest";

function sameUser(a: string | null, b: string | null): boolean {
  return a === b;
}

export class MemoryAdHocRequestRepository implements AdHocRequestRepository {
  private readonly byId = new Map<string, AdHocRequest>();

  async getByUserId(userId: string | null): Promise<AdHocRequest | null> {
    for (const request of this.byId.values()) {
      if (sameUser(request.userId, userId)) return structuredClone(request);
    }
    return null;
  }

  async save(request: AdHocRequest): Promise<AdHocRequest> {
    const normalized =
      request.userId == null ? { ...request, id: GUEST_DRAFT_ID } : request;
    for (const [id, existing] of this.byId) {
      if (id !== normalized.id && sameUser(existing.userId, normalized.userId)) {
        this.byId.delete(id);
      }
    }
    this.byId.set(normalized.id, structuredClone(normalized));
    return structuredClone(normalized);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
