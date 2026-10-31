import { expect, test } from "@playwright/test";
import { goToNav, openApp, signUp } from "../helpers/app";
import { E2E_ECHO_URL, mockE2eApi } from "../helpers/mock-api";

test.describe("save and reopen", () => {
  test("sign up → project → collection → save → reopen → resend", async ({ page }) => {
    await mockE2eApi(page);
    await openApp(page);

    await signUp(page, {
      email: "saver@example.com",
      password: "password123",
      displayName: "Saver",
    });

    await page.getByLabel("Request URL").fill(E2E_ECHO_URL);
    await page.getByLabel("HTTP method").selectOption("GET");
    await page.getByRole("button", { name: "Save Request" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Save request")).toBeVisible();
    await dialog.locator("input").first().fill("Echo GET");

    await dialog.getByRole("button", { name: "New project" }).click();
    await dialog.getByPlaceholder("Project name").fill("Demo Project");
    await dialog.getByRole("button", { name: "Add" }).click();

    await expect(dialog.getByPlaceholder("Collection name")).toBeVisible();
    await dialog.getByPlaceholder("Collection name").fill("Demo Collection");
    await dialog.getByRole("button", { name: "Add" }).click();

    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "New Request" }).click();
    await expect(page.getByLabel("Request URL")).toHaveValue("");

    await goToNav(page, "Collections");
    await page.getByRole("button", { name: /Demo Project/ }).click();
    await page.getByRole("button", { name: /Demo Collection/ }).click();
    await page.getByRole("button", { name: /Echo GET/ }).click();

    await expect(page.getByLabel("Request URL")).toHaveValue(E2E_ECHO_URL);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Success")).toBeVisible();
  });
});
