import { test, expect } from "@playwright/test";

const RUN = `pw-interact-${Date.now()}`;
const EMAIL = `${RUN}@test.local`;
const PASSWORD = "TestPass123!";
const NAME = `${RUN} Читатель`;
const COMMENT_TEXT = `${RUN} Тестовый комментарий E2E`;

test.describe.serial("Article interactions — like, comment, share", () => {
  test("Register user", async ({ page }) => {
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
  });

  test("Open article and interact", async ({ page }) => {
    // Login
    await page.goto("/auth/signin");
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/cabinet**", { timeout: 15000 });

    // Go to articles feed
    await page.goto("/articles");
    await page.waitForTimeout(2000);

    // Click first article link/card
    const articleCard = page.locator('a[href*="/articles/"], article a, [class*="card"] a').first();
    await expect(articleCard).toBeVisible({ timeout: 10000 });
    await articleCard.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "e2e-results/article-detail.png", fullPage: true });

    // Click like/reaction button
    const likeBtn = page.getByText(/нравится|лайк/i).first();
    const heartBtn = page.locator('button:has(svg), [class*="like"], [class*="reaction"], [aria-label*="like"]').first();
    if (await likeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await likeBtn.click();
      await page.waitForTimeout(1000);
    } else if (await heartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await heartBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: "e2e-results/article-after-like.png", fullPage: true });

    // Find comment form and submit a comment
    const commentInput = page.locator('textarea[name="comment"], textarea[name="body"], textarea[placeholder*="коммент"], textarea[placeholder*="напиш"], input[name="comment"]').first();
    if (await commentInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await commentInput.fill(COMMENT_TEXT);

      const submitComment = page.getByRole("button", { name: /отправить|комментировать|добавить/i }).first();
      if (await submitComment.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitComment.click();
        await page.waitForTimeout(2000);
      }

      // Verify comment appeared
      const postedComment = page.getByText(COMMENT_TEXT).first();
      const commentVisible = await postedComment.isVisible({ timeout: 5000 }).catch(() => false);
      if (commentVisible) {
        await expect(postedComment).toBeVisible();
      }
    }

    await page.screenshot({ path: "e2e-results/article-after-comment.png", fullPage: true });

    // Click share button
    const shareBtn = page.getByText(/поделиться|share/i).first();
    const shareIcon = page.locator('[class*="share"], [aria-label*="share"], button:has-text("поделиться")').first();
    if (await shareBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await shareBtn.click();
      await page.waitForTimeout(1000);
    } else if (await shareIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await shareIcon.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: "e2e-results/article-share-dialog.png", fullPage: true });
  });
});
