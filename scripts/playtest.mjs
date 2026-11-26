// Real-time playtest in headless Chromium, driven with real mouse and keyboard input.
//
//   node scripts/playtest.mjs win    # play a full night as the ghost, then restart
//   node scripts/playtest.mjs lose   # do nothing until dawn, then restart
//
// Starts its own Vite dev server, reads game state through the read-only
// `window.__haunt` handle (only exposed with ?debug) and writes screenshots and
// a JSON log into docs/day4-playtest/. Exits 0 when the expected sequence
// (title -> night -> end screen -> restart -> second night) completed without
// uncaught page errors.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const mode = process.argv[2] ?? "win";
if (!["win", "lose"].includes(mode)) throw new Error("usage: node scripts/playtest.mjs [win|lose]");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "day4-playtest");
mkdirSync(outDir, { recursive: true });
const port = mode === "win" ? 5181 : 5182;
const url = `http://localhost:${port}/?debug`;
const POLL_MS = 200;
const wallLimitMs = 25 * 60 * 1000;

const vite = spawn(process.execPath, [join(root, "node_modules", "vite", "bin", "vite.js"), "--port", String(port), "--strictPort"], {
  cwd: root,
  stdio: "ignore",
});
const stopVite = () => vite.kill();
process.on("exit", stopVite);

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("vite did not start");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = { mode, events: [], samples: [], errors: [], screenshots: [] };
const note = (msg, extra = {}) => {
  log.events.push({ wall: Math.round((Date.now() - t0) / 1000), msg, ...extra });
  console.log(`[${mode}] ${msg}`, Object.keys(extra).length ? JSON.stringify(extra) : "");
};
let t0 = Date.now();

await waitForServer();
const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
log.browser = browser.version();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type())) log.errors.push(`${m.type()}: ${m.text()}`);
});
page.on("pageerror", (e) => log.errors.push(`pageerror: ${e.message}`));

const shot = async (name) => {
  const file = `${mode}-${name}.png`;
  await page.screenshot({ path: join(outDir, file) });
  log.screenshots.push(file);
};

/** Read-only snapshot of the running game. */
const read = () =>
  page.evaluate(() => {
    const game = window.__haunt;
    const active = game.scene.getScenes(true).map((s) => s.scene.key);
    const m = game.scene.getScene("Mansion");
    const base = { active };
    if (!active.includes("Mansion")) return base;
    return {
      ...base,
      now: m.now,
      timeLeft: m.timer.timeLeft,
      ghost: m.ghost,
      actors: m.actors.map((a) => ({ kind: a.agent.kind, pos: a.pos, sanity: a.agent.core.sanity, state: a.agent.core.gone ? "gone" : a.agent.core.sanity <= 0 ? "fleeing" : a.agent.core.sanity <= 35 ? "panicked" : a.agent.core.sanity <= 70 ? "rattled" : "investigate" })),
    };
  });

