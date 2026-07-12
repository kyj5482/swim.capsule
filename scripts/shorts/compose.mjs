/* SWIM CAPSULE ride-shorts V2 후합성 오케스트레이터
   사용: node scripts/shorts/compose.mjs scripts/shorts/casts/<cast>.json
   템플릿 클립(concat) + 전광판/손글씨 오버레이(overlay.html) + 오디오(스타트 신호·아나운서 say)
   → media/shorts/<out>.mp4 (+ 포스터). 요구: Chrome, ffmpeg, macOS say. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
  if (r.status !== 0) {
    console.error(`✖ ${cmd} ${args.join(' ')}\n${r.stderr?.toString().slice(-2000)}`);
    process.exit(1);
  }
  return r.stdout?.toString() ?? '';
};

const castPath = process.argv[2];
if (!castPath) { console.error('usage: node compose.mjs <cast.json>'); process.exit(1); }
const cast = JSON.parse(fs.readFileSync(castPath, 'utf8'));
cast.fps ??= 30;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swim-compose-'));

/* 1. 세그먼트 길이 측정 → 전역 타임라인 (세그먼트-상대 키프레임을 전역 초로 변환) */
const segs = cast.segments.map(s => {
  const f = path.resolve(ROOT, s.file);
  let dur = parseFloat(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', f]));
  if (s.to) dur = Math.min(dur, s.to);   // 세그먼트 트리밍 (예: 터널 어두운 지점까지)
  return { file: f, dur, to: s.to, fadeOut: s.fadeOut };
});
const segStart = [];
let acc = 0;
for (const s of segs) { segStart.push(acc); acc += s.dur; }
const total = acc;
console.log(`segments: ${segs.map((s, i) => `#${i}@${segStart[i].toFixed(2)}s(${s.dur.toFixed(2)}s)`).join(' ')} → total ${total.toFixed(2)}s`);

const globalized = (cast.panels || []).map(p => ({
  ...p,
  keys: p.keys.map(k => ({ ...k, t: k.t + segStart[p.seg ?? 0] })),
}));

/* 2. 템플릿 concat (1080x1920/30fps 통일, 원본 현장음 유지) */
const inputs = segs.flatMap(s => ['-i', s.file]);
const fc = segs.map((s, i) => {
  const vt = s.to ? `trim=end=${s.to},setpts=PTS-STARTPTS,` : '';
  const vf = s.fadeOut ? `,fade=t=out:st=${(s.dur - s.fadeOut).toFixed(2)}:d=${s.fadeOut}` : '';
  const at = s.to ? `atrim=end=${s.to},asetpts=PTS-STARTPTS,` : '';
  const af = s.fadeOut ? `,afade=t=out:st=${(s.dur - s.fadeOut).toFixed(2)}:d=${s.fadeOut}` : '';
  return `[${i}:v]${vt}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=${cast.fps},setsar=1${vf}[v${i}];` +
    `[${i}:a]${at}aresample=48000,pan=stereo|c0=c0|c1=c0${af}[a${i}]`;
}).join(';') + ';' +
  segs.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${segs.length}:v=1:a=1[bv][ba]`;
run('ffmpeg', ['-y', ...inputs, '-filter_complex', fc, '-map', '[bv]', '-map', '[ba]',
  '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-c:a', 'aac', path.join(tmp, 'base.mp4')]);
console.log('base concat ✓');

/* 3. 오버레이 프레임 렌더 (투명 PNG 시퀀스) */
const frames = Math.round(total * cast.fps);
{
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--allow-file-access-from-files', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage();
  page.on('pageerror', e => { throw e; });
  await page.goto(pathToFileURL(path.join(HERE, 'overlay.html')).href);
  await page.evaluate(c => window.initOverlay(c), { fps: cast.fps, panels: globalized });
  fs.mkdirSync(path.join(tmp, 'ov'));
  for (let i = 0; i < frames; i++) {
    const d = await page.evaluate(f => window.renderFrame(f), i);
    fs.writeFileSync(path.join(tmp, 'ov', String(i).padStart(5, '0') + '.png'),
      Buffer.from(d.slice('data:image/png;base64,'.length), 'base64'));
  }
  await browser.close();
  console.log(`overlay ${frames}f ✓`);
}

/* 4. 오디오: 스타트 신호(비프)·아나운서(say) 생성 */
const audioInputs = [];   // {file, at(전역 초), vol, fx}
const globalAt = a => (a.at ?? 0) + segStart[a.seg ?? 0];
for (const [i, vo] of (cast.vo || []).entries()) {
  let f;
  if ((vo.engine || 'edge') === 'edge') {
    // edge-tts (MS 뉴럴 보이스, 무료 CLI): pip3 install --user edge-tts
    f = path.join(tmp, `vo${i}.mp3`);
    const args = ['-m', 'edge_tts', '--voice', vo.voice || 'ko-KR-InJoonNeural',
      '--text', vo.text, '--write-media', f];
    if (vo.rate) args.push(`--rate=${vo.rate}`);
    run('python3', args);
  } else {
    f = path.join(tmp, `vo${i}.aiff`);   // 폴백: macOS say
    run('say', ['-v', vo.voice || 'Yuna', '-r', String(vo.rate || 200), '-o', f, vo.text]);
  }
  audioInputs.push({ file: f, at: globalAt(vo), vol: vo.vol ?? 1.6, fx: vo.fx });
}
for (const [i, sx] of (cast.sfx || []).entries()) {
  const wav = path.join(tmp, `sfx${i}.wav`);
  if (sx.type === 'beep')
    run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=980:duration=0.35',
      '-af', 'volume=0.9,afade=t=out:st=0.25:d=0.1', wav]);
  audioInputs.push({ file: wav, at: globalAt(sx), vol: sx.vol ?? 1.2 });
}

/* 5. 최종 합성: base + 오버레이 시퀀스 + 오디오 믹스 */
const out = path.resolve(ROOT, cast.out);
fs.mkdirSync(path.dirname(out), { recursive: true });
const aArgs = audioInputs.flatMap(a => ['-i', a.file]);
const mixIns = audioInputs.map((a, i) => {
  const pa = a.fx === 'pa' ? ',aecho=0.6:0.45:40:0.16' : '';  // 경기장 PA 스피커 잔향
  return `[${i + 2}:a]aresample=48000,volume=${a.vol}${pa},adelay=${Math.round(a.at * 1000)}|${Math.round(a.at * 1000)}[m${i}]`;
}).join(';');
const mix = audioInputs.length
  ? `;${mixIns};[1:a]volume=0.85[amb];[amb]${audioInputs.map((_, i) => `[m${i}]`).join('')}amix=inputs=${audioInputs.length + 1}:normalize=0[aout]`
  : ';[1:a]anull[aout]';
run('ffmpeg', ['-y',
  '-framerate', String(cast.fps), '-i', path.join(tmp, 'ov', '%05d.png'),
  '-i', path.join(tmp, 'base.mp4'), ...aArgs,
  '-filter_complex', `[1:v][0:v]overlay=0:0:format=auto[vout]${mix}`,
  '-map', '[vout]', '-map', '[aout]',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'slow',   // 모바일 재생 메모리/전송량 고려
  '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
  '-t', total.toFixed(2),   // 오디오 꼬리가 영상보다 길어지지 않게 클램프
  out + '.mp4']);
run('ffmpeg', ['-y', '-ss', String(cast.posterT ?? 2), '-i', out + '.mp4', '-frames:v', '1', '-q:v', '3', out + '.jpg']);
fs.rmSync(tmp, { recursive: true, force: true });
const mb = (fs.statSync(out + '.mp4').size / 1048576).toFixed(2);
console.log(`✅ ${cast.out}.mp4 (${mb} MB, ${total.toFixed(1)}s) + poster`);
