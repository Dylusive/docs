// Deterministic renderer: headless Chromium draws frame f, we pull the PNG, ffmpeg encodes.
// Because every frame is a pure function of f, the film is split into chunks rendered in parallel.
//   node render.mjs stills              -> qa/sceneN_fXXXX.png (one still from the middle of every scene)
//   node render.mjs frames 630,631      -> qa/f0630.png ...
//   node render.mjs video [workers]     -> build/picture.mp4 ; then `node audio/score.mjs` and mux -> THE_NEW.mp4
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.json': 'application/json' };

export function serve(port = 0) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(port, () => res(srv));
  });
}

async function openPage(url) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.THE_NEW && window.THE_NEW.ready, null, { timeout: 120000 });
  return { browser, page };
}
const grab = async (page, f) => Buffer.from((await page.evaluate((f) => window.THE_NEW.frameDataURL(f), f)).split(',')[1], 'base64');

const mode = process.argv[2] || 'stills';
const srv = await serve();
const url = `http://localhost:${srv.address().port}/index.html`;

if (mode === 'stills' || mode === 'frames') {
  const SCENES = [[1, 4], [2, 12.5], [3, 22.6], [4, 29.5], [5, 37.5], [6, 47.0]];
  const list = mode === 'stills' ? SCENES.map(([n, s]) => ({ f: Math.round(s * 30), name: `scene${n}_f${String(Math.round(s * 30)).padStart(4, '0')}.png` }))
    : process.argv[3].split(',').map((x) => ({ f: +x, name: `f${x.padStart(4, '0')}.png` }));
  const { browser, page } = await openPage(url);
  fs.mkdirSync(path.join(ROOT, 'qa'), { recursive: true });
  for (const { f, name } of list) { const t0 = Date.now(); fs.writeFileSync(path.join(ROOT, 'qa', name), await grab(page, f)); console.log(name, `${Date.now() - t0}ms`); }
  await browser.close();
} else if (mode === 'video') {
  const workers = +(process.argv[3] || 3), FR = 1440, per = Math.ceil(FR / workers);
  fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
  const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = w * per, b = Math.min(FR, a + per), out = path.join(ROOT, 'build', `chunk${w}.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const { browser, page } = await openPage(url);
    for (let f = a; f < b; f++) {
      const png = await grab(page, f);
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
      if ((f - a) % 30 === 0) console.log(`worker ${w}: frame ${f} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await browser.close();
  }));
  const list = Array.from({ length: workers }, (_, w) => `file 'chunk${w}.mp4'`).join('\n');
  fs.writeFileSync(path.join(ROOT, 'build', 'chunks.txt'), list);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(ROOT, 'build', 'chunks.txt'), '-c', 'copy', path.join(ROOT, 'build', 'picture.mp4')]);
  console.log(`picture done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
srv.close();
