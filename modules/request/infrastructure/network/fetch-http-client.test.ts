/// <reference types="node" />
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PreparedRequest } from "../../ports/http-client.interface";
import { FetchHttpClient } from "./fetch-http-client";

describe("FetchHttpClient", () => {
  let server: Server;
  let baseUrl = "";

  beforeAll(async () => {
    server = createServer((request, response) => {
      if (request.url === "/drop") {
        request.socket.destroy();
        return;
      }
      if (request.url === "/missing") {
        response.writeHead(404, { "content-type": "text/plain" });
        response.end("missing");
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"ok":true}');
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server has no port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const client = new FetchHttpClient();

  it("returns an HTTP response for 200", async () => {
    const result = await client.send(get(`${baseUrl}/ok`));
    expect(result).toMatchObject({
      kind: "response",
      status: 200,
      body: '{"ok":true}',
      contentType: "application/json",
    });
  });

  it("returns an HTTP response for 404", async () => {
    const result = await client.send(get(`${baseUrl}/missing`));
    expect(result).toMatchObject({
      kind: "response",
      status: 404,
      body: "missing",
    });
  });

  it("returns a transport error when the connection drops", async () => {
    const result = await client.send(get(`${baseUrl}/drop`));
    expect(result.kind).toBe("transport-error");
  });
});

function get(url: string): PreparedRequest {
  return { method: "GET", url, headers: [], body: null };
}
