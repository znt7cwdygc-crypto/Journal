import { test, expect } from "@playwright/test";
import { checkNoHorizontalOverflow } from "./helpers";

test.describe("Mobile UX", () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!testInfo.project.name.includes("iPhone")) {
      test.skip();
    }
  });

  test("Bottom nav visible with key items", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    for (const label of ["Лента", "Работа", "Маркет", "Кабинет"]) {
      await expect(
        page.getByText(label, { exact: false }).first()
      ).toBeVisible();
    }
  });

  test("No horizontal overflow on key pages", async ({ page }) => {
    for (const path of ["/", "/articles", "/vacancies", "/services", "/resumes", "/products"]) {
      await page.goto(path);
      await page.waitForTimeout(1000);
      await checkNoHorizontalOverflow(page);
    }
  });

  test("Sort chips visible on /articles", async ({ page }) => {
    await page.goto("/articles");
    await page.waitForTimeout(1000);

    for (const chip of ["Свежее", "Популярное", "Обсуждаемое"]) {
      await expect(
        page.getByText(chip, { exact: false }).first()
      ).toBeVisible();
    }
  });

  test("Mobile screenshots of key pages", async ({ page }) => {
    for (const path of ["/", "/articles", "/vacancies", "/resumes"]) {
      await page.goto(path);
      await page.waitForTimeout(1000);
      const name = path === "/" ? "home" : path.slice(1);
      await page.screenshot({ path: `e2e-results/mobile-${name}.png`, fullPage: true });
    }
  });
});
