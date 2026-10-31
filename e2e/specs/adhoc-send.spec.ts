import { expect, test } from "@playwright/test";
import { openApp } from "../helpers/app";
import { E2E_ECHO_URL, mockE2eApi } from "../helpers/mock-api";

test.describe("ad-hoc send", () => {
  test("send → response → copy → fullscreen → focus restore", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await mockE2eApi(page);
    await openApp(page);

    await page.getByLabel("Request URL").fill(E2E_ECHO_URL);
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("200")).toBeVisible();
    await expect(page.getByText("Success")).toBeVisible();
    await expect(page.getByText(/hello/)).toBeVisible();

    const fullscreen = page.getByRole("button", { name: "Open response fullscreen" });
    await page.getByRole("button", { name: "Copy response body" }).click();
    await expect(page.getByText("Copied")).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("hello");
    expect(clipboard).toContain("endpt");

    await fullscreen.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close fullscreen" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(fullscreen).toBeFocused();
  });
});
