import { test, expect } from "@playwright/test";
import { checkNoHorizontalOverflow } from "./helpers";

test.describe("Article detail page", () => {
  test("Article has title, author, meta, reactions, comments", async ({ page }, testInfo) => {
    await page.goto("/articles");
    const firstLink = page.locator("a[href*='/articles/']").first();
    await expect(firstLink).toBeVisible();
    await firstLink.click();
    await page.waitForURL("**/articles/**");

    // Title
    await expect(page.locator("h1")).toBeVisible();

    // Author name
    await expect(
      page.locator("[class*='author'], [data-testid='author'], a[href*='/authors/']").first()
    ).toBeVisible();

    // Meta row (views/comments count)
    await expect(
      page.getByText(/просмотр|комментар|views/i).first()
    ).toBeVisible();

    // Reaction buttons
    await expect(
      page.getByText(/нравится|полезно|like/i).first()
    ).toBeVisible();

    // Comment section
    await expect(
      page.getByText(/комментар/i).first()
    ).toBeVisible();

    await page.screenshot({ path: "e2e-results/article-detail.png", fullPage: true });
  });

  test("No horizontal overflow on mobile", async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes("iPhone")) {
      test.skip();
    }
    await page.goto("/articles");
    const firstLink = page.locator("a[href*='/articles/']").first();
    await firstLink.click();
    await page.waitForURL("**/articles/**");
    await page.waitForTimeout(1000);
    await checkNoHorizontalOverflow(page);
  });
});
