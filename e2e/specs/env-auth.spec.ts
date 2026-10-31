import { expect, test } from "@playwright/test";
import { goToNav, openApp } from "../helpers/app";
import { E2E_API_ORIGIN, E2E_ECHO_URL, mockE2eApi } from "../helpers/mock-api";

test.describe("env vars and auth", () => {
  test("placeholder resolution and each auth method", async ({ page }) => {
    const api = await mockE2eApi(page);
    await openApp(page);

    await goToNav(page, "Environment");

    async function addVariable(role: RegExp, key: string, value: string) {
      await page.getByRole("button", { name: "Add variable" }).click();
      await page.getByRole("button", { name: role }).click();
      await page.getByLabel(`${key} value`).fill(value);
    }

    await addVariable(/Base URL/i, "baseUrl", E2E_API_ORIGIN);
    await addVariable(/Auth token/i, "authToken", "tok-env-1");
    await addVariable(/API key/i, "apiKey", "key-env-1");
    await addVariable(/Username/i, "username", "demo-user");
    await addVariable(/Password password/i, "password", "demo-pass");

    await goToNav(page, "Workspace");
    await page.getByLabel("Request URL").fill("{{baseUrl}}/echo");

    await page.getByRole("tab", { name: "Auth" }).click();
    await page.getByLabel("Enable authentication").check();
    await page.getByLabel("Auth type").selectOption("bearerToken");
    await page.getByLabel("Token").fill("{{authToken}}");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Success")).toBeVisible();
    expect(api.captured().at(-1)?.headers.authorization).toBe("Bearer tok-env-1");

    await page.getByLabel("Auth type").selectOption("apiKey");
    await page.getByLabel("API key header").fill("X-API-Key");
    await page.getByLabel("API key", { exact: true }).fill("{{apiKey}}");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Success")).toBeVisible();
    expect(api.captured().at(-1)?.headers["x-api-key"]).toBe("key-env-1");

    await page.getByLabel("Auth type").selectOption("basic");
    await page.getByLabel("Username").fill("{{username}}");
    await page.getByLabel("Password").fill("{{password}}");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Success")).toBeVisible();
    const expected = `Basic ${Buffer.from("demo-user:demo-pass").toString("base64")}`;
    expect(api.captured().at(-1)?.headers.authorization).toBe(expected);

    await page.getByLabel("Enable authentication").uncheck();
    await page.getByLabel("Request URL").fill(E2E_ECHO_URL);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Success")).toBeVisible();
    expect(api.captured().at(-1)?.headers.authorization).toBeUndefined();
    expect(api.captured().at(-1)?.headers["x-api-key"]).toBeUndefined();
  });
});
