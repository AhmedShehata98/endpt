import type { AdHocRequest, RequestDraft } from "@modules/request";
import type { AdHocRequestRepository } from "@modules/request/ports/ad-hoc-request.repository";
import type { SecretCipher } from "../../ports/secret-cipher.interface";
import { decryptDraft, encryptDraft } from "../secrets/draft-secrets";
import type { SqlDatabase } from "./database";

interface AdHocRow {
  id: string;
  user_id: string | null;
  draft_json: string;
  updated_at: string;
}

export class SqliteAdHocRequestRepository implements AdHocRequestRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly cipher: SecretCipher,
  ) {}

  async getByUserId(userId: string | null): Promise<AdHocRequest | null> {
    const rows =
      userId == null
        ? await this.db.select<AdHocRow[]>(
            "SELECT id, user_id, draft_json, updated_at FROM ad_hoc_requests WHERE user_id IS NULL LIMIT 1",
          )
        : await this.db.select<AdHocRow[]>(
            "SELECT id, user_id, draft_json, updated_at FROM ad_hoc_requests WHERE user_id = $1 LIMIT 1",
            [userId],
          );

    const row = rows[0];
    if (!row) return null;
    return this.fromRow(row);
  }

  async save(request: AdHocRequest): Promise<AdHocRequest> {
    const encrypted = await encryptDraft(request.draft, this.cipher);
    const draftJson = JSON.stringify(encrypted);

    await this.db.execute(
      `INSERT INTO ad_hoc_requests (id, user_id, draft_json, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         draft_json = excluded.draft_json,
         updated_at = excluded.updated_at`,
      [request.id, request.userId, draftJson, request.updatedAt],
    );

    return request;
  }

  async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM ad_hoc_requests WHERE id = $1", [id]);
  }

  private async fromRow(row: AdHocRow): Promise<AdHocRequest> {
    const draft = JSON.parse(row.draft_json) as RequestDraft;
    return {
      id: row.id,
      userId: row.user_id,
      draft: await decryptDraft(draft, this.cipher),
      updatedAt: row.updated_at,
    };
  }
}
