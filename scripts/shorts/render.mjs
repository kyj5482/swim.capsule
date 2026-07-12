/* SWIM CAPSULE ride-shorts 렌더 드라이버
   사용: node scripts/shorts/render.mjs scripts/shorts/scenes/<scene>.json
   renderer.html을 헤드리스 Chrome으로 열어 프레임을 뽑고 ffmpeg로 mp4+poster 생성.
   요구: Google Chrome, ffmpeg, npm i (puppeteer-core) — 자세한 절차는 SKILL.md. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const cfgPath = process.argv[2];
if (!cfgPath) { console.error('usage: node render.mjs <scene.json>'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
cfg.fps ??= 30; cfg.duration ??= 3;
const frames = Math.round(cfg.fps * cfg.duration);

// 배경 사진 → file:// URL (renderer가 로드)
const bgAbs = path.resolve(ROOT, cfg.scene.bg);
cfg.scene.bgUrl = pathToFileURL(bgAbs).href;

const outBase = path.resolve(ROOT, cfg.out);
fs.mkdirSync(path.dirname(outBase), { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swim-shorts-'));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--disable-lcd-text'],
});
try {
  const page = await browser.newPage();
  page.on('pageerror', e => { throw e; });
  await page.goto(pathToFileURL(path.join(HERE, 'renderer.html')).href);
  const bgInfo = await page.evaluate(c => window.initScene(c), cfg);
  console.log(`scene "${cfg.scene.title_ko}" bg ${bgInfo.w}x${bgInfo.h}, ${frames}f @ ${cfg.fps}fps`);

  for (let i = 0; i < frames; i++) {
    const dataUrl = await page.evaluate(f => window.renderFrame(f), i);
    fs.writeFileSync(path.join(tmp, String(i).padStart(4, '0') + '.png'),
      Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64'));
    if (i % 30 === 0) console.log(`  frame ${i}/${frames}`);
  }
} finally {
  await browser.close();
}

// mp4 (H.264, 쇼츠 호환) + 포스터(자막이 보이는 시점)
const run = (args) => {
  const r = spawnSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  if (r.status !== 0) { console.error(r.stderr.toString().slice(-2000)); process.exit(1); }
};
run(['-y', '-framerate', String(cfg.fps), '-i', path.join(tmp, '%04d.png'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-preset', 'slow',
  '-movflags', '+faststart', outBase + '.mp4']);
const posterT = cfg.posterT ?? Math.min(cfg.duration - 0.3, 2.0);
run(['-y', '-ss', String(posterT), '-i', outBase + '.mp4', '-frames:v', '1', '-q:v', '3', outBase + '.jpg']);
fs.rmSync(tmp, { recursive: true, force: true });

const mb = (fs.statSync(outBase + '.mp4').size / 1048576).toFixed(2);
console.log(`✅ ${cfg.out}.mp4 (${mb} MB) + ${cfg.out}.jpg`);
