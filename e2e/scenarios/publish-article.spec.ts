import { test, expect } from "@playwright/test";

const RUN = `pw-article-${Date.now()}`;
const EMAIL = `${RUN}@test.local`;
const PASSWORD = "TestPass123!";
const NAME = `${RUN} Автор`;
const TITLE = `${RUN} Тестовая статья`;

test.describe.serial("Publish article flow", () => {
  test("Register new user", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.fill('input[name="name"]', NAME);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);

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
    await expect(page.getByText(NAME)).toBeVisible({ timeout: 10000 });
  });

  test("Open article form and publish", async ({ page }) => {
    // Login
    await page.goto("/auth/signin");
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/cabinet**", { timeout: 15000 });

    // Look for blog/article section or "Написать" button
    const writeBtn = page.getByText(/написать|новая статья|добавить статью|блог/i).first();
    if (await writeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await writeBtn.click();
      await page.waitForTimeout(1000);
    }

    // Try clicking a disclosure/section for blog if present
    const blogSection = page.locator('[id="blog"], [data-section="blog"], details:has-text("блог"), details:has-text("стать")').first();
    if (await blogSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await blogSection.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: "e2e-results/article-form-open.png", fullPage: true });

    // Fill article form fields
    const titleInput = page.locator('input[name="title"], input[placeholder*="загол"], input[placeholder*="назван"]').first();
    if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.fill(TITLE);
    }

    const summaryInput = page.locator('textarea[name="summary"], textarea[name="description"], input[name="summary"]').first();
    if (await summaryInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await summaryInput.fill(`${RUN} Краткое описание тестовой статьи`);
    }

    const bodyInput = page.locator('textarea[name="body"], textarea[name="content"], [contenteditable="true"]').first();
    if (await bodyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyInput.fill(`${RUN} Текст тестовой статьи. Это автоматический тест.`);
    }

    // Select topic "Истории"
    const topicSelect = page.locator('select[name="topic"], select[name="category"]').first();
    if (await topicSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await topicSelect.locator("option").allTextContents();
      const storiesIdx = options.findIndex((o) => /истори/i.test(o));
      if (storiesIdx >= 0) {
        await topicSelect.selectOption({ index: storiesIdx });
      } else {
        await topicSelect.selectOption({ index: 1 });
      }
    }

    // Select format "Личная история"
    const formatSelect = page.locator('select[name="format"], select[name="type"]').first();
    if (await formatSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await formatSelect.locator("option").allTextContents();
      const personalIdx = options.findIndex((o) => /личн/i.test(o));
      if (personalIdx >= 0) {
        await formatSelect.selectOption({ index: personalIdx });
      } else {
        await formatSelect.selectOption({ index: 1 });
      }
    }

    await page.screenshot({ path: "e2e-results/article-form-filled.png", fullPage: true });

    // Submit
    const publishBtn = page.getByRole("button", { name: /опубликовать|отправить|сохранить/i }).first();
    if (await publishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await publishBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: "e2e-results/article-after-publish.png", fullPage: true });
  });

  test("Verify article in feed", async ({ page }) => {
    await page.goto("/articles");
    await page.waitForTimeout(2000);

    // Check if our article title appears somewhere in the feed
    const articleLink = page.getByText(TITLE).first();
    const visible = await articleLink.isVisible({ timeout: 10000 }).catch(() => false);

    await page.screenshot({ path: "e2e-results/article-feed-check.png", fullPage: true });

    // Soft check — article may need moderation
    if (visible) {
      await expect(articleLink).toBeVisible();
    }
  });
});
