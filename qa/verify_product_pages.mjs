import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(
  "C:/Users/Owner/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/.codex-require.js"
);
const { chromium } = require("playwright");

const BASE_URL = process.env.VANSTRO_QA_BASE_URL ?? "http://127.0.0.1:3001";
const SHOT_DIR = "qa";

function assertText(page, text) {
  return page.waitForFunction(
    (needle) => {
      const normalizedNeedle = needle.toLowerCase();

      return Array.from(document.body.querySelectorAll("*")).some((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const isVisible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0;

        return isVisible && element.textContent?.toLowerCase().includes(normalizedNeedle);
      });
    },
    text,
    { timeout: 10000 }
  );
}

async function acceptCookiesIfVisible(page) {
  const acceptButton = page.getByRole("button", { name: "Accept All" });
  if ((await acceptButton.count()) > 0) {
    await acceptButton.first().click({ timeout: 5000 });
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

  if (overflowX > 2) {
    throw new Error(`${label} has horizontal overflow: ${overflowX}px`);
  }
}

async function assertNoPublicListingStockText(page, label) {
  const flags = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      stockOrInventory: /\bstock\b|\binventory\b/i.test(text),
      availability: /availability/i.test(text),
      doveGrey: /dove\s+grey/i.test(text),
      warmMaple: /warm\s+maple/i.test(text),
      aiGenerated: /AI-generated/i.test(text)
    };
  });

  const failed = Object.entries(flags)
    .filter(([, value]) => value)
    .map(([key]) => key);

  if (failed.length) {
    throw new Error(`${label} contains forbidden public listing text: ${failed.join(", ")}`);
  }
}

