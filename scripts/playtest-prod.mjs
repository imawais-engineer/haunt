// Black-box playtest of a PRODUCTION build (or the live site), in headless Chromium.
//
//   node scripts/playtest-prod.mjs [win|lose] [url]
//   npm run playtest:prod -- lose https://imawais-engineer.github.io/haunt/
//
// Default URL: http://localhost:4173/haunt/ (`npm run build && npx vite preview --port 4173`).
//
// LIMITATION: production builds do not expose window.__haunt, so this script cannot
// read game state. It only uses real mouse/keyboard input, screenshots, coarse
// screenshot color signatures, wall-clock timing, page errors, console errors and
// failed network requests. "The night started/ended" is inferred from visual change
// and from the 300 s night length, not read from the game. It shows that the build
// loads, runs a full night without errors and restarts. It cannot prove who won or
// that scoring is right, and the win strategy is blind (cycle objects, scare, release).
// An end before ~295 s means every investigator fled (a win); an end at ~300 s is dawn,
// which can be either outcome. Look at <mode>-4-end.png to read the result.
//
// Output: docs/day7-playtest/<mode>-*.png and <mode>-log.json. Exit 0 on success.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

// Mirrors src/core/balance.ts (NIGHT.durationSeconds, OBJECT_POSITIONS). Keep in sync by hand.
const NIGHT_SECONDS = 300;
const OBJECTS = [
  { x: 600, y: 240 }, // chandelier
  { x: 200, y: 260 }, // piano
  { x: 480, y: 80 }, // mirror
  { x: 280, y: 460 }, // painting
];

const mode = process.argv[2] ?? "win";
if (!["win", "lose"].includes(mode)) throw new Error("usage: node scripts/playtest-prod.mjs [win|lose] [url]");
const url = process.argv[3] ?? "http://localhost:4173/haunt/";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "day7-playtest");
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = { mode, url, events: [], signatures: [], errors: [], warnings: [], failedRequests: [], badResponses: [], screenshots: [] };
let t0 = Date.now();
const wall = () => Math.round((Date.now() - t0) / 1000);
const note = (msg, extra = {}) => {
  log.events.push({ wall: wall(), msg, ...extra });
  console.log(`[${mode}] ${wall()}s ${msg}`, Object.keys(extra).length ? JSON.stringify(extra) : "");
};

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
log.browser = browser.version();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("console", (m) => {
  // Warnings (e.g. SwiftShader "GPU stall due to ReadPixels") are recorded but do not fail the run.
  if (m.type() === "error") log.errors.push(`error: ${m.text()}`);
  else if (m.type() === "warning") log.warnings.push(m.text());
});
page.on("pageerror", (e) => log.errors.push(`pageerror: ${e.message}`));
page.on("requestfailed", (r) => log.failedRequests.push(`${r.url()} ${r.failure()?.errorText}`));
page.on("response", (r) => {
  if (r.status() >= 400) log.badResponses.push(`${r.status()} ${r.url()}`);
});

const shot = async (name) => {
  const file = `${mode}-${name}.png`;
  await page.screenshot({ path: join(outDir, file) });
  log.screenshots.push(file);
};

/** Coarse 8x6 RGB signature of the page screenshot (or a clip of it), computed in the page. */
async function signature(clip) {
  const b64 = (await page.screenshot(clip ? { clip } : {})).toString("base64");
  return page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const c = new OffscreenCanvas(8, 6);
    const ctx = c.getContext("2d");
    ctx.drawImage(bmp, 0, 0, 8, 6);
    return Array.from(ctx.getImageData(0, 0, 8, 6).data).filter((_, i) => i % 4 !== 3);
  }, b64);
}
const diff = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
const round1 = (n) => Math.round(n * 10) / 10;

async function canvasRect() {
  return page.evaluate(() => {
    const r = document.querySelector("canvas")?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
  });
}
/** Click a point in the 960x740 game space with the real mouse. */
async function clickGame(p) {
  const r = await canvasRect();
  await page.mouse.click(r.x + (p.x / 960) * r.w, r.y + (p.y / 740) * r.h);
}

const resp = await page.goto(url, { waitUntil: "load" });
note("page loaded", { status: resp?.status() });
await page.waitForSelector("canvas", { timeout: 30000 });
await sleep(2500);
t0 = Date.now();
const titleSig = await signature();
await shot("1-title");
const canvas = await canvasRect();
note("title rendered", { canvas });

