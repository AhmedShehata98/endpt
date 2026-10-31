import type { Page, Request } from "@playwright/test";

export const E2E_API_ORIGIN = "https://e2e.endpt.test";
export const E2E_ECHO_URL = `${E2E_API_ORIGIN}/echo`;

type Captured = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
};

/**
 * Intercepts requests to the E2E mock host and returns a JSON echo.
 * Includes CORS headers so FetchHttpClient succeeds in the browser.
 */
export async function mockE2eApi(page: Page): Promise<{ captured: () => Captured[] }> {
  const captured: Captured[] = [];

  await page.route(`${E2E_API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: corsHeaders(),
      });
      return;
    }

    captured.push(capture(request));
    const payload = {
      ok: true,
      echoMethod: request.method(),
      echoPath: new URL(request.url()).pathname,
      body: '{"hello":"endpt"}',
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders(),
      body: JSON.stringify(payload),
    });
  });

  return { captured: () => captured };
}

function capture(request: Request): Captured {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.headers())) {
    headers[key.toLowerCase()] = value;
  }
  return {
    method: request.method(),
    url: request.url(),
    headers,
    body: request.postData(),
  };
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
    "Access-Control-Allow-Headers": "*",
  };
}
