import { test, expect } from "@playwright/test";

test.describe("Resume catalog", () => {
  test("Catalog page has header and cards with lock badge", async ({ page }) => {
    await page.goto("/resumes");
    await expect(page.getByRole("heading", { name: /резюме/i })).toBeVisible();

    // Resume cards present
    const cards = page.locator("[data-testid='resume-card'], article, .card, [class*='resume']");
    await expect(cards.first()).toBeVisible();

    // Lock badge with price
    await expect(page.getByText(/🔒|₽|руб/).first()).toBeVisible();
  });

  test("Favorite and report buttons exist", async ({ page }) => {
    await page.goto("/resumes");
    await expect(
      page.getByText(/избранно|favorite/i).or(page.locator("[aria-label*='избранн'], [title*='избранн'], button:has(svg)")).first()
    ).toBeVisible();
    await expect(
      page.getByText(/жалоб|report/i).first()
    ).toBeVisible();
  });

  test("Click resume card → detail page", async ({ page }) => {
    await page.goto("/resumes");
    const firstLink = page.locator("a[href*='/resumes/']").first();
    await expect(firstLink).toBeVisible();
    await firstLink.click();
    await page.waitForURL("**/resumes/**");

    // Detail page has title and content
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await page.screenshot({ path: "e2e-results/resume-detail.png", fullPage: true });
  });

  test("Mobile screenshot of catalog", async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes("iPhone")) {
      test.skip();
    }
    await page.goto("/resumes");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "e2e-results/resume-catalog-mobile.png", fullPage: true });
  });
});
