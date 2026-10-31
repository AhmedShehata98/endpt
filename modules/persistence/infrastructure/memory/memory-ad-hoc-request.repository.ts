import type { AdHocRequest } from "@modules/request";
import type { AdHocRequestRepository } from "@modules/request/ports/ad-hoc-request.repository";

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
    for (const [id, existing] of this.byId) {
      if (id !== request.id && sameUser(existing.userId, request.userId)) {
        this.byId.delete(id);
      }
    }
    this.byId.set(request.id, structuredClone(request));
    return structuredClone(request);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
