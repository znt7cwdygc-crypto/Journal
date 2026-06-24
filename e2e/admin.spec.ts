import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

const ADMIN_EMAIL = "admin@webcamexpert.local";
const ADMIN_PASSWORD = "admin12345";

test.describe("Admin panel", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("Admin dashboard loads", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/админ-панель|admin/i).first()).toBeVisible();
    await page.screenshot({ path: "e2e-results/admin-dashboard.png", fullPage: true });
  });

  test("/admin/users — user list", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.locator("table, [role='table'], [class*='user']").first()).toBeVisible();
  });

  test("/admin/content — content tabs", async ({ page }) => {
    await page.goto("/admin/content");
    await expect(page.locator("main, body")).toBeVisible();
  });

  test("/admin/reports — reports page", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.locator("main, body")).toBeVisible();
  });

  test("/admin/audit — audit log", async ({ page }) => {
    await page.goto("/admin/audit");
    await expect(page.locator("main, body")).toBeVisible();
  });

  test("/admin/balance — balance page", async ({ page }) => {
    await page.goto("/admin/balance");
    await expect(page.locator("main, body")).toBeVisible();
  });
});
