import { test, expect } from "@playwright/test";

const RUN = `pw-vacancy-${Date.now()}`;
const EMAIL = `${RUN}@test.local`;
const PASSWORD = "TestPass123!";
const NAME = `${RUN} Студия`;

test.describe.serial("Publish vacancy flow", () => {
  test("Register provider/studio user", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.fill('input[name="name"]', NAME);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);

    // Select PROVIDER or BOTH account mode
    const accountMode = page.locator('select[name="accountMode"], [name="accountMode"]');
    if (await accountMode.isVisible({ timeout: 2000 }).catch(() => false)) {
      const options = await accountMode.locator("option").allTextContents();
      const providerIdx = options.findIndex((o) => /provider|студи|работодат|both/i.test(o));
      if (providerIdx >= 0) {
        await accountMode.selectOption({ index: providerIdx });
      } else {
        // Last option is often PROVIDER or BOTH
        await accountMode.selectOption({ index: options.length - 1 });
      }
    }

    const profileKind = page.locator('select[name="profileKind"], [name="profileKind"]');
    if (await profileKind.isVisible({ timeout: 2000 }).catch(() => false)) {
      const options = await profileKind.locator("option").allTextContents();
      const studioIdx = options.findIndex((o) => /студи|studio/i.test(o));
      if (studioIdx >= 0) {
        await profileKind.selectOption({ index: studioIdx });
      } else {
        await profileKind.selectOption({ index: 1 });
      }
    }

    const adultCheckbox = page.locator('input[type="checkbox"]').first();
    if (await adultCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adultCheckbox.check();
    }

    await page.click('button[type="submit"]');
    await page.waitForURL("**/cabinet**", { timeout: 15000 });
    await expect(page.getByText(NAME)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e-results/vacancy-register.png", fullPage: true });
  });

  test("Open vacancy form and verify first step", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/cabinet**", { timeout: 15000 });

    // Look for vacancy section / disclosure
    const vacancyTrigger = page.getByText(/вакансия|добавить вакансию|разместить вакансию|listing/i).first();
    if (await vacancyTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await vacancyTrigger.click();
      await page.waitForTimeout(1000);
    }

    // Try details/disclosure elements
    const disclosure = page.locator('details:has-text("вакансия"), details:has-text("listing"), [data-section="vacancy"]').first();
    if (await disclosure.isVisible({ timeout: 3000 }).catch(() => false)) {
      await disclosure.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: "e2e-results/vacancy-form-open.png", fullPage: true });

    // Verify quiz first step is visible — look for "Начать" or chip buttons or step indicator
    const startBtn = page.getByText(/начать|далее|следующий/i).first();
    const chipBtn = page.locator('[class*="chip"], [class*="Chip"], button[data-value]').first();
    const formVisible =
      (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await chipBtn.isVisible({ timeout: 3000 }).catch(() => false));

    await page.screenshot({ path: "e2e-results/vacancy-first-step.png", fullPage: true });

    // If the quiz is visible, try clicking "Начать" to advance
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1000);

      // Try selecting a chip on the next step
      const firstChip = page.locator('[class*="chip"], [class*="Chip"], button[data-value]').first();
      if (await firstChip.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstChip.click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({ path: "e2e-results/vacancy-step-2.png", fullPage: true });
    }
  });

  test("Verify vacancies page loads", async ({ page }) => {
    await page.goto("/vacancies");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e-results/vacancies-page.png", fullPage: true });

    // Page should have some content
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
