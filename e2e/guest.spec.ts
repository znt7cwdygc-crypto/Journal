import { test, expect } from "@playwright/test";
import { checkNoHorizontalOverflow } from "./helpers";

test.describe("Guest — public pages", () => {
  test("Home page loads with heading and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /материалы сообщества/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /регистрация/i }).or(page.getByRole("button", { name: /начать/i }))).toBeVisible();
    await page.screenshot({ path: "e2e-results/home.png", fullPage: true });
  });

  test("/articles — has article cards", async ({ page }) => {
    await page.goto("/articles");
    await expect(page.locator("article, [data-testid='article-card'], a[href*='/articles/']").first()).toBeVisible();
  });

  test("/vacancies — has header", async ({ page }) => {
    await page.goto("/vacancies");
    await expect(page.getByRole("heading", { name: /вакансии/i })).toBeVisible();
  });

  test("/services — loads", async ({ page }) => {
    await page.goto("/services");
    await expect(page).toHaveTitle(/.+/);
  });

  test("/products — loads", async ({ page }) => {
    await page.goto("/products");
    await expect(page).toHaveTitle(/.+/);
  });

  test("/resumes — has lock badge on cards", async ({ page }) => {
    await page.goto("/resumes");
    await expect(page.getByRole("heading", { name: /резюме/i })).toBeVisible();
    const cards = page.locator("[data-testid='resume-card'], article, .card").filter({ hasText: /🔒|₽|руб/ });
    await expect(cards.first()).toBeVisible();
  });

  test("/model-operator — loads", async ({ page }) => {
    await page.goto("/model-operator");
    await expect(page).toHaveTitle(/.+/);
  });

  test("/authors — loads", async ({ page }) => {
    await page.goto("/authors");
    await expect(page).toHaveTitle(/.+/);
  });

  for (const path of ["/stories", "/money", "/safety", "/work"]) {
    test(`${path} — loads`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(/.+/);
    });
  }

  test("/auth/signin — login form visible", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
  });

  test("/auth/signup — registration form visible", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.locator('input[name="name"], input[name="email"], input[type="email"]').first()).toBeVisible();
  });

  test("Click first article → detail page with h1", async ({ page }) => {
    await page.goto("/articles");
    const firstLink = page.locator("a[href*='/articles/']").first();
    await expect(firstLink).toBeVisible();
    await firstLink.click();
    await page.waitForURL("**/articles/**");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("/cabinet redirects to signin", async ({ page }) => {
    await page.goto("/cabinet");
    await page.waitForURL("**/auth/signin**", { timeout: 10000 });
    expect(page.url()).toContain("/auth/signin");
  });

  test("/admin redirects away", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForTimeout(3000);
    expect(page.url()).not.toMatch(/\/admin$/);
  });

  test("No horizontal overflow on mobile", async ({ page, browserName }, testInfo) => {
    if (!testInfo.project.name.includes("iPhone")) {
      test.skip();
    }
    for (const path of ["/", "/articles", "/vacancies"]) {
      await page.goto(path);
      await page.waitForTimeout(1000);
      await checkNoHorizontalOverflow(page);
    }
  });

  test("Home page screenshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "e2e-results/home-viewport.png", fullPage: true });
  });
});
