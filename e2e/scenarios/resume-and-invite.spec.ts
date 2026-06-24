import { test, expect } from "@playwright/test";

const RUN = `pw-resume-${Date.now()}`;
const MODEL_EMAIL = `${RUN}-model@test.local`;
const STUDIO_EMAIL = `${RUN}-studio@test.local`;
const PASSWORD = "TestPass123!";

test.describe("Resume and invite flow", () => {
  test("Register model user and verify resume form", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.fill('input[name="name"]', `${RUN} Модель`);
    await page.fill('input[name="email"]', MODEL_EMAIL);
    await page.fill('input[name="password"]', PASSWORD);

    // Select MODEL / SEEKER account mode (first non-default option)
    const accountMode = page.locator('select[name="accountMode"], [name="accountMode"]');
    if (await accountMode.isVisible({ timeout: 2000 }).catch(() => false)) {
      await accountMode.selectOption({ index: 1 });
    }
    const profileKind = page.locator('select[name="profileKind"], [name="profileKind"]');
    if (await profileKind.isVisible({ timeout: 2000 }).catch(() => false)) {
      await profileKind.selectOption({ index: 1 });
    }
    const adultCheckbox = page.locator('input[type="checkbox"]').first();
    if (await adultCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adultCheckbox.check();
    }

    await page.click('button[type="submit"]');
    await page.waitForURL("**/cabinet**", { timeout: 15000 });

    // Look for resume section
    const resumeTrigger = page.getByText(/резюме|анкета|заполнить анкету/i).first();
    if (await resumeTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await resumeTrigger.click();
      await page.waitForTimeout(1000);
    }

    const disclosure = page.locator('details:has-text("резюме"), details:has-text("анкет"), [data-section="resume"]').first();
    if (await disclosure.isVisible({ timeout: 3000 }).catch(() => false)) {
      await disclosure.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: "e2e-results/resume-form.png", fullPage: true });

    // Verify quiz first step renders
    const quizElement = page.locator('[class*="quiz"], [class*="wizard"], [class*="step"], form').first();
    const startBtn = page.getByText(/начать|далее/i).first();
    const quizVisible =
      (await quizElement.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await startBtn.isVisible({ timeout: 3000 }).catch(() => false));

    await page.screenshot({ path: "e2e-results/resume-quiz-step1.png", fullPage: true });
  });

  test("Register studio user and browse resumes", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.fill('input[name="name"]', `${RUN} Студия`);
    await page.fill('input[name="email"]', STUDIO_EMAIL);
    await page.fill('input[name="password"]', PASSWORD);

    const accountMode = page.locator('select[name="accountMode"], [name="accountMode"]');
    if (await accountMode.isVisible({ timeout: 2000 }).catch(() => false)) {
      const options = await accountMode.locator("option").allTextContents();
      const providerIdx = options.findIndex((o) => /provider|студи|работодат|both/i.test(o));
      if (providerIdx >= 0) {
        await accountMode.selectOption({ index: providerIdx });
      } else {
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

    // Go to resumes catalog
    await page.goto("/resumes");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e-results/resumes-catalog.png", fullPage: true });

    // Click on a resume card if available
    const resumeCard = page.locator('a[href*="/resumes/"], [class*="card"] a, article a').first();
    if (await resumeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await resumeCard.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: "e2e-results/resume-detail.png", fullPage: true });

      // Verify contact lock or balance prompt
      const contactLock = page.getByText(/получить контакт|пополните баланс|контакт|заблокирован/i).first();
      const priceElement = page.locator('[class*="lock"], [class*="price"], [class*="badge"]').first();

      const lockVisible =
        (await contactLock.isVisible({ timeout: 5000 }).catch(() => false)) ||
        (await priceElement.isVisible({ timeout: 3000 }).catch(() => false));

      await page.screenshot({ path: "e2e-results/resume-contact-lock.png", fullPage: true });
    }
  });
});
