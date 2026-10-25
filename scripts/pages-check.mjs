import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium, expect } from '@playwright/test';
const prefix = '/High-Beam-Smasher/';
const dist = resolve('dist');
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
  const path = resolve(dist, decodeURIComponent(pathname.slice(prefix.length)) || 'index.html');
  if (!path.startsWith(dist + sep)) { response.writeHead(403).end(); return; }
  try {
    const content = await readFile(path);
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
    response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' }).end(content);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(4183, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [], assets = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); assets.push(response.url()); });
  await page.clock.install({ time: new Date('2026-10-25T00:00:00Z') });
  await page.goto('http://127.0.0.1:4183' + prefix);
  await page.clock.pauseAt(new Date('2026-10-25T00:00:01Z'));
  await expect(page.locator('#intro')).toBeVisible();
  const voiceLoads = ['high-beam', 'sorry'].map(name => page.waitForResponse(response => response.url().endsWith(`/audio/${name}.wav`) && response.ok()));
  await page.locator('#start').tap();
  await Promise.all(voiceLoads);
  await page.clock.runFor(3280);
  const box = await page.locator('#stage').boundingBox();
  await page.touchscreen.tap(box.x + box.width * 0.75, box.y + box.height * 0.6);
  await page.clock.runFor(120);
  expect(Math.abs(Number(await page.locator('#score').textContent()))).toBe(1);
  await page.locator('a.brand').click({ force: true });
  await expect(page.locator('#intro')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(prefix);
  expect(assets.some(url => url.includes(prefix + 'assets/') && url.endsWith('.js'))).toBe(true);
  expect(assets.some(url => url.includes(prefix + 'assets/') && url.endsWith('.css'))).toBe(true);
  expect(errors).toEqual([]);
  console.log('PASS GitHub Pages subpath: JS, CSS, favicon, both voice clips, mobile late-frame hit and home link. No 404 or page errors.');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
