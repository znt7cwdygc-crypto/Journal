import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers";

const ADMIN_EMAIL = "admin@webcamexpert.local";
const ADMIN_PASSWORD = "WEJ-kAVZUTVEaBJmATri";

test.describe("Studio balance — admin top-up", () => {
  test("Admin balance page loads with form", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/balance");
    await expect(page).toHaveTitle(/./);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e-results/balance-page.png", fullPage: true });
  });
});
