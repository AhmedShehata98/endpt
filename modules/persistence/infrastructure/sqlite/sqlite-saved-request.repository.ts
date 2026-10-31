import type { SavedRequest } from "@modules/request";
import type { SavedRequestRepository } from "@modules/request/ports/saved-request.repository";
import type { SecretCipher } from "../../ports/secret-cipher.interface";
import { decryptDraft, encryptDraft } from "../secrets/draft-secrets";
import type { SqlDatabase } from "./database";
import { parseStoredDraft } from "./parse-stored-draft";

interface SavedRow {
  id: string;
  collection_id: string;
  draft_json: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class SqliteSavedRequestRepository implements SavedRequestRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly cipher: SecretCipher,
  ) {}

  async listByCollectionId(collectionId: string): Promise<SavedRequest[]> {
    const rows = await this.db.select<SavedRow[]>(
      `SELECT id, collection_id, draft_json, sort_order, created_at, updated_at, deleted_at
       FROM saved_requests
       WHERE collection_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC`,
      [collectionId],
    );
    return Promise.all(rows.map((row) => this.fromRow(row)));
  }

  async getById(id: string): Promise<SavedRequest | null> {
    const rows = await this.db.select<SavedRow[]>(
      `SELECT id, collection_id, draft_json, sort_order, created_at, updated_at, deleted_at
       FROM saved_requests WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = rows[0];
    return row ? this.fromRow(row) : null;
  }

  async save(request: SavedRequest): Promise<SavedRequest> {
    const encrypted = await encryptDraft(request.draft, this.cipher);
    await this.db.execute(
      `INSERT INTO saved_requests
         (id, collection_id, draft_json, sort_order, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(id) DO UPDATE SET
         collection_id = excluded.collection_id,
         draft_json = excluded.draft_json,
         sort_order = excluded.sort_order,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
      [
        request.id,
        request.collectionId,
        JSON.stringify(encrypted),
        request.sortOrder,
        request.createdAt,
        request.updatedAt,
        request.deletedAt,
      ],
    );
    return request;
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.db.execute(
      "UPDATE saved_requests SET deleted_at = $1, updated_at = $1 WHERE id = $2",
      [deletedAt, id],
    );
  }

  private async fromRow(row: SavedRow): Promise<SavedRequest> {
    const draft = parseStoredDraft(row.draft_json);
    return {
      id: row.id,
      collectionId: row.collection_id,
      draft: await decryptDraft(draft, this.cipher),
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }
}
