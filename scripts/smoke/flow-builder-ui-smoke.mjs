import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const targetOrg = process.env.SF_TARGET_ORG || "cchrisv944";
const flowBuilderPath =
  process.env.FLOW_BUILDER_PATH ||
  "/builder_platform_interaction/flowBuilder.app";
const artifactDir = resolve("artifacts", "smoke");
const screenshotPath = resolve(artifactDir, "flow-builder-ui-smoke.png");
const sfCommand = process.platform === "win32" ? "sf.cmd" : "sf";

function runSf(args) {
  const output = execFileSync(sfCommand, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  return JSON.parse(output);
}

const openResult = runSf([
  "org",
  "open",
  "--target-org",
  targetOrg,
  "--url-only",
  "--path",
  flowBuilderPath,
  "--json"
]);

mkdirSync(artifactDir, { recursive: true });

const browser = await chromium.launch({
  headless: process.env.PLAYWRIGHT_HEADLESS !== "false"
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  await page.goto(openResult.result.url, {
    waitUntil: "domcontentloaded",
    timeout: 120000
  });
  await page
    .waitForLoadState("networkidle", { timeout: 45000 })
    .catch(() => {});

  const pageText = await page
    .locator("body")
    .innerText({ timeout: 90000 })
    .catch(() => "");
  const title = await page.title();
  const evidence = `${title}\n${pageText}`;

  if (
    !/Flow Builder|Select a Flow|New Flow|Screen Flow|Auto-Layout|Freeform/i.test(
      evidence
    )
  ) {
    throw new Error(
      `Flow Builder shell did not load recognizable UI. title=${JSON.stringify(
        title
      )}`
    );
  }

  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(
    JSON.stringify(
      {
        ok: true,
        targetOrg,
        finalUrl: page.url(),
        title,
        screenshotPath
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
