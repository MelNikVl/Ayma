import { chromium } from "playwright";
const b = await chromium.launch();
for (const [name, url, w, h, dark] of [
  ["home", "http://localhost:3300/", 1440, 1500, false],
  ["home-dark", "http://localhost:3300/?sort=votes", 1440, 1100, true],
  ["home-mobile", "http://localhost:3300/", 390, 1600, false],
  ["proj", "http://localhost:3300/startup/hatuli#usdt", 1440, 1200, false],
]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: dark ? "dark" : "light" });
  await p.goto(url, { waitUntil: "networkidle" });
  if (name === "proj") { await p.locator("#usdt summary").click(); await p.locator("#usdt").scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await p.locator("#usdt").screenshot({ path: name + ".png" }); }
  else { if (name.startsWith("home") && name !== "home-mobile") await p.evaluate(() => window.scrollTo(0, 520)); await p.screenshot({ path: name + ".png" }); }
  await p.close();
}
await b.close();
