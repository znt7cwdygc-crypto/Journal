import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

const ADMIN_EMAIL = "admin@webcamexpert.local";
const ADMIN_PASSWORD = "WEJ-kAVZUTVEaBJmATri";

test.describe("Admin panel", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("Admin dashboard loads", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await page.screenshot({ path: "e2e-results/admin-dashboard.png", fullPage: true });
  });

  test("/admin/users — user list", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveTitle(/.+/);
  });

  test("/admin/content — content tabs", async ({ page }) => {
    await page.goto("/admin/content");
    await expect(page).toHaveTitle(/.+/);
  });

  test("/admin/reports — reports page", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page).toHaveTitle(/.+/);
  });

  test("/admin/audit — audit log", async ({ page }) => {
    await page.goto("/admin/audit");
    await expect(page).toHaveTitle(/.+/);
  });

  test("/admin/balance — balance page", async ({ page }) => {
    await page.goto("/admin/balance");
    await expect(page).toHaveTitle(/.+/);
  });
});
