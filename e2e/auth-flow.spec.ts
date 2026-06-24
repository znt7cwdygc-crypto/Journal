import { test, expect } from "@playwright/test";

const TEST_EMAIL = `pw-test-${Date.now()}@example.local`;
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "PW Тест";

test.describe("Auth flow — register, logout, login", () => {
  test("Register new user", async ({ page }) => {
    await page.goto("/auth/signup");

    await page.fill('input[name="name"]', TEST_NAME);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);

    // Select accountMode if present
    const accountMode = page.locator('select[name="accountMode"], [name="accountMode"]');
    if (await accountMode.isVisible({ timeout: 2000 }).catch(() => false)) {
      await accountMode.selectOption({ index: 1 });
    }

    // Select profileKind if present
    const profileKind = page.locator('select[name="profileKind"], [name="profileKind"]');
    if (await profileKind.isVisible({ timeout: 2000 }).catch(() => false)) {
      await profileKind.selectOption({ index: 1 });
    }

    // Check adult checkbox if present
    const adultCheckbox = page.locator('input[name="adult"], input[name="isAdult"], input[type="checkbox"]').first();
    if (await adultCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adultCheckbox.check();
    }

    await page.click('button[type="submit"]');
    await page.waitForURL("**/cabinet**", { timeout: 15000 });

    // Check cabinet loads with user name
    await expect(page.getByText(TEST_NAME)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e-results/cabinet-after-register.png", fullPage: true });
  });

  test("Logout", async ({ page }) => {
    // First login
    await page.goto("/auth/signin");
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/cabinet**", { timeout: 15000 });

    // Click logout
    await page.getByText(/выйти|logout/i).click();
    await page.waitForTimeout(3000);

    // Should see login/register links
    await expect(
      page.getByText(/вход|регистрация|войти/i).first()
    ).toBeVisible();
  });

  test("Login with existing credentials", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/cabinet**", { timeout: 15000 });

    await expect(page.getByText(TEST_NAME)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e-results/cabinet-after-login.png", fullPage: true });
  });
});
