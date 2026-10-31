import type {
  HttpClient,
  PreparedRequest,
  TransportResult,
} from "../../ports/http-client.interface";
import { sendWithFetch } from "./send-with-fetch";

export class TauriHttpClient implements HttpClient {
  async send(request: PreparedRequest, options?: { timeoutMs?: number }): Promise<TransportResult> {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    return sendWithFetch(tauriFetch, request, options);
  }
}
