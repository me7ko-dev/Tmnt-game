// Сглобява index.html (за GitHub Pages) и artifact.html (за линк в claude.ai) от shell.html + game.js
import { readFileSync, writeFileSync } from 'node:fs';
const shell = readFileSync(new URL('./shell.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('./game.js', import.meta.url), 'utf8');
const page = shell.replace('/*GAME*/', () => '\n' + js);
writeFileSync(new URL('./artifact.html', import.meta.url), page);
writeFileSync(new URL('./index.html', import.meta.url),
  '<!doctype html>\n<html lang="bg">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n' + page + '</html>\n');
console.log('ok', page.length);
