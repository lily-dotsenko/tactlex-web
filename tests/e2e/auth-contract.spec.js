import { expect, test } from "@playwright/test";

test.describe("public form contracts", () => {
  test("registration sends the strict API payload and no role fields", async ({ page }) => {
    let requestBody;
    await page.route("**/api/v1/auth/register", async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            user: {
              id: "00000000-0000-4000-8000-000000000001",
              email: requestBody.email,
              profile: { nickname: requestBody.nickname, locale: requestBody.locale },
              roles: ["USER"],
            },
          },
        }),
      });
    });

    await page.goto("/en/register");
    await page.getByLabel("Nickname").fill("Sokil-test");
    await page.getByLabel("Email").fill("learner@example.test");
    await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple");
    await page.getByRole("button", { name: "Create profile" }).click();

    await expect(page).toHaveURL(/\/en\/onboarding$/);
    expect(requestBody).toEqual({
      nickname: "Sokil-test",
      email: "learner@example.test",
      password: "correct horse battery staple",
      locale: "en",
    });
    expect(requestBody).not.toHaveProperty("role");
    expect(requestBody).not.toHaveProperty("xp");
  });

  test("password recovery does not claim to send an unavailable email", async ({ page }) => {
    await page.goto("/en/forgot-password");

    await expect(
      page.getByRole("heading", { name: "Password recovery is not enabled yet" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/en/login",
    );
    await expect(page.getByRole("textbox")).toHaveCount(0);
  });

  test("registration explains when an email or nickname already exists", async ({ page }) => {
    await page.route("**/api/v1/auth/register", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "ACCOUNT_ALREADY_EXISTS",
            message: "Account already exists.",
          },
        }),
      });
    });

    await page.goto("/uk/register");
    await page.getByLabel("Псевдонім").fill("lily");
    await page.getByLabel("Email").fill("learner@example.test");
    await page.getByLabel("Пароль", { exact: true }).fill("correct horse battery staple");
    await page.getByRole("button", { name: "Створити профіль" }).click();

    await expect(page.locator(".form-alert")).toContainText(
      "email або псевдонім уже використовується",
    );
  });
});
