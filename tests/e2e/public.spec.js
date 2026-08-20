import { expect, test } from "@playwright/test";

test.describe("public bilingual experience", () => {
  test("renders the Ukrainian landing page and switches to English", async ({ page }) => {
    const browserErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));

    await page.goto("/uk");

    await expect(
      page.getByRole("heading", { name: "Терміни, які важливо розуміти точно." }),
    ).toBeVisible();
    await expect(page.getByText("Демонстраційні чернетки — не перевірений словник")).toBeVisible();

    await page.getByRole("button", { name: "Switch to English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(
      page.getByRole("heading", { name: "Terms that matter need precise understanding." }),
    ).toBeVisible();
    expect(browserErrors).toEqual([]);
  });

  test("redirects anonymous learners away from protected learning pages", async ({ page }) => {
    const browserErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));

    await page.goto("/uk/dashboard");

    await expect(page).toHaveURL(/\/uk\/login$/);
    await expect(page.getByRole("heading", { name: "Раді бачити знову" })).toBeVisible();
    expect(browserErrors).toEqual([]);
  });

  test("reflows the public hero without horizontal page overflow", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/uk");

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    await expect(page.getByRole("link", { name: "Почати тренування" }).first()).toBeVisible();
  });
});
