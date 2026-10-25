import { chromium, expect } from '@playwright/test';
import ts from 'typescript';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Exercise the built app, with time controlled from the browser rather than
// adding a debug API or bypassing the actual keyboard and DOM integration.
const seed = 73;
function seeded(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const source = await readFile(new URL('../src/game/rules.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { createSchedule, scoreDelta } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const schedule = createSchedule(seeded(seed));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const root = 'http://127.0.0.1:4173/';
let browser;
const checks = [];
const errors = [];
const record = text => { checks.push(text); console.log(`PASS ${text}`); };
await mkdir('docs/screenshots', { recursive: true });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(`Preview server failed: ${serverOutput}`);
    try { ready = (await fetch(root)).ok; } catch { /* startup */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Preview server did not start');
  const channel = process.env.BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined);
  browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.addInitScript(({ seed }) => {
    let value = seed;
    Math.random = () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
    const NativeAudioContext = window.AudioContext;
    window.__audioQA = { contexts: [], tones: 0, noise: 0, decoded: [], voices: [], voiceStops: 0 };
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) { super(...args); window.__audioQA.contexts.push(this); }
      createOscillator() { window.__audioQA.tones++; return super.createOscillator(); }
      async decodeAudioData(data) {
        const buffer = await super.decodeAudioData(data);
        window.__audioQA.decoded.push(buffer.duration);
        return buffer;
      }
      createBufferSource() {
        window.__audioQA.noise++;
        const source = super.createBufferSource();
        const start = source.start.bind(source), stop = source.stop.bind(source);
        source.start = (...args) => {
          if (source.buffer?.duration > 0.5) window.__audioQA.voices.push(source.buffer.duration);
          start(...args);
        };
        source.stop = (...args) => {
          if (source.buffer?.duration > 0.5) window.__audioQA.voiceStops++;
          stop(...args);
        };
        return source;
      }
    };
  }, { seed });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.clock.install({ time: new Date('2026-10-25T00:00:00Z') });
  await page.goto(root);
  await page.clock.pauseAt(new Date('2026-10-25T00:00:01Z'));
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#intro')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/ready.png', fullPage: true });
  record('Ready screen waits for explicit start; Traditional Chinese controls render');
  await page.locator('#start').click({ force: true });
  await expect.poll(() => page.evaluate(() => window.__audioQA.decoded.length)).toBe(2);
  let origin = await page.evaluate(() => performance.now());
  const go = async seconds => {
    const now = await page.evaluate(() => performance.now());
    const distance = origin + seconds * 1000 - now;
    if (distance < -2) throw new Error(`Clock moved beyond requested ${seconds}s by ${-distance}ms`);
    if (distance > 0) await page.clock.runFor(distance);
  };
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'playing');
  await expect(page.locator('#score')).toHaveText('0');
  let expected = 0;
  let capturedHigh = false, capturedWrong = false;
  for (let index = 0; index < schedule.length; index++) {
    const vehicle = schedule[index];
    const attackAt = index === 22 ? 24.9 : vehicle.spawn + 2.54;
    await go(attackAt);
    if (!capturedHigh && vehicle.light === 'high') {
      await page.screenshot({ path: 'docs/screenshots/glare.png', fullPage: true });
    }
    if (!capturedWrong && vehicle.light === 'normal') {
      await page.screenshot({ path: 'docs/screenshots/normal-light.png', fullPage: true });
    }
    await page.keyboard.down('Space');
    if (index === 22) await page.clock.fastForward(150);
    else await page.clock.runFor(95);
    await page.keyboard.up('Space');
    const contact = attackAt + 0.08;
    expected += scoreDelta(vehicle.light, contact);
    await expect(page.locator('#score')).toHaveText(String(expected));
    await expect(page.locator('#hit-toast')).toContainText(vehicle.light === 'high' ? '漂亮一擊' : '一般大燈');
    if (!capturedHigh && vehicle.light === 'high') {
      await page.screenshot({ path: 'docs/screenshots/smash.png', fullPage: true });
      capturedHigh = true;
    }
    if (!capturedWrong && vehicle.light === 'normal') {
      await page.screenshot({ path: 'docs/screenshots/wrong-light.png', fullPage: true });
      capturedWrong = true;
    }
    if (index === 23) {
      await expect(page.locator('#stage')).toHaveAttribute('data-phase', 'frenzy');
      await page.screenshot({ path: 'docs/screenshots/final-five.png', fullPage: true });
      await page.setViewportSize({ width: 1024, height: 900 });
      await page.screenshot({ path: 'docs/screenshots/desktop-1024.png', fullPage: true });
      const sizes = await page.locator('#world').evaluate(canvas => ({ width: canvas.width, height: canvas.height, rect: canvas.getBoundingClientRect().toJSON() }));
      expect(sizes.width).toBe(480); expect(sizes.height).toBe(270);
      expect(sizes.rect.width / sizes.rect.height).toBeCloseTo(16 / 9, 2);
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
  }
  record('All 30 real keyboard contacts match ordinary and double scoring, including errors');
  record('Low-frame-rate update crosses 25s without changing the actual pre-boundary hit score');
  record('Live resize to 1024 preserves 16:9, 480×270 coordinates and subsequent hit timing');
  await go(29.9);
  await page.clock.fastForward(600);
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'results');
  await expect(page.locator('#final-score')).toHaveText(String(expected));
  await expect(page.locator('#correct-count')).toHaveText('20 / 20');
  await expect(page.locator('#wrong-count')).toHaveText('10');
  const audio = await page.evaluate(() => ({ tones: window.__audioQA.tones, noise: window.__audioQA.noise, voices: window.__audioQA.voices, voiceStops: window.__audioQA.voiceStops, states: window.__audioQA.contexts.map(c => c.state) }));
  expect(audio.states).toContain('running');
  expect(audio.tones).toBeGreaterThan(60);
  expect(audio.noise).toBeGreaterThanOrEqual(60);
  record('Unlocked AudioContext runs and generates strike, glass, swing and final-phase sources');
  expect(audio.voices).toHaveLength(30);
  expect(new Set(audio.voices).size).toBe(2);
  expect(audio.voiceStops).toBeGreaterThan(0);
  record('All 30 hits play bundled speech reactions; two distinct clips load and stale speech is stopped');
  await page.screenshot({ path: 'docs/screenshots/results.png', fullPage: true });
  record('Crossing 30s settles once: 20 high beams and 10 ordinary lights, no duplicate scoring');

  await page.locator('#restart').click({ force: true });
  origin = await page.evaluate(() => performance.now());
  await expect(page.locator('#score')).toHaveText('0');
  await expect(page.locator('#time')).toHaveText('30');
  await expect(page.locator('#hit-toast')).not.toHaveClass(/visible/);
  await page.keyboard.down('Space');
  await go(4);
  await page.keyboard.down('Space');
  await go(6);
  await expect(page.locator('#score')).toHaveText('0');
  await page.keyboard.up('Space');
  // The initial empty swing must not repeat as subsequent cars enter range.
  record('Restart clears scores/effects; holding Space and keyboard repeats never auto-attack');
  const scroll = await page.evaluate(() => scrollY);
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await page.evaluate(() => { window.dispatchEvent(new Event('blur')); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(31_000);
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'results');
  record('Space does not scroll; blur/visibility handlers and a long time jump still reach results');
  await page.locator('#restart').click({ force: true });
  await page.clock.fastForward(31_000);
  await expect(page.locator('#final-score')).toHaveText('0');
  await expect(page.locator('#correct-count')).toHaveText('0 / 20');
  await expect(page.locator('#wrong-count')).toHaveText('0');
  record('A further untouched round completes with zero penalties and no stale hits');

  const silent = await context.newPage();
  silent.on('pageerror', error => errors.push(error.message));
  await silent.addInitScript(() => { window.AudioContext = class { constructor() { throw new Error('Audio unavailable for QA'); } }; });
  await silent.clock.install({ time: new Date('2026-10-25T01:00:00Z') });
  await silent.goto(root);
  await silent.clock.pauseAt(new Date('2026-10-25T01:00:01Z'));
  await silent.locator('#start').click({ force: true });
  await silent.clock.runFor(2900);
  await silent.keyboard.press('Space');
  await silent.clock.runFor(150);
  await expect(silent.locator('#score')).toHaveText(String(scoreDelta(schedule[0].light, 2.98)));
  await silent.locator('#sound').click({ force: true });
  await expect(silent.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
  await silent.clock.fastForward(31_000);
  await expect(silent.locator('#stage')).toHaveAttribute('data-state', 'results');
  record('Unavailable AudioContext still permits real hits, mute control and a completed round');
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await mobileContext.addInitScript(({ seed }) => {
    let value = seed;
    Math.random = () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
  }, { seed });
  const mobile = await mobileContext.newPage();
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.clock.install({ time: new Date('2026-10-25T02:00:00Z') });
  await mobile.goto(root);
  await mobile.clock.pauseAt(new Date('2026-10-25T02:00:01Z'));
  expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mobile.screenshot({ path: 'docs/screenshots/mobile-ready.png', fullPage: true });
  await mobile.locator('#start').tap();
  const mobileOrigin = await mobile.evaluate(() => performance.now());
  let mobileScore = 0;
  for (let i = 0; i < schedule.length; i++) {
    const attackAt = schedule[i].spawn + 2.54;
    const now = await mobile.evaluate(() => performance.now());
    await mobile.clock.runFor(mobileOrigin + attackAt * 1000 - now);
    if (i % 2 === 0) {
      const box = await mobile.locator('#stage').boundingBox();
      await mobile.touchscreen.tap(box.x + box.width * 0.75, box.y + box.height * 0.6);
    } else await mobile.locator('#attack').tap();
    await mobile.clock.runFor(100);
    mobileScore += scoreDelta(schedule[i].light, attackAt + 0.08);
    await expect(mobile.locator('#score')).toHaveText(String(mobileScore));
    if (i === 2) {
      await mobile.screenshot({ path: 'docs/screenshots/mobile-playing.png', fullPage: true });
      await mobile.setViewportSize({ width: 844, height: 390 });
      await mobile.screenshot({ path: 'docs/screenshots/mobile-landscape.png', fullPage: true });
      expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await mobile.setViewportSize({ width: 390, height: 844 });
    }
  }
  await mobile.clock.fastForward(1000);
  await expect(mobile.locator('#final-score')).toHaveText(String(mobileScore));
  await expect(mobile.locator('#correct-count')).toHaveText('20 / 20');
  await expect(mobile.locator('#wrong-count')).toHaveText('10');
  await mobile.locator('#restart').tap();
  await expect(mobile.locator('#score')).toHaveText('0');
  record('Mobile touch completes all 30 hits via screen and attack button, survives rotation and replays');

  const mouseContext = await browser.newContext();
  const mouse = await mouseContext.newPage();
  mouse.on('pageerror', error => errors.push(error.message));
  await mouse.clock.install({ time: new Date('2026-10-25T03:00:00Z') });
  await mouse.goto(root);
  await mouse.clock.pauseAt(new Date('2026-10-25T03:00:01Z'));
  await mouse.locator('#start').click({ force: true });
  await mouse.clock.runFor(2840);
  const mouseBox = await mouse.locator('#stage').boundingBox();
  await mouse.mouse.move(mouseBox.x + mouseBox.width * 0.75, mouseBox.y + mouseBox.height * 0.6);
  await mouse.mouse.click(mouseBox.x + mouseBox.width * 0.75, mouseBox.y + mouseBox.height * 0.6, { button: 'right' });
  await mouse.clock.runFor(50);
  await expect(mouse.locator('#hit-toast')).not.toHaveClass(/visible/);
  await mouse.keyboard.press('Escape');
  await mouse.mouse.down();
  await mouse.clock.runFor(110);
  await expect(mouse.locator('#hit-toast')).toHaveClass(/visible/);
  const heldScore = await mouse.locator('#score').textContent();
  await mouse.clock.runFor(3000);
  await expect(mouse.locator('#score')).toHaveText(heldScore);
  await mouse.mouse.up();
  record('Only left mouse press attacks; right click and holding the button do not auto-swing');
  const lateContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const late = await lateContext.newPage();
  late.on('pageerror', error => errors.push(error.message));
  await late.clock.install({ time: new Date('2026-10-25T04:00:00Z') });
  await late.goto(root);
  await late.clock.pauseAt(new Date('2026-10-25T04:00:01Z'));
  await late.locator('#start').tap();
  await late.clock.runFor(3280);
  const redPixels = async () => late.locator('#world').evaluate(canvas => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 200 && data[i + 1] < 100 && data[i + 2] < 100) count++;
    return count;
  });
  expect(await redPixels()).toBeGreaterThan(100);
  await late.screenshot({ path: 'docs/screenshots/late-red-frame.png', fullPage: true });
  const lateBox = await late.locator('#stage').boundingBox();
  await late.touchscreen.tap(lateBox.x + lateBox.width * 0.75, lateBox.y + lateBox.height * 0.6);
  await late.clock.runFor(120);
  expect(Math.abs(Number(await late.locator('#score').textContent()))).toBe(1);
  expect(await redPixels()).toBe(0);
  await expect(late.locator('#attack')).toBeDisabled();
  await expect(late.locator('#attack')).toHaveText('揮棒回位中…');
  await late.screenshot({ path: 'docs/screenshots/late-red-hit.png', fullPage: true });
  await late.clock.runFor(300);
  await expect(late.locator('#attack')).toBeEnabled();
  record('Touch in the last 20ms of a visible red frame hits after windup; recovery hides the cue and disables attack');
  // Playwright's clock is context-wide. Real-time smoke needs a fresh context.
  const liveContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const live = await liveContext.newPage();
  live.on('pageerror', error => errors.push(error.message));
  await live.goto(root);
  const wallStart = performance.now();
  await live.locator('#start').click();
  await expect(live.locator('#stage')).toHaveAttribute('data-state', 'results', { timeout: 33_000 });
  const wallSeconds = (performance.now() - wallStart) / 1000;
  expect(wallSeconds).toBeGreaterThanOrEqual(29.9);
  expect(wallSeconds).toBeLessThan(33);
  await expect(live.locator('#final-score')).toHaveText('0');
  record(`Unmodified real-time clock completes a full no-input round in ${wallSeconds.toFixed(2)}s`);
  expect(errors).toEqual([]);
  record('No browser exceptions or console errors');
  await writeFile('docs/browser-results.json', JSON.stringify({ date: '2026-10-25', browser: await browser.version(), channel: channel ?? 'chromium', production: true, checks, errors }, null, 2) + '\n');
  console.log(`\n${checks.length} browser integration checks passed.`);
} finally {
  if (browser) await browser.close();
  if (server.exitCode === null) { server.kill(); await once(server, 'exit'); }
}
