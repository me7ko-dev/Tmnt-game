// Общ помощник за тестовете: намира Playwright (локален или глобален), браузър и пътя до index.html.
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
let pw;
try { pw = await import('playwright'); }
catch (e) { const root = execSync('npm root -g').toString().trim(); pw = await import(pathToFileURL(join(root, 'playwright', 'index.mjs')).href); }
export const chromium = pw.chromium;
export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const PAGE = pathToFileURL(join(ROOT, 'index.html')).href;
export const SHOTS = join(ROOT, 'shots');
mkdirSync(SHOTS, { recursive: true });
// PW_CHROME=път до браузър; иначе пробва вградения Chromium, после инсталирания Chrome и Edge
export async function launch() {
  if (process.env.PW_CHROME) return chromium.launch({ executablePath: process.env.PW_CHROME });
  for (const o of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) { try { return await chromium.launch(o); } catch (e) { } }
  throw new Error('Няма браузър за Playwright');
}