await mkdir(SHOT_DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const httpErrors = [];

page.on("response", (response) => {
  const responseUrl = new URL(response.url());
  const isRscPrefetch404 =
    response.status() === 404 &&
    responseUrl.pathname.includes("__next.") &&
    responseUrl.pathname.endsWith(".txt");

  if (response.status() >= 400 && !isRscPrefetch404) {
    httpErrors.push(`${response.status()} ${response.url()}`);
  }
});

await page.goto(`${BASE_URL}/`, {
  waitUntil: "domcontentloaded",
  timeout: 60000
});
await page.locator(".hero-grid").waitFor({ timeout: 30000 });
await acceptCookiesIfVisible(page);
await assertNoHorizontalOverflow(page, "Homepage");
await assertNoPublicListingStockText(page, "Homepage");
const homeProductCards = await page.locator(".product-grid .product-card").count();
if (homeProductCards !== 8) {
  throw new Error(`Expected 8 homepage product windows, found ${homeProductCards}`);
}
await page.screenshot({ path: `${SHOT_DIR}/home-desktop.png`, fullPage: true });

await page.goto(`${BASE_URL}/products?category=kitchen-cabinets`, {
  waitUntil: "domcontentloaded",
  timeout: 60000
});
await page.locator(".catalog-shell").waitFor({ timeout: 30000 });
await acceptCookiesIfVisible(page);
await assertNoHorizontalOverflow(page, "Product listing");
await assertNoPublicListingStockText(page, "Product listing");
await assertText(page, "Kitchen cabinets");
const productCards = await page.locator(".product-card, .catalog-product-card").count();
if (productCards < 2) {
  throw new Error(`Expected at least 2 kitchen product cards, found ${productCards}`);
}
await page.screenshot({ path: `${SHOT_DIR}/products-kitchen-desktop.png`, fullPage: true });

await page.goto(`${BASE_URL}/products?category=doors-windows`, {
  waitUntil: "domcontentloaded",
  timeout: 60000
});
await page.locator(".catalog-shell").waitFor({ timeout: 30000 });
await assertText(page, "Doors and windows is being staged");

await page.goto(`${BASE_URL}/products/base-cabinet-b33`, {
  waitUntil: "domcontentloaded",
  timeout: 60000
});
await page.locator(".pdp-shell").waitFor({ timeout: 30000 });
await acceptCookiesIfVisible(page);
await page.locator(".pdp-buy-panel").waitFor({ timeout: 10000 });
const dealerRows = await page.locator(".dealer-stock-row").count();
if (dealerRows !== 0) {
  throw new Error(`Expected no inline dealer selector rows, found ${dealerRows}`);
}
await assertText(page, "Overview");
await assertText(page, "Product overview");
await assertText(page, "Manuals and Documents");
await assertText(page, "Specifications");
await assertText(page, "Package Quantity");
await assertText(page, "Customer Reviews");
await assertText(page, "Questions and Answers");
await assertText(page, "Complete the project");
await assertText(page, "14 available at selected dealer");
await assertText(page, "VanStro Toronto");
await assertText(page, "Pick-Up");
await assertText(page, "Local delivery");
await page.locator(".pdp-dealer-trigger").click();
await page.locator(".pdp-dealer-modal").waitFor({ state: "visible", timeout: 10000 });
await page.getByText("Choose pickup dealer", { exact: false }).first().waitFor({ timeout: 10000 });
await page.getByText("~13 km away", { exact: false }).first().waitFor({ timeout: 10000 });
await page.locator(".pdp-dealer-option").filter({ hasText: "VanStro Calgary" }).click();
await page.getByText("VanStro Calgary", { exact: false }).first().waitFor({
  timeout: 10000
});
await page.getByText("3 left at selected dealer", { exact: false }).first().waitFor({
  timeout: 10000
});
await page.locator(".pdp-dealer-trigger").click();
await page.locator(".pdp-dealer-option").filter({ hasText: "VanStro Toronto" }).click();
const finishImageSync = await page.evaluate(() => ({
  checkedFinish: document.querySelector('input[name="product-finish"]:checked')?.value,
  mainImageSrc: document.querySelector(".pdp-gallery-frame img")?.getAttribute("src"),
  activeThumb: document.querySelector(".pdp-thumb.active span")?.textContent?.trim()
}));
if (
  finishImageSync.checkedFinish !== "PVC white" ||
  !finishImageSync.mainImageSrc?.includes("source_img-269") ||
  finishImageSync.activeThumb !== "PVC white"
) {
  throw new Error(`Expected finish image sync for PVC white, got ${JSON.stringify(finishImageSync)}`);
}
await assertNoHorizontalOverflow(page, "Product detail");
await page.screenshot({ path: `${SHOT_DIR}/product-detail-desktop.png`, fullPage: true });

const mobilePage = await browser.newPage({
  viewport: { width: 390, height: 920 },
  isMobile: true
});
await mobilePage.goto(`${BASE_URL}/products?category=doors-windows`, {
  waitUntil: "domcontentloaded",
  timeout: 60000
});
await mobilePage.locator(".catalog-shell").waitFor({ timeout: 30000 });
await acceptCookiesIfVisible(mobilePage);
await mobilePage.getByText("Doors and windows is being staged", { exact: false }).first().waitFor({
  timeout: 10000
});
await mobilePage.screenshot({ path: `${SHOT_DIR}/products-empty-mobile.png`, fullPage: true });

await mobilePage.goto(`${BASE_URL}/products/base-cabinet-b33`, {
  waitUntil: "domcontentloaded",
  timeout: 60000
});
await mobilePage.locator(".pdp-shell").waitFor({ timeout: 30000 });
await acceptCookiesIfVisible(mobilePage);
await mobilePage.getByText("Package Quantity", { exact: false }).first().waitFor({
  timeout: 10000
});
await mobilePage.getByText("Specifications", { exact: false }).first().waitFor({
  timeout: 10000
});
await mobilePage.getByText("Product overview", { exact: false }).first().waitFor({
  timeout: 10000
});
await mobilePage.getByText("Documents", { exact: false }).first().waitFor({
  timeout: 10000
});
await mobilePage.getByText("Questions and Answers", { exact: false }).first().waitFor({
  timeout: 10000
});
await mobilePage.getByText("Customer Reviews", { exact: false }).first().waitFor({
  timeout: 10000
});
await mobilePage.getByText("Complete the project", { exact: false }).first().waitFor({
  timeout: 10000
});
await mobilePage.getByText("14 available at selected dealer", { exact: false }).first().waitFor({
  timeout: 10000
});
await mobilePage.screenshot({ path: `${SHOT_DIR}/product-detail-mobile.png`, fullPage: true });
await mobilePage.close();

await browser.close();

if (httpErrors.length) {
  throw new Error(`HTTP errors found:\n${httpErrors.join("\n")}`);
}

console.log("Verified product listing filters, coming-soon empty state, and product detail fulfillment layout.");
