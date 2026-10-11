// Сглобява game.js от src/*, после index.html (за GitHub Pages, с инсталиране като приложение) и artifact.html (за линк в claude.ai)
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const r = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const w = (p, s) => writeFileSync(new URL(p, import.meta.url), s);
const parts = ['core', 'pose', 'chars', 'world', 'scenes', 'loop'];
const js = parts.map(p => r(`./src/${p}.js`)).join('\n');
w('./game.js', js);
const page = r('./shell.html').replace('/*GAME*/', () => '\n' + js);
w('./artifact.html', page);
const head = [
  '<!doctype html>', '<html lang="bg">', '<head>', '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
  '<meta name="description" content="Фен beat \'em up с костенурките нинджи – играй в браузъра на телефона.">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="icon" type="image/png" href="icon-192.png">',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="Костенурките">'
].join('\n') + '\n';
// офлайн режим: работи само през https (GitHub Pages), не и при отваряне на файла директно
const sw = "<script>if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));</script>\n";
const index = head + page + sw + '</html>\n';
w('./index.html', index);
const ver = createHash('sha1').update(index).digest('hex').slice(0, 10);
w('./sw.js', r('./src/sw.js').replace('__VERSION__', ver));
console.log('ok', page.length, 'sw', ver);