const canvasRect = () => page.evaluate(() => {
  const r = document.querySelector("canvas").getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
/** Click a game-space point with the real mouse. */
const clickGame = async (p) => {
  const r = await canvasRect();
  await page.mouse.click(r.x + (p.x / 960) * r.w, r.y + (p.y / 740) * r.h);
};

await page.goto(url);
await page.waitForFunction(() => window.__haunt?.scene.getScenes(true).some((s) => s.scene.key === "Title"), null, { timeout: 30000 });
t0 = Date.now();
await sleep(500);
await shot("1-title");
note("title shown");

const cfg = await page.evaluate(async () => {
  const b = await import("/src/core/balance.ts");
  return { objects: b.SCARE_OBJECTS, pos: b.OBJECT_POSITIONS, radius: b.SCARE_RADIUS_PX, ghost: b.GHOST };
});

// Start with a real click on the title screen.
await page.mouse.click(640, 400);
await page.waitForFunction(() => window.__haunt.scene.getScenes(true).some((s) => s.scene.key === "Mansion"), null, { timeout: 10000 });
note("night started via click");
await sleep(300);

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const alive = (s) => s.actors.filter((a) => a.state !== "gone");
const isReady = (s, o) => (s.ghost.cooldowns[o.id] ?? 0) <= s.now;

/** Exercise WASD and mouse drift once so those inputs are covered. */
async function inputSmokeTest() {
  const before = (await read()).ghost.pos;
  await page.keyboard.down("d");
  await sleep(400);
  await page.keyboard.up("d");
  const afterKey = (await read()).ghost.pos;
  await clickGame({ x: 500, y: 150 });
  await sleep(600);
  const afterMouse = (await read()).ghost.pos;
  note("input smoke test", { before, afterKey, afterMouse, wasdMoved: afterKey.x > before.x, mouseMoved: dist(afterKey, afterMouse) > 10 });
}

let shotMid = false;
let shotFlee = false;
let lastSample = -1;
let lastAction = "";
let result = null;
let lastTimeLeft = null;

async function playOneStep(s) {
  const living = alive(s);
  const score = (o) => living.filter((a) => dist(a.pos, cfg.pos[o.id]) <= cfg.radius[o.radius]).length;
  const usable = (o) => isReady(s, o) && s.ghost.ectoplasm >= o.cost;
  const cur = s.ghost.possessed ? cfg.objects.find((o) => o.id === s.ghost.possessed) : null;

  if (cur && usable(cur) && score(cur) > 0) {
    await page.keyboard.press("Space");
    lastAction = `scare ${cur.id}`;
    return;
  }
  // Pick the best usable object elsewhere, preferring more targets and then cheaper cost.
  const candidates = cfg.objects
    .filter((o) => o.id !== cur?.id && usable(o) && score(o) > 0)
    .sort((a, b) => score(b) - score(a) || a.cost - b.cost);
  if (candidates.length) {
    await clickGame(cfg.pos[candidates[0].id]);
    lastAction = `go ${candidates[0].id}`;
    return;
  }
  // Nothing usable: release so ectoplasm regenerates, and drift toward the nearest living investigator's object.
  if (cur) {
    await page.keyboard.press("r");
    lastAction = "release (regen)";
  }
}

if (mode === "win") await inputSmokeTest();

while (Date.now() - t0 < wallLimitMs) {
  const s = await read();
  if (s.active.includes("End")) break;
  if (!s.active.includes("Mansion")) {
    await sleep(POLL_MS);
    continue;
  }
  lastTimeLeft = s.timeLeft;
  const secs = Math.floor(s.timeLeft);
  if (secs % 10 === 0 && secs !== lastSample) {
    lastSample = secs;
    log.samples.push({
      timeLeft: secs,
      wall: Math.round((Date.now() - t0) / 1000),
      ecto: Math.round(s.ghost.ectoplasm),
      possessed: s.ghost.possessed,
      actors: s.actors.map((a) => `${a.kind}:${Math.round(a.sanity)}:${a.state}`),
    });
    console.log(`[${mode}] t-${secs}s ecto=${Math.round(s.ghost.ectoplasm)} ${log.samples.at(-1).actors.join(" ")} ${lastAction}`);
  }
  if (!shotMid && s.timeLeft <= 150) {
    shotMid = true;
    await shot("2-mid-night");
    note("mid-night shot", { timeLeft: s.timeLeft });
  }
  if (!shotFlee && s.actors.some((a) => a.state === "fleeing")) {
    shotFlee = true;
    await shot("3-flee");
    note("first investigator fleeing", { timeLeft: s.timeLeft, who: s.actors.filter((a) => a.state === "fleeing").map((a) => a.kind) });
  }
  for (const a of s.actors) {
    log.firstSeen ??= {};
    const key = `${a.kind}:${a.state}`;
    if (!log.firstSeen[key]) {
      log.firstSeen[key] = Math.round(s.timeLeft * 10) / 10;
    }
  }
  if (mode === "win") await playOneStep(s);
  await sleep(POLL_MS);
}

// End screen.
await sleep(600);
const endState = await page.evaluate(() => {
  const g = window.__haunt;
  const end = g.scene.getScene("End");
  return { active: g.scene.getScenes(true).map((s) => s.scene.key), outcome: end.outcome };
});
if (!endState.active.includes("End")) {
  log.errors.push("pageerror-like: End scene never appeared within the wall-clock limit");
} else {
  const last = log.samples.at(-1);
  result = { outcome: endState.outcome, lastTimeLeftSeen: Math.round(lastTimeLeft * 10) / 10, lastSample: last, wallSeconds: Math.round((Date.now() - t0) / 1000) };
  note("end screen", result);
  await shot("4-end");

  // Restart with a real key (win) or click (lose).
  if (mode === "win") await page.keyboard.press("Enter");
  else await page.mouse.click(640, 400);
  await page.waitForFunction(() => window.__haunt.scene.getScenes(true).some((s) => s.scene.key === "Mansion"), null, { timeout: 10000 });
  await sleep(2500);
  const again = await read();
  result.restart = { timeLeft: again.timeLeft, actors: again.actors.map((a) => `${a.kind}:${Math.round(a.sanity)}:${a.state}`), ecto: again.ghost.ectoplasm };
  note("second night started", result.restart);
  await shot("5-restart");
}

log.result = result;
writeFileSync(join(outDir, `${mode}-log.json`), JSON.stringify(log, null, 1) + "\n");
await browser.close();
stopVite();
console.log(`[${mode}] errors:`, log.errors.length ? log.errors : "none");
const ok = result !== null && result.restart && log.errors.filter((e) => e.startsWith("pageerror")).length === 0;
process.exit(ok ? 0 : 1);
