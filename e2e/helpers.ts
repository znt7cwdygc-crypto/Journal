import { Page, expect } from "@playwright/test";

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/auth/signin");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/cabinet**", { timeout: 15000 });
}

export async function checkNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.body.scrollWidth > document.body.clientWidth
  );
  expect(hasOverflow).toBe(false);
}
