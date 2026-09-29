// Сглобява game.js от src/*, после index.html (за GitHub Pages) и artifact.html (за линк в claude.ai)
import { readFileSync, writeFileSync } from 'node:fs';
const r = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const parts = ['core', 'pose', 'chars', 'world', 'scenes', 'loop'];
const js = parts.map(p => r(`./src/${p}.js`)).join('\n');
writeFileSync(new URL('./game.js', import.meta.url), js);
const page = r('./shell.html').replace('/*GAME*/', () => '\n' + js);
writeFileSync(new URL('./artifact.html', import.meta.url), page);
writeFileSync(new URL('./index.html', import.meta.url),
  '<!doctype html>\n<html lang="bg">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n' + page + '</html>\n');
console.log('ok', page.length);
