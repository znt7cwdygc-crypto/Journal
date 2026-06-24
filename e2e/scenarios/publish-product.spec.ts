import { test, expect } from "@playwright/test";

const RUN = `pw-product-${Date.now()}`;
const EMAIL = `${RUN}@test.local`;
const PASSWORD = "TestPass123!";
const NAME = `${RUN} Продавец`;
const PRODUCT_TITLE = `${RUN} Тестовый товар`;

test.describe.serial("Publish product flow", () => {
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
  });

  test("Open product form and fill", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/cabinet**", { timeout: 15000 });

    // Find product section
    const productTrigger = page.getByText(/товар|продукт|добавить товар|marketplace|магазин/i).first();
    if (await productTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await productTrigger.click();
      await page.waitForTimeout(1000);
    }

    const disclosure = page.locator('details:has-text("товар"), details:has-text("продукт"), [data-section="product"]').first();
    if (await disclosure.isVisible({ timeout: 3000 }).catch(() => false)) {
      await disclosure.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: "e2e-results/product-form-open.png", fullPage: true });

    // Fill product fields
    const titleInput = page.locator('input[name="title"], input[name="name"], input[placeholder*="назван"]').first();
    if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.fill(PRODUCT_TITLE);
    }

    const categorySelect = page.locator('select[name="category"], select[name="type"]').first();
    if (await categorySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categorySelect.selectOption({ index: 1 });
    }

    const priceInput = page.locator('input[name="price"], input[placeholder*="цена"], input[type="number"]').first();
    if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await priceInput.fill("1500");
    }

    const cityInput = page.locator('input[name="city"], input[placeholder*="город"]').first();
    if (await cityInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cityInput.fill("Москва");
    }

    const descInput = page.locator('textarea[name="description"], textarea[name="body"], textarea[placeholder*="описан"]').first();
    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill(`${RUN} Описание тестового товара для E2E теста`);
    }

    const contactInput = page.locator('input[name="contact"], input[name="contacts"], input[placeholder*="контакт"], input[name="telegram"]').first();
    if (await contactInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await contactInput.fill("@pw_test_contact");
    }

    await page.screenshot({ path: "e2e-results/product-form-filled.png", fullPage: true });

    // Submit
    const publishBtn = page.getByRole("button", { name: /опубликовать|отправить|сохранить|добавить/i }).first();
    if (await publishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await publishBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: "e2e-results/product-after-publish.png", fullPage: true });
  });

  test("Verify products page loads", async ({ page }) => {
    await page.goto("/products");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e-results/products-page.png", fullPage: true });

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
