import { expect, type Page } from "@playwright/test";

export async function openApp(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByLabel("Request URL")).toBeVisible();
  await expect(page.getByText("Loading local data…")).toHaveCount(0);
}

export async function goToNav(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: label, exact: true }).click();
}

export async function signUp(
  page: Page,
  input: { email: string; password: string; displayName: string },
): Promise<void> {
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Display name").fill(input.displayName);
  await page.getByLabel(/Email/).fill(input.email);
  await page.getByLabel("Password").fill(input.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByLabel("Request URL")).toBeVisible();
  await expect(page.getByText(input.displayName)).toBeVisible();
}
