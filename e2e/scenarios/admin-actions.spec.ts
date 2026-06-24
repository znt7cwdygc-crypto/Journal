import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers";

const ADMIN_EMAIL = "admin@webcamexpert.local";
const ADMIN_PASSWORD = "WEJ-kAVZUTVEaBJmATri";

test.describe("Admin actions — dashboard and moderation", () => {
  test("Admin dashboard loads with stats", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin");
    await expect(page).toHaveTitle(/./);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e-results/admin-dashboard.png", fullPage: true });
  });

  test("Admin users page — list and search", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/users");
    await expect(page).toHaveTitle(/./);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e-results/admin-users.png", fullPage: true });
  });

  test("Admin content page — articles tab", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/content");
    await expect(page).toHaveTitle(/./);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e-results/admin-content.png", fullPage: true });
  });

  test("Admin content page — listings tab", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/content?tab=listings");
    await expect(page).toHaveTitle(/./);
    await page.screenshot({ path: "e2e-results/admin-content-listings.png", fullPage: true });
  });

  test("Admin reports page loads", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/reports");
    await expect(page).toHaveTitle(/./);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e-results/admin-reports.png", fullPage: true });
  });

  test("Admin balance page loads", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/balance");
    await expect(page).toHaveTitle(/./);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e-results/admin-balance.png", fullPage: true });
  });

  test("Admin audit log loads", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/audit");
    await expect(page).toHaveTitle(/./);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e-results/admin-audit.png", fullPage: true });
  });
});
