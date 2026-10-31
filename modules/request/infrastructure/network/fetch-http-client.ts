import type {
  HttpClient,
  PreparedRequest,
  TransportResult,
} from "../../ports/http-client.interface";
import { sendWithFetch } from "./send-with-fetch";

export class FetchHttpClient implements HttpClient {
  async send(request: PreparedRequest, options?: { timeoutMs?: number }): Promise<TransportResult> {
    return sendWithFetch(fetch, request, options);
  }
}
