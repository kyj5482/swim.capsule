/* SWIM CAPSULE ride-shorts — 보트 모션 트래커
   POV 리그(핸들바)는 모든 템플릿의 화면 하단 중앙에 있고, 보트가 흔들리면
   함께 흔들린다. 그 핸들바(가장 어두운 큰 덩어리)의 프레임별 중심을 추적해
   보트의 상하 바운스·좌우 스웨이를 시계열로 뽑아 templates/<name>.motion.json에 저장.
   후합성(compose→overlay)에서 LCD·쪽지를 이 궤적만큼 함께 움직여 '붙어 있는' 느낌을 낸다.

   사용: node scripts/shorts/track.mjs [tpl-b-irvine.mp4 ...]  (인자 없으면 templates/*.mp4 전부)
   ffmpeg만 필요(vidstab 불요). 결정적 — 같은 입력이면 같은 출력. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const TPL = path.join(ROOT, 'media/shorts/templates');

const GW = 180, GH = 320;        // 저해상 그레이(추적용)
const FULL_W = 1080, FULL_H = 1920;
const SX = FULL_W / GW, SY = FULL_H / GH;
// 핸들바 ROI (하단 중앙) + 어두움 임계
const RX0 = 0.26, RX1 = 0.74, RY0 = 0.80, RY1 = 0.975, DARK = 62;
const CLAMP = 42;                // 델타 최대(px, 풀해상) — 이상치 방지

function trackFile(file, fps) {
  // 그레이 rawvideo로 디코드
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file,
    '-vf', `scale=${GW}:${GH},format=gray`, '-r', String(fps),
    '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
    { maxBuffer: 1 << 30 });
  if (r.status !== 0) { console.error(r.stderr.toString().slice(-800)); process.exit(1); }
  const buf = r.stdout;
  const fsz = GW * GH;
  const n = Math.floor(buf.length / fsz);
  const x0 = (RX0 * GW) | 0, x1 = (RX1 * GW) | 0, y0 = (RY0 * GH) | 0, y1 = (RY1 * GH) | 0;
  const cx = [], cy = [];
  let px = (x0 + x1) / 2, py = (y0 + y1) / 2;
  for (let f = 0; f < n; f++) {
    const base = f * fsz;
    let sw = 0, swx = 0, swy = 0;
    for (let y = y0; y < y1; y++) {
      const row = base + y * GW;
      for (let x = x0; x < x1; x++) {
        const v = buf[row + x];
        if (v < DARK) { const w = DARK - v; sw += w; swx += w * x; swy += w * y; }
      }
    }
    if (sw > 40) { px = swx / sw; py = swy / sw; }  // 약하면 직전 값 유지
    cx.push(px); cy.push(py);
  }
  // 평균 제거 → 델타, 이동평균 스무딩, 풀해상 스케일 + 클램프
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = mean(cx), my = mean(cy);
  const smooth = (a, w) => a.map((_, i) => {
    let s = 0, c = 0;
    for (let j = -w; j <= w; j++) { const k = i + j; if (k >= 0 && k < a.length) { s += a[k]; c++; } }
    return s / c;
  });
  const dx = smooth(cx.map(v => v - mx), 2);
  const dy = smooth(cy.map(v => v - my), 2);
  const clamp = v => Math.max(-CLAMP, Math.min(CLAMP, v));
  const track = dx.map((v, i) => [Math.round(clamp(v * SX) * 10) / 10, Math.round(clamp(dy[i] * SY) * 10) / 10]);
  const range = arr => { const xs = arr.map(t => t[0]), ys = arr.map(t => t[1]); return { x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)] }; };
  return { fps, w: FULL_W, h: FULL_H, frames: n, track, _range: range(track) };
}

const args = process.argv.slice(2);
const files = args.length ? args.map(a => path.isAbsolute(a) ? a : path.join(TPL, a))
  : fs.readdirSync(TPL).filter(f => f.endsWith('.mp4')).map(f => path.join(TPL, f));

for (const file of files) {
  const fps = Math.round(eval(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=r_frame_rate', '-of', 'default=noprint_wrappers=1:nokey=1', file])
    .stdout.toString().trim())) || 30;
  const m = trackFile(file, fps);
  const outName = path.basename(file).replace(/\.mp4$/, '.motion.json');
  const out = path.join(TPL, outName);
  const { _range, ...save } = m;
  fs.writeFileSync(out, JSON.stringify(save));
  console.log(`✅ ${outName}  frames=${m.frames}  dx∈[${_range.x[0]},${_range.x[1]}] dy∈[${_range.y[0]},${_range.y[1]}]`);
}
