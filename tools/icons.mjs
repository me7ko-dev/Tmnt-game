// Иконите на приложението: node tools/icons.mjs → icon-192.png, icon-512.png, apple-touch-icon.png
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, PAGE, ROOT } from './pw.mjs';
const b = await launch();
const pg = await b.newPage();
await pg.goto(PAGE); await pg.waitForTimeout(800);
for (const [f, n, pad] of [['icon-192.png', 192, 0.8], ['icon-512.png', 512, 0.8], ['apple-touch-icon.png', 180, 0.92]]) {
  const url = await pg.evaluate(([n, pad]) => window.__dbg.makeIcon(n, pad), [n, pad]);
  writeFileSync(join(ROOT, f), Buffer.from(url.split(',')[1], 'base64'));
  console.log(f);
}
await b.close();