await page.mouse.click(640, 400);
await sleep(3000);
const nightSig = await signature();
const startDiff = diff(titleSig, nightSig);
note("clicked title", { diff: round1(startDiff) });
const nightStart = Date.now();

const nightMs = NIGHT_SECONDS * 1000;
// End-screen detection: the HUD button strip (Mute / Scare / Release, game-space
// x 630-950, y 676-712) is static during the night and absent on the End screen.
// Scare flashes and camera shake are brief, so two consecutive large changes in that
// strip mean "End screen is up". Input stops there, because the End screen restarts
// on any click, Enter, R or Esc.
const END_DIFF = 12;
const hudClip = (() => {
  const g = (x, y) => ({ x: canvas.x + (x / 960) * canvas.w, y: canvas.y + (y / 740) * canvas.h });
  const a = g(630, 676);
  const b = g(950, 712);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
})();
const hudNight = await signature(hudClip);
let hits = 0;
const wallLimitMs = nightMs + 60000;
let midShot = false;
let lastSigAt = 0;
let step = 0;
let endSig = null;
let endSeenAt = null;

while (Date.now() - nightStart < wallLimitMs) {
  const elapsed = Date.now() - nightStart;
  const d = diff(hudNight, await signature(hudClip));
  if (elapsed - lastSigAt >= 30000) {
    lastSigAt = elapsed;
    log.signatures.push({ at: Math.round(elapsed / 1000), hudDiff: round1(d) });
  }
  hits = d > END_DIFF ? hits + 1 : 0;
  if (hits >= 2) {
    endSeenAt = Math.round(elapsed / 1000);
    break;
  }
  if (d > END_DIFF) {
    await sleep(300);
    continue;
  }
  if (!midShot && elapsed >= nightMs / 2) {
    midShot = true;
    await shot("2-mid-night");
    note("mid-night screenshot");
  }
  if (mode === "win") {
    // Blind strategy: hop to the next object, scare a few times, release every third hop.
    const o = OBJECTS[step++ % OBJECTS.length];
    await clickGame(o);
    await sleep(400);
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Space");
      await sleep(350);
    }
    if (step % 3 === 0) await page.keyboard.press("r");
  } else {
    await sleep(1000);
  }
}
await sleep(1500);
await shot("4-end");
endSig = await signature();
const endDiff = diff(nightSig, endSig);
note("end screen", { detected: endSeenAt !== null, endSeenAtSeconds: endSeenAt, earlyEnd: endSeenAt !== null && endSeenAt < NIGHT_SECONDS - 5, diffFromNightStart: round1(endDiff) });

// Restart with a real key press (any of Enter/R/Esc/click restarts either End screen).
await page.keyboard.press(mode === "win" ? "Enter" : "r");
await sleep(3500);
await shot("5-restart");
const restartSig = await signature();
const restartDiff = diff(endSig, restartSig);
const restartHudDiff = diff(hudNight, await signature(hudClip));
note("restart attempted", { diffFromEnd: round1(restartDiff), hudDiffFromNight: round1(restartHudDiff) });

log.result = {
  titleRendered: !!canvas && titleSig.some((v) => v > 20),
  startChangedScreen: startDiff > 3,
  endScreenDetected: endSeenAt !== null,
  endSeenAtSeconds: endSeenAt,
  restartChangedScreen: restartDiff > END_DIFF,
  restartHudBack: restartHudDiff < END_DIFF,
  wallSeconds: wall(),
};
log.result.clean = log.errors.length === 0 && log.failedRequests.length === 0 && log.badResponses.length === 0;
writeFileSync(join(outDir, `${mode}-log.json`), JSON.stringify(log, null, 1) + "\n");
await browser.close();
console.log(`[${mode}] result`, JSON.stringify(log.result));
if (!log.result.clean) console.log(`[${mode}] problems`, JSON.stringify({ errors: log.errors, failed: log.failedRequests, bad: log.badResponses }));
const r = log.result;
process.exit(r.clean && r.titleRendered && r.startChangedScreen && r.endScreenDetected && r.restartChangedScreen && r.restartHudBack ? 0 : 1);
