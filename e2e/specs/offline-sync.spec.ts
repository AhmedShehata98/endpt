import { expect, test } from "@playwright/test";
import { goToNav, openApp, signUp } from "../helpers/app";

test.describe("offline then sync", () => {
  test("create offline → enable sync → Synced without losing local data", async ({
    page,
  }) => {
    await openApp(page);

    await signUp(page, {
      email: "syncer@example.com",
      password: "password123",
      displayName: "Syncer",
    });

    await expect(page.getByRole("status")).toContainText("Local only");

    await goToNav(page, "Environment");
    await page.getByRole("button", { name: "Add variable" }).click();
    await page.getByRole("button", { name: /Base URL/i }).click();
    await page.getByLabel("baseUrl value").fill("https://offline.example");

    await goToNav(page, "Collections");
    await page.getByRole("button", { name: "New project" }).first().click();
    const nameDialog = page.getByRole("dialog");
    await expect(nameDialog.getByText("New project")).toBeVisible();
    await nameDialog.locator("input").first().fill("Offline Project");
    await nameDialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Offline Project")).toBeVisible();

    await goToNav(page, "Settings");
    await page.getByLabel("Enable cloud sync").check();

    const linkDialog = page.getByRole("dialog");
    await expect(linkDialog.getByText("Link cloud account")).toBeVisible({
      timeout: 15_000,
    });
    await linkDialog.getByLabel("Account password").fill("password123");
    await linkDialog.getByRole("button", { name: "Link and sync" }).click();

    await expect(page.getByRole("status")).toContainText("Synced", { timeout: 15_000 });
    await expect(page.getByText(/Last synced:/)).not.toContainText("Never");

    await goToNav(page, "Environment");
    await expect(page.getByLabel("baseUrl value")).toHaveValue("https://offline.example");

    await goToNav(page, "Collections");
    await expect(page.getByText("Offline Project")).toBeVisible();
  });
});
