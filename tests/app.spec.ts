import { expect, test } from "@playwright/test";

test.describe("application smoke flow", () => {
  test("desktop strategy can be sent to the paper account", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium");
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("/#/pages/home/index");
    await expect(page.getByText("把每次判断，写进损益图。")).toBeVisible();

    await page.locator(".rail-nav__item").filter({ hasText: "策略" }).click();
    await page.waitForURL(/pages\/strategy\/index/);
    await expect(page.locator(".chart-panel__title")).toHaveText("牛市看涨价差");

    await page
      .locator(".strategy-category__trigger")
      .filter({ hasText: "区间" })
      .click();
    await expect(page.locator(".strategy-category-menu")).toBeVisible();
    await page
      .locator(".strategy-category-menu__item")
      .filter({ hasText: "铁鹰式" })
      .click();
    await expect(page.locator(".chart-panel__title")).toHaveText("铁鹰式");
    await expect(page.locator(".leg-row")).toHaveCount(4);

    const payoffCanvas = page.locator(".payoff-chart__canvas").first();
    await expect(payoffCanvas).toBeVisible();
    const canvasBox = await payoffCanvas.boundingBox();
    expect(canvasBox?.width ?? 0).toBeGreaterThan(300);
    expect(canvasBox?.height ?? 0).toBeGreaterThan(200);

    await page.getByText("发送到模拟盘", { exact: true }).click();
    await page.waitForURL(/pages\/order\/index/);
    await expect(page.locator(".strategy-order-head__title")).toHaveText("铁鹰式");
    await page.getByText("执行组合模拟成交", { exact: true }).click();
    await page.getByText("确认成交", { exact: true }).click();
    await page.waitForURL(/pages\/practice\/index/, { timeout: 5000 });

    await expect(page.locator(".position-row").first()).toBeVisible();
    expect(await page.locator(".position-row").count()).toBeGreaterThanOrEqual(4);
    await page.locator(".segmented__item").filter({ hasText: "订单" }).click();
    await expect(page.locator(".order-row").first()).toContainText("铁鹰式");
    expect(pageErrors).toEqual([]);
  });

  test("lesson quiz and completion state work", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium");
    await page.goto("/#/pages/lesson/index?id=premium-value");
    await expect(page.locator(".page-header__title")).toContainText("权利金里的时间价值");
    await expect(page.locator(".lesson-section")).toHaveCount(2);
    await expect(page.locator(".lesson-lab__chart canvas")).toBeVisible();

    await page.getByText("时间流逝", { exact: true }).click();
    await expect(page.getByText("回答正确", { exact: true })).toBeVisible();
    await page.getByText("完成课程", { exact: true }).click();
    await expect(page.getByText("已完成", { exact: true }).first()).toBeVisible();
  });

  test("local account registration and preferences persist", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium");
    await page.goto("/#/pages/auth/index");
    await page
      .locator(".segmented__item")
      .filter({ hasText: "注册" })
      .click();
    await expect(page.locator(".auth-form-title")).toHaveText("创建本地账户");

    const registerInputs = page.locator(".auth-input input");
    await registerInputs.nth(0).fill("测试用户");
    await registerInputs.nth(1).fill("testuser01");
    await registerInputs.nth(2).fill("password123");
    await registerInputs.nth(3).fill("password123");
    await page
      .getByText("我已知晓本地数据说明和期权交易风险")
      .click();
    await page.getByText("创建账户", { exact: true }).click();

    await page.waitForURL(/pages\/profile\/index/, { timeout: 6000 });
    await expect(page.locator(".profile-identity__name")).toHaveText("测试用户");
    const storedCredentials = await page.evaluate(() =>
      Object.keys(localStorage)
        .map((key) => `${key}:${localStorage.getItem(key) ?? ""}`)
        .join("\n"),
    );
    expect(storedCredentials).not.toContain("password123");
    expect(storedCredentials).toContain("passwordHash");

    await page
      .locator(".settings-row")
      .filter({ hasText: "账户与偏好设置" })
      .click();
    await page.waitForURL(/pages\/settings\/index/);
    await page.locator(".settings-input input").fill("测试用户新");
    await page.locator(".risk-choice").filter({ hasText: "C4 · 积极型" }).click();
    await page.locator(".settings-select").click();
    await page.getByText("买入跨式", { exact: true }).click();
    await page.locator(".settings-stepper__button").last().click();
    await page.locator(".settings-stepper__button").last().click();
    await page.getByText("保存账户配置", { exact: true }).click();
    await expect(page.getByText("配置已保存到当前本地账户", { exact: true })).toBeVisible();

    await page.goto("/#/pages/profile/index");
    await expect(page.locator(".profile-identity__name")).toHaveText("测试用户新");
    await page
      .locator(".settings-row")
      .filter({ hasText: "退出登录" })
      .click();
    await page.getByText("退出登录", { exact: true }).last().click();
    await expect(page.locator(".profile-identity__name")).toHaveText("访客");

    await page
      .locator(".settings-row")
      .filter({ hasText: "登录或注册" })
      .click();
    await page.waitForURL(/pages\/auth\/index/);
    const loginInputs = page.locator(".auth-input input");
    await loginInputs.nth(0).fill("testuser01");
    await loginInputs.nth(1).fill("password123");
    await page.getByText("登录账户", { exact: true }).click();

    await page.waitForURL(/pages\/profile\/index/, { timeout: 6000 });
    await expect(page.locator(".profile-identity__name")).toHaveText("测试用户新");
    await page.goto("/#/pages/strategy/index");
    await expect(page.locator(".chart-panel__title")).toHaveText("买入跨式");
    await page.goto("/#/pages/order/index");
    await expect(page.locator(".quantity-row__value")).toHaveText("3");
  });

  test("phone quick login explains the H5 platform boundary", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium");
    await page.goto("/#/pages/auth/index");
    await page.locator(".phone-login").click();
    await expect(
      page.getByText(
        "微信一键获取手机号仅在微信小程序内可用。H5 需要接入短信验证码服务和后端会话接口。",
      ),
    ).toBeVisible();
  });

  test("admin can manage users, content and announcement", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium");
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    test.skip(!adminPassword, "requires DEFAULT_ADMIN_PASSWORD");
    await page.goto("/#/pages/auth/index");
    const inputs = page.locator(".auth-input input");
    await inputs.nth(0).fill("admin");
    await inputs.nth(1).fill(adminPassword as string);
    await page.getByText("登录账户", { exact: true }).click();
    await page.waitForURL(/pages\/profile\/index/, { timeout: 6000 });
    await expect(page.locator(".profile-admin-entry")).toBeVisible();

    await page.locator(".profile-admin-entry").click();
    await page.waitForURL(/pages\/admin\/index/);
    await expect(page.locator(".admin-header__title")).toHaveText("数据概览");

    await page.locator(".admin-nav__item").filter({ hasText: "用户管理" }).click();
    await expect(page.locator(".admin-table__row")).toHaveCount(1);
    await expect(page.locator(".admin-table__row").first()).toContainText("管理员");

    await page.locator(".admin-nav__item").filter({ hasText: "内容发布" }).click();
    const lessonRow = page
      .locator(".admin-content-row")
      .filter({ hasText: "Delta 与 Gamma：方向与加速度" });
    await lessonRow.locator(".admin-switch").click();
    await expect(lessonRow.locator(".admin-content-row__status")).toHaveText("草稿");
    const strategyRow = page
      .locator(".admin-content-row")
      .filter({ hasText: "铁鹰式" });
    await strategyRow.locator(".admin-switch").click();
    await expect(strategyRow.locator(".admin-content-row__status")).toHaveText("已停用");

    await page.goto("/#/pages/learn/index");
    await expect(
      page.getByText("Delta 与 Gamma：方向与加速度", { exact: true }),
    ).toHaveCount(0);
    await page.goto("/#/pages/strategy/index");
    await page
      .locator(".strategy-category__trigger")
      .filter({ hasText: "区间" })
      .click();
    await expect(
      page
        .locator(".strategy-category-menu__item")
        .filter({ hasText: "铁鹰式" }),
    ).toHaveCount(0);

    await page.goto("/#/pages/admin/index");
    await page
      .locator(".admin-nav__item")
      .filter({ hasText: "运营公告" })
      .click();
    await page.locator(".admin-announcement-layout .admin-switch").click();
    await page.locator(".admin-form__input input").fill("管理台公告已开启");
    await page
      .locator(".admin-form__textarea textarea")
      .fill("这条公告由运营管理后台发布。");
    await page.getByText("保存运营公告", { exact: true }).click();
    await expect(page.getByText("公告已保存", { exact: true })).toBeVisible();

    await page.goto("/#/pages/home/index");
    await expect(page.getByText("管理台公告已开启", { exact: true })).toBeVisible();
    await expect(
      page.getByText("这条公告由运营管理后台发布。", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("mobile layout", () => {
  test("primary pages do not overflow the viewport", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium");
    await page.goto("/#/pages/home/index");
    await expect(page.locator(".mobile-nav")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      )
      .toBe(true);

    await page.locator(".mobile-nav__item").filter({ hasText: "策略" }).click();
    await page.waitForURL(/pages\/strategy\/index/);
    await expect(page.locator(".page-header__title")).toHaveText("策略实验室");
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      )
      .toBe(true);

    await page.screenshot({
      path: ".artifacts/strategy-mobile-verified.png",
      fullPage: true,
    });
  });

  test("all routes stay within the mobile canvas", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium");
    const routes = [
      "/#/pages/home/index",
      "/#/pages/learn/index",
      "/#/pages/lesson/index?id=delta-gamma",
      "/#/pages/strategy/index",
      "/#/pages/practice/index",
      "/#/pages/order/index",
      "/#/pages/order/index?mode=strategy&id=iron-condor",
      "/#/pages/live/index",
      "/#/pages/profile/index",
      "/#/pages/auth/index",
      "/#/pages/settings/index",
      "/#/pages/admin/index",
    ];
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(450);
      const layout = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      expect(layout.documentWidth, `horizontal overflow on mobile route ${route}`).toBeLessThanOrEqual(
        layout.viewportWidth + 1,
      );
    }
    expect(pageErrors).toEqual([]);
  });

  test("strategy category menus remain fully visible on narrow screens", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium");
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/#/pages/strategy/index");

    const categoryButtons = page.locator(".strategy-category__trigger");
    await expect(categoryButtons).toHaveCount(5);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      )
      .toBe(true);

    await categoryButtons.filter({ hasText: "方向" }).click();
    await expect(page.locator(".strategy-category-menu__item")).toHaveCount(5);
    await expect(
      page
        .locator(".strategy-category-menu__item")
        .filter({ hasText: "风险逆转" }),
    ).toBeVisible();

    const menu = await page.locator(".strategy-category-menu").boundingBox();
    expect(menu?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((menu?.x ?? 0) + (menu?.width ?? 0)).toBeLessThanOrEqual(320);
  });

  test("mobile account summary uses a horizontal layout", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium");
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    test.skip(!adminPassword, "requires DEFAULT_ADMIN_PASSWORD");

    await page.goto("/#/pages/auth/index");
    const inputs = page.locator(".auth-input input");
    await inputs.nth(0).fill("admin");
    await inputs.nth(1).fill(adminPassword as string);
    await page.getByText("登录账户", { exact: true }).click();
    await page.waitForURL(/pages\/profile\/index/);
    await page.goto("/#/pages/settings/index");

    const summary = await page.locator(".account-summary").boundingBox();
    const identity = await page
      .locator(".account-summary__identity")
      .boundingBox();
    expect(summary?.width ?? 0).toBeGreaterThan(330);
    expect(summary?.height ?? 999).toBeLessThan(180);
    expect(identity?.height ?? 999).toBeLessThan(80);
  });
});
