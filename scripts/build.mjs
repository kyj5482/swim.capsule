#!/usr/bin/env node
/**
 * swim.capsule 정적 사이트 생성기 (의존성 없음)
 * data/athletes.json + data/timeline.json → dist/
 * 사용: node scripts/build.mjs   (환경변수 SITE_BASE로 배포 URL 지정 가능)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE_BASE = (process.env.SITE_BASE || 'https://kyj5482.github.io/swim.capsule').replace(/\/$/, '');
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const athletes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/athletes.json'), 'utf8')).athletes;
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8')).events
  .slice()
  .sort((a, b) => a.date.localeCompare(b.date));

const years = [...new Set(timeline.map(e => e.year))].sort();
const byYear = Object.fromEntries(years.map(y => [y, timeline.filter(e => e.year === y)]));
const athleteById = Object.fromEntries(athletes.map(a => [a.id, a]));

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MEDAL = {
  gold:     { ko: '금메달', en: 'Gold',     icon: '🥇', cls: 'gold' },
  silver:   { ko: '은메달', en: 'Silver',   icon: '🥈', cls: 'silver' },
  bronze:   { ko: '동메달', en: 'Bronze',   icon: '🥉', cls: 'bronze' },
  finalist: { ko: '결승 진출', en: 'Finalist', icon: '🏁', cls: 'finalist' },
  medal:    { ko: '메달', en: 'Medal',      icon: '🏅', cls: 'medal' },
};
const TYPE = {
  competition: { ko: '대회', en: 'Meet', icon: '🏊' },
  record:      { ko: '신기록', en: 'Record', icon: '⚡' },
  news:        { ko: '뉴스', en: 'News', icon: '📰' },
  milestone:   { ko: '이정표', en: 'Milestone', icon: '🧭' },
  video:       { ko: '영상', en: 'Video', icon: '🎬' },
};

function stats(events) {
  const s = { gold: 0, silver: 0, bronze: 0, records: 0 };
  for (const e of events) for (const r of (e.results || [])) {
    if (r.medal === 'gold') s.gold++;
    if (r.medal === 'silver') s.silver++;
    if (r.medal === 'bronze') s.bronze++;
    if (r.record) s.records++;
  }
  return s;
}
const totalStats = stats(timeline);

function fmtDate(e, lang) {
  const [y, m, d] = e.date.split('-');
  if (e.date_precision === 'year') return lang === 'ko' ? `${y}년` : y;
  if (e.date_precision === 'month') return lang === 'ko' ? `${y}년 ${+m}월` : `${new Date(e.date).toLocaleString('en', { month: 'short' })} ${y}`;
  return lang === 'ko' ? `${y}년 ${+m}월 ${+d}일` : new Date(e.date).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

const t = (lang, ko, en) => (lang === 'ko' ? ko : en);
const L = (e, key, lang) => e[`${key}_${lang}`] ?? e[`${key}_ko`];

/* ---------- JSON-LD ---------- */
function personLd(a, lang) {
  return {
    '@type': 'Person', name: lang === 'ko' ? a.korea.name : a.usa.name,
    alternateName: lang === 'ko' ? a.usa.name : a.korea.name,
    birthDate: a.birthdate, nationality: 'KR',
    description: lang === 'ko' ? a.bio_ko : a.bio_en,
    affiliation: [{ '@type': 'SportsTeam', name: a.usa.team, location: a.usa.region }],
    knowsAbout: 'Competitive swimming',
    url: `${SITE_BASE}/${lang === 'en' ? 'en/' : ''}`,
  };
}
function eventLd(e, lang) {
  if (e.type !== 'competition' && e.type !== 'record') return null;
  return {
    '@type': 'SportsEvent', name: L(e, 'title', lang), startDate: e.date,
    location: { '@type': 'Place', name: L(e, 'location', lang) },
    sport: 'Swimming',
    competitor: e.athletes.map(id => ({ '@type': 'Person', name: lang === 'ko' ? athleteById[id].korea.name : athleteById[id].usa.name })),
  };
}

/* ---------- 공통 레이아웃 ---------- */
function page({ lang, title, desc, rel, altRel, canonicalPath, jsonld, body, ogType = 'website', extraCss = '', extraJs = '' }) {
  const canonical = `${SITE_BASE}/${canonicalPath}`;
  const altLang = lang === 'ko' ? 'en' : 'ko';
  const altUrl = `${SITE_BASE}/${altRel}`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${altLang}" href="${altUrl}">
<link rel="alternate" hreflang="x-default" href="${SITE_BASE}/">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === 'ko' ? 'ko_KR' : 'en_US'}">
<meta name="twitter:card" content="summary">
<meta name="robots" content="index,follow">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌊</text></svg>">
<link rel="stylesheet" href="${rel}assets/style.css">
${extraCss ? `<link rel="stylesheet" href="${rel}assets/${extraCss}">` : ''}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonld })}</script>
</head>
<body data-lang="${lang}">
<div class="water" aria-hidden="true"><span class="w1"></span><span class="w2"></span><span class="w3"></span></div>
${body}
<footer class="foot">
  <p>SWIM CAPSULE — ${t(lang, '김재이 · 김지아 남매의 수영 타임캡슐', 'The swimming time capsule of Jaei & Jia Kim')}</p>
  <p class="dim">${t(lang, `마지막 봉인 갱신: ${BUILD_DATE} · 원본 기록은 저장소 capsules/ 폴더에 영구 보관됩니다.`, `Last sealed: ${BUILD_DATE} · Original sources are preserved forever in the repository's capsules/ folder.`)}</p>
</footer>
<script src="${rel}assets/app.js" defer></script>
${extraJs ? `<script src="${rel}assets/${extraJs}" defer></script>` : ''}
</body>
</html>`;
}

function nav(lang, rel, altHref, current) {
  const base = `${rel}${lang === 'en' ? 'en/' : ''}`;
  return `<nav class="nav">
  <a class="brand" href="${base}">🌊 SWIM<span>CAPSULE</span></a>
  <div class="nav-years">
    ${athletes.map(a =>
    `<a href="${base}${a.id}/" class="nav-ath ${current === a.id ? 'on' : ''}">${t(lang, a.korea.name.slice(1), a.usa.name.split(' ')[0])}</a>`).join('')}
    <span class="nav-sep" aria-hidden="true"></span>
    ${years.map(y =>
    `<a href="${base}${y}/" class="${current === String(y) ? 'on' : ''}">${y}</a>`).join('')}
    <span class="nav-sep" aria-hidden="true"></span>
    <a href="${base}ride/" class="nav-ride ${current === 'ride' ? 'on' : ''}">🎢 ${t(lang, '라이드', 'Ride')}</a>
  </div>
  <a class="lang" href="${altHref}" lang="${lang === 'ko' ? 'en' : 'ko'}">${lang === 'ko' ? 'EN' : '한국어'}</a>
</nav>`;
}

/* ---------- 이벤트 카드 ---------- */
function resultRows(e, lang) {
  if (!e.results?.length) return '';
  return `<table class="res"><thead><tr><th>${t(lang, '종목', 'Event')}</th><th>${t(lang, '결과', 'Result')}</th><th>${t(lang, '기록', 'Time')}</th></tr></thead><tbody>
${e.results.map(r => {
    const m = MEDAL[r.medal];
    const place = r.place > 0 ? t(lang, `${r.place}위`, ordinal(r.place)) : '';
    return `<tr><td>${esc(t(lang, r.event_ko, r.event_en))}</td><td>${m ? `<span class="pill ${m.cls}">${m.icon} ${t(lang, m.ko, m.en)}</span>` : ''} ${place}${r.record ? ` <span class="pill rec">⚡ ${esc(r.record)}</span>` : ''}</td><td>${esc(r.time) || '<span class="dim">TBC</span>'}</td></tr>`;
  }).join('\n')}
</tbody></table>`;
}
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || 'th');

function sourceList(e, lang, rel) {
  if (!e.sources?.length) return `<p class="src dim">${t(lang, '출처 수집 중 — capsule-scrape 스킬로 채워집니다.', 'Sources being collected via the capsule-scrape skill.')}</p>`;
  return `<ul class="src">${e.sources.map(s => {
    const archived = s.archived
      ? ` · <a href="${rel}archive/${esc(s.archived.replace(/^capsules\//, ''))}">${t(lang, '보관본', 'archived copy')}</a>`
      : '';
    const status = s.status === 'captured' ? '✅' : s.status === 'pending' ? `⏳ ${t(lang, '원본 캡처 대기', 'capture pending')}` : `🔎 ${t(lang, '검색 확인', 'verified via search')}`;
    return `<li><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.title || s.publisher || s.url)}</a> <span class="dim">(${esc(s.publisher || s.kind)}) ${status}${archived}</span></li>`;
  }).join('')}</ul>`;
}

function eventCard(e, lang, rel) {
  const ty = TYPE[e.type] || TYPE.milestone;
  const names = e.athletes.map(id => t(lang, athleteById[id].korea.name, athleteById[id].usa.name)).join(' · ');
  const media = (e.media || []).map(m => `<a class="media-item" href="${rel}archive/${esc(m)}">📎 ${esc(m.split('/').pop())}</a>`).join('');
  return `<article class="ev reveal ${e.highlight ? 'hl' : ''}" id="${esc(e.id)}">
  <div class="ev-head">
    <span class="ev-date">${fmtDate(e, lang)}</span>
    <span class="pill type">${ty.icon} ${t(lang, ty.ko, ty.en)}</span>
    <span class="ev-ath">${esc(names)}</span>
    ${e.verified ? `<span class="pill ok" title="${t(lang, '출처로 교차 확인됨', 'Cross-checked against sources')}">✔ ${t(lang, '확인됨', 'verified')}</span>` : `<span class="pill tbc">${t(lang, '보완 중', 'to be confirmed')}</span>`}
  </div>
  <h3>${esc(L(e, 'title', lang))}</h3>
  <p class="ev-loc">📍 ${esc(L(e, 'location', lang))}</p>
  <p class="ev-story">${esc(L(e, 'story', lang))}</p>
  ${resultRows(e, lang)}
  ${sourceList(e, lang, rel)}
  <div class="media-slot">${media || `<span class="dim">📷 ${t(lang, '이 순간의 사진·영상을 capsules/' + e.year + '/' + e.id + '/media/ 에 추가하세요.', 'Add photos/videos of this moment to capsules/' + e.year + '/' + e.id + '/media/.')}</span>`}</div>
</article>`;
}

/* ---------- 메인 페이지 ---------- */
function indexPage(lang) {
  const rel = lang === 'en' ? '../' : '';
  const highlights = timeline.filter(e => e.highlight);
  const ticker = highlights.map(e => `<span>${TYPE[e.type]?.icon || '🏊'} ${e.year} · ${esc(L(e, 'title', lang))}</span>`).join('<span class="tick-dot">•</span>');

  const athleteCards = athletes.map(a => {
    const mine = timeline.filter(e => e.athletes.includes(a.id));
    const s = stats(mine);
    return `<article class="ath reveal">
    <div class="ath-top"><div class="avatar">${t(lang, a.korea.name[1], a.usa.name[0])}</div>
      <div><h3>${esc(t(lang, a.korea.name, a.usa.name))} <span class="dim">${esc(t(lang, a.usa.name, a.korea.name))}</span></h3>
      <p class="dim">${esc(t(lang, a.korea.teams.join(' · ') + ' → ' + a.usa.team + ' (' + a.usa.region + ')', a.usa.team + ', ' + a.usa.region + ' — formerly ' + a.korea.region))}</p></div></div>
    <p>${esc(t(lang, a.bio_ko, a.bio_en))}</p>
    <div class="mini-stats">
      ${[['🥇', s.gold], ['🥈', s.silver], ['🥉', s.bronze]].filter(([, n]) => n > 0).map(([i, n]) => `<span>${i}×<b>${n}</b></span>`).join('')}
      <span class="dim">${t(lang, '주종목', 'Strokes')}: ${esc((lang === 'ko' ? a.main_strokes_ko : a.main_strokes_en).join(', '))}</span>
    </div>
    <p class="ath-cta"><a href="${a.id}/">${t(lang, `${a.korea.name}의 개인 캡슐 열기`, `Open ${a.usa.name}'s capsule`)} →</a></p></article>`;
  }).join('\n');

  const capsules = years.map((y, i) => {
    const evs = byYear[y];
    const s = stats(evs);
    const top = evs.find(e => e.highlight) || evs[0];
    const sealed = y >= 2026;
    return `<a class="cap reveal ${sealed ? 'sealed' : ''}" href="${lang === 'en' ? '' : ''}${y}/" style="--d:${i * .08}s">
    <div class="cap-ring"><span class="cap-year">${y}</span></div>
    <div class="cap-body">
      <p class="cap-count">${t(lang, `기록 ${evs.length}건`, `${evs.length} ${evs.length === 1 ? 'entry' : 'entries'}`)}${s.gold ? ` · 🥇${s.gold}` : ''}${s.silver ? ` · 🥈${s.silver}` : ''}${s.bronze ? ` · 🥉${s.bronze}` : ''}</p>
      <p class="cap-top">${esc(L(top, 'title', lang))}</p>
      <span class="cap-open">${sealed ? t(lang, '봉인 중… 열어보기', 'Sealing… peek inside') : t(lang, '캡슐 열기', 'Open capsule')} →</span>
    </div></a>`;
  }).join('\n');

  const title = t(lang, 'SWIM CAPSULE — 김재이·김지아 수영 타임캡슐 | 과천에서 어바인까지', 'SWIM CAPSULE — Jaei & Jia Kim, a Swimming Time Capsule from Gwacheon to Irvine');
  const desc = t(lang,
    '수영 선수 남매 김재이(Jaei Kim)·김지아(Jia Kim)의 대회 기록·뉴스·영상을 연도별 타임캡슐로 영구 보관합니다. 전국소년체전 메달, 대통령배 금메달, 생활체육 한국신기록, 그리고 NOVA(Irvine)에서의 새로운 도전.',
    'The permanent, year-by-year time capsule of Korean-born swimmers Jaei Kim & Jia Kim: National Youth Sports Festival medals, a President\'s Cup gold, a Korean national record, and a new chapter with NOVA in Irvine, CA.');

  const body = `
${nav(lang, rel, lang === 'ko' ? 'en/' : '../', 'home')}
<header class="hero">
  <p class="kicker reveal">${t(lang, '두 선수 · 두 나라 · 하나의 기록', 'Two swimmers · two countries · one story')}</p>
  <h1 class="reveal"><span class="grad">${t(lang, '물살 위의 시간을', 'Every second in the water,')}</span><br>${t(lang, '캡슐에 봉인하다', 'sealed in a capsule.')}</h1>
  <p class="sub reveal">${t(lang,
    '경기도 과천의 레인에서 캘리포니아 어바인의 새벽 훈련까지 — 남매 수영선수의 모든 대회, 모든 뉴스, 모든 기록을 사라지지 않게 보관합니다.',
    'From the lanes of Gwacheon, Korea to dawn practice in Irvine, California — every meet, every headline, every time, preserved so it can never disappear.')}</p>
  <div class="stats reveal" role="group" aria-label="${t(lang, '수집된 기록 요약', 'Collected records summary')}">
    <div class="stat"><b data-count="${totalStats.gold}">${totalStats.gold}</b><span>${t(lang, '금메달', 'Gold')}</span></div>
    <div class="stat"><b data-count="${totalStats.silver}">${totalStats.silver}</b><span>${t(lang, '은메달', 'Silver')}</span></div>
    <div class="stat"><b data-count="${totalStats.bronze}">${totalStats.bronze}</b><span>${t(lang, '동메달', 'Bronze')}</span></div>
    <div class="stat"><b data-count="${totalStats.records}">${totalStats.records}</b><span>${t(lang, '한국신기록', 'KOR Record')}</span></div>
    <div class="stat"><b data-count="${timeline.length}">${timeline.length}</b><span>${t(lang, '캡슐 기록', 'Entries')}</span></div>
  </div>
  <p class="dim reveal">${t(lang, '※ 지금까지 수집·확인된 기록 기준 — 캡슐은 계속 채워집니다.', 'Based on records collected & verified so far — the capsule keeps growing.')}</p>
</header>
<div class="ticker" aria-hidden="true"><div class="tick-track">${ticker}<span class="tick-dot">•</span>${ticker}</div></div>
<main>
<section class="sec"><h2>${t(lang, '선수', 'The swimmers')}</h2><div class="ath-grid">${athleteCards}</div></section>
<section class="sec"><h2>${t(lang, '타임캡슐', 'The capsules')}</h2>
<p class="dim">${t(lang, '연도별로 봉인된 캡슐을 열면 그해의 대회·뉴스·기록이 시간 순서로 펼쳐집니다.', 'Open a year to unfold its meets, headlines and times in order.')}</p>
<div class="cap-grid">${capsules}</div></section>
<section class="sec"><a class="ride-banner reveal" href="ride/">
  <span class="rb-emoji" aria-hidden="true">🎢</span>
  <span class="rb-txt"><b>${t(lang, '스페셜 — 캡슐 라이드', 'Special — The Capsule Ride')}</b>
  ${t(lang, '롤러코스터 맨 앞자리 시점으로 2022년부터 지금까지의 기록 사이를 통과해 보세요.', 'Ride the front seat through every record from 2022 to now, first-person.')}</span>
  <span class="rb-go">${t(lang, '탑승하기', 'Hop on')} →</span>
</a></section>
</main>`;

  return page({
    lang, title, desc, rel,
    altRel: lang === 'ko' ? 'en/' : '',
    canonicalPath: lang === 'ko' ? '' : 'en/',
    ogType: 'profile',
    jsonld: [
      { '@type': 'WebSite', name: 'SWIM CAPSULE', url: `${SITE_BASE}/`, inLanguage: ['ko', 'en'], description: desc },
      ...athletes.map(a => personLd(a, lang)),
    ],
    body,
  });
}

/* ---------- 연도 페이지 ---------- */
function yearPage(y, lang) {
  const rel = '../' + (lang === 'en' ? '../' : '');
  const evs = byYear[y];
  const s = stats(evs);
  const title = t(lang, `${y}년 캡슐 — 김재이·김지아 수영 기록 | SWIM CAPSULE`, `${y} Capsule — Jaei & Jia Kim swimming records | SWIM CAPSULE`);
  const desc = t(lang,
    `${y}년 김재이·김지아의 수영 대회 결과, 뉴스, 공식 기록 ${evs.length}건: ` + evs.slice(0, 3).map(e => e.title_ko).join(' / '),
    `${evs.length} archived swimming records of Jaei & Jia Kim from ${y}: ` + evs.slice(0, 3).map(e => e.title_en).join(' / '));

  const body = `
${nav(lang, rel, `${rel}${lang === 'ko' ? 'en/' : ''}${y}/`, String(y))}
<header class="hero yhero">
  <p class="kicker reveal">${t(lang, '타임캡슐 개봉', 'Capsule opened')}</p>
  <h1 class="reveal"><span class="grad">${y}</span></h1>
  <p class="sub reveal">${t(lang, `기록 ${evs.length}건`, `${evs.length} ${evs.length === 1 ? 'entry' : 'entries'}`)}${s.gold ? ` · 🥇×${s.gold}` : ''}${s.silver ? ` · 🥈×${s.silver}` : ''}${s.bronze ? ` · 🥉×${s.bronze}` : ''}${s.records ? ` · ⚡×${s.records}` : ''}</p>
</header>
<main class="tl">
${evs.map(e => eventCard(e, lang, rel)).join('\n')}
<div class="yr-nav">
  ${years.indexOf(y) > 0 ? `<a href="../${years[years.indexOf(y) - 1]}/">← ${years[years.indexOf(y) - 1]}</a>` : '<span></span>'}
  <a href="${rel}${lang === 'en' ? 'en/' : ''}">${t(lang, '전체 캡슐', 'All capsules')}</a>
  ${years.indexOf(y) < years.length - 1 ? `<a href="../${years[years.indexOf(y) + 1]}/">${years[years.indexOf(y) + 1]} →</a>` : '<span></span>'}
</div>
</main>`;

  return page({
    lang, title, desc, rel,
    altRel: lang === 'ko' ? `en/${y}/` : `${y}/`,
    canonicalPath: lang === 'ko' ? `${y}/` : `en/${y}/`,
    ogType: 'article',
    jsonld: [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'SWIM CAPSULE', item: `${SITE_BASE}/${lang === 'en' ? 'en/' : ''}` },
        { '@type': 'ListItem', position: 2, name: String(y), item: `${SITE_BASE}/${lang === 'en' ? 'en/' : ''}${y}/` },
      ]},
      ...evs.map(e => eventLd(e, lang)).filter(Boolean),
    ],
    body,
  });
}

/* ---------- 선수별 개인 캡슐 페이지 ---------- */
function athletePage(a, lang) {
  const rel = '../' + (lang === 'en' ? '../' : '');
  const mine = timeline.filter(e => e.athletes.includes(a.id));
  const s = stats(mine);
  const myYears = [...new Set(mine.map(e => e.year))].sort();
  const nameKo = a.korea.name, nameEn = a.usa.name;
  const dispName = t(lang, nameKo, nameEn);
  const sib = athletes.find(x => x.id !== a.id);

  const title = t(lang,
    `${nameKo} (${nameEn}) — 개인 수영 타임캡슐 | SWIM CAPSULE`,
    `${nameEn} (${nameKo}) — personal swimming time capsule | SWIM CAPSULE`);
  const desc = t(lang,
    `${nameKo}의 수영 기록 ${mine.length}건: ${a.bio_ko.slice(0, 80)}…`,
    `${mine.length} archived swimming records of ${nameEn}: ${a.bio_en.slice(0, 90)}…`);

  const yearSections = myYears.map(y => {
    const evs = mine.filter(e => e.year === y);
    return `<section class="sec ath-year" id="y${y}">
  <h2>${y} <span class="dim">· ${t(lang, `${evs.length}건`, `${evs.length} ${evs.length === 1 ? 'entry' : 'entries'}`)}</span></h2>
  <div class="tl">${evs.map(e => eventCard(e, lang, rel)).join('\n')}</div>
</section>`;
  }).join('\n');

  const body = `
${nav(lang, rel, `${rel}${lang === 'ko' ? 'en/' : ''}${a.id}/`, a.id)}
<header class="hero yhero">
  <p class="kicker reveal">${t(lang, '개인 타임캡슐', 'Personal time capsule')}</p>
  <h1 class="reveal"><span class="grad">${esc(dispName)}</span></h1>
  <p class="sub reveal">${esc(t(lang, nameEn, nameKo))} · ${esc(t(lang, a.korea.region + ' → ' + a.usa.region, a.usa.region + ' — from ' + a.korea.region))}</p>
  <p class="sub reveal">${esc(t(lang, a.bio_ko, a.bio_en))}</p>
  <div class="stats reveal">
    ${[[t(lang, '금메달', 'Gold'), s.gold], [t(lang, '은메달', 'Silver'), s.silver], [t(lang, '동메달', 'Bronze'), s.bronze], [t(lang, '한국신기록', 'KOR Record'), s.records], [t(lang, '캡슐 기록', 'Entries'), mine.length]]
      .filter(([, n]) => n > 0)
      .map(([l, n]) => `<div class="stat"><b data-count="${n}">${n}</b><span>${l}</span></div>`).join('')}
  </div>
  <p class="dim reveal">${t(lang, '주종목', 'Main strokes')}: ${esc((lang === 'ko' ? a.main_strokes_ko : a.main_strokes_en).join(', '))} · ${t(lang, 'USA Swimming ID', 'USA Swimming ID')}: ${esc(a.usa.usa_swimming_id)}</p>
</header>
<main>
${yearSections}
<div class="yr-nav">
  <a href="${rel}${lang === 'en' ? 'en/' : ''}${sib.id}/">${t(lang, `${sib.korea.name}의 캡슐`, `${sib.usa.name}'s capsule`)} →</a>
  <a href="${rel}${lang === 'en' ? 'en/' : ''}">${t(lang, '전체 캡슐', 'All capsules')}</a>
  <a href="${rel}${lang === 'en' ? 'en/' : ''}ride/">🎢 ${t(lang, '캡슐 라이드', 'Capsule Ride')}</a>
</div>
</main>`;

  return page({
    lang, title, desc, rel,
    altRel: lang === 'ko' ? `en/${a.id}/` : `${a.id}/`,
    canonicalPath: lang === 'ko' ? `${a.id}/` : `en/${a.id}/`,
    ogType: 'profile',
    jsonld: [
      personLd(a, lang),
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'SWIM CAPSULE', item: `${SITE_BASE}/${lang === 'en' ? 'en/' : ''}` },
        { '@type': 'ListItem', position: 2, name: dispName, item: `${SITE_BASE}/${lang === 'en' ? 'en/' : ''}${a.id}/` },
      ]},
      ...mine.map(e => eventLd(e, lang)).filter(Boolean),
    ],
    body,
  });
}

/* ---------- 캡슐 라이드 (1인칭 POV 스크롤 체험) ---------- */
function rideStation(e, lang, rel, idx) {
  const ty = TYPE[e.type] || TYPE.milestone;
  const names = e.athletes.map(id => t(lang, athleteById[id].korea.name, athleteById[id].usa.name)).join(' · ');
  const medals = (e.results || []).map(r => MEDAL[r.medal]).filter(Boolean)
    .map(m => `<span class="pill ${m.cls}">${m.icon} ${t(lang, m.ko, m.en)}</span>`).join(' ');
  const links = [];
  for (const s of (e.sources || [])) {
    if (s.kind === 'youtube') links.push(`<a href="${esc(s.url)}" target="_blank" rel="noopener">🎬 ${t(lang, '경기 영상', 'Race video')}</a>`);
  }
  const src = (e.sources || [])[0];
  if (src?.url) links.push(`<a href="${esc(src.url)}" target="_blank" rel="noopener">${src.kind === 'news' ? '📰' : '📄'} ${t(lang, '원문', 'Source')}</a>`);
  if (src?.archived) links.push(`<a href="${rel}archive/${esc(src.archived.replace(/^capsules\//, ''))}">🗄 ${t(lang, '보관본', 'Archive')}</a>`);
  links.push(`<a href="${rel}${lang === 'en' ? 'en/' : ''}${e.year}/#${esc(e.id)}">🔍 ${t(lang, '자세히', 'Details')}</a>`);

  // 사진·영상 — capsules/**/media/ 에 파일을 넣고 e.media 에 경로를 등록하면 라이드에 함께 표시된다.
  const vidExt = /\.(mp4|webm|mov|m4v)$/i, imgExt = /\.(jpe?g|png|webp|gif|avif)$/i;
  const mediaItems = (e.media || []).map(m => {
    const url = `${rel}archive/${esc(m)}`;
    const name = esc(m.split('/').pop());
    if (vidExt.test(m)) return `<span class="st-m st-m-vid"><video src="${url}" muted loop playsinline preload="metadata"></video><span class="st-m-badge">▶</span></span>`;
    if (imgExt.test(m)) return `<a class="st-m st-m-img" href="${url}" target="_blank" rel="noopener" style="background-image:url('${url}')"><span class="st-m-badge">🔍</span></a>`;
    return `<a class="st-m st-m-file" href="${url}" target="_blank" rel="noopener">📎 ${name}</a>`;
  }).join('');

  // 뉴스 클리핑 — 이 순간이 언론에 실렸다면 캡처가 살짝 삐져나오게. source에 capture(이미지 경로)가 있으면 실제 캡처를 쓴다.
  const clips = (e.sources || []).filter(s => s.kind === 'news').map((s, i) => {
    const cap = s.capture ? `${rel}archive/${esc(s.capture)}` : '';
    return `<a class="st-clip${cap ? ' has-cap' : ''}" data-flip="${i % 2 ? 1 : -1}" ${cap ? `style="background-image:url('${cap}')"` : ''} href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.title || L(e, 'title', lang))}">
      <span class="clip-tag">📰 ${esc(s.publisher || t(lang, '보도', 'Press'))}</span>
      <span class="clip-head">${esc(s.title || L(e, 'title', lang))}</span>
    </a>`;
  }).join('');
  const mediaStrip = (mediaItems || clips) ? `<div class="st-media">${mediaItems}${clips}</div>` : '';

  return `<article class="st ${e.highlight ? 'st-hl' : ''}" data-i="${idx}" data-year="${e.year}" id="ride-${esc(e.id)}">
  <div class="st-inner">
    <p class="st-date">${fmtDate(e, lang)} <span class="pill type">${ty.icon} ${t(lang, ty.ko, ty.en)}</span></p>
    <h3>${esc(L(e, 'title', lang))}</h3>
    <p class="st-ath">${esc(names)} · 📍 ${esc(L(e, 'location', lang))}</p>
    ${medals ? `<p class="st-medals">${medals}</p>` : ''}
    <p class="st-story">${esc(L(e, 'story', lang))}</p>
    ${mediaStrip}
    <p class="st-links">${links.join(' ')}</p>
  </div>
</article>`;
}

function ridePage(lang) {
  const rel = '../' + (lang === 'en' ? '../' : '');
  const title = t(lang,
    '캡슐 라이드 — 1인칭으로 시간을 통과하는 수영 타임캡슐 | SWIM CAPSULE',
    'The Capsule Ride — a first-person journey through the swimming time capsule | SWIM CAPSULE');
  const desc = t(lang,
    '롤러코스터 1인칭 시점처럼 2022년부터 지금까지, 김재이·김지아의 기록 사이를 통과하는 스페셜 라이드. 구간마다 뉴스·영상·기록이 큐레이터처럼 펼쳐집니다.',
    'A first-person POV ride from 2022 to now — glide past every meet, headline and record of Jaei & Jia Kim, curated station by station.');

  // 정거장: 연도 게이트 + 이벤트
  const stations = [];
  let lastYear = null, idx = 0;
  stations.push(`<div class="st gate" data-i="${idx++}" data-year="${years[0]}">
  <div class="st-inner gate-inner">
    <p class="kicker">SWIM CAPSULE RIDE</p>
    <h2>${t(lang, '안전바를 내려주세요', 'Lower the safety bar')}</h2>
    <p>${t(lang, '지금부터 2022년의 물속으로 입수합니다. 스크롤하면 앞으로 나아갑니다.', 'We are about to dive into 2022. Scroll to move forward.')}</p>
    <p class="gate-hint">▼ ${t(lang, '스크롤', 'Scroll')}</p>
  </div>
</div>`);
  for (const e of timeline) {
    if (e.year !== lastYear) {
      lastYear = e.year;
      stations.push(`<div class="st gate gate-year" data-i="${idx++}" data-year="${e.year}">
  <div class="st-inner gate-inner"><span class="gate-num">${e.year}</span><p>${t(lang, `${e.year}년 구간 진입`, `Entering ${e.year}`)}</p></div>
</div>`);
    }
    stations.push(rideStation(e, lang, rel, idx++));
  }
  stations.push(`<div class="st gate finale" data-i="${idx++}" data-year="${years[years.length - 1]}">
  <div class="st-inner gate-inner">
    <h2>🌊 ${t(lang, '라이드 종점', 'End of the line — for now')}</h2>
    <p>${t(lang, '다음 캡슐은 아직 봉인 중입니다. 남매의 레이스는 계속됩니다.', 'The next capsule is still being sealed. The siblings are still racing.')}</p>
    <p class="st-links"><a href="${rel}${lang === 'en' ? 'en/' : ''}">${t(lang, '전체 캡슐로', 'Back to all capsules')}</a> <a href="#top">${t(lang, '다시 타기', 'Ride again')}</a></p>
  </div>
</div>`);

  const total = idx;
  const yearsAttr = years.join(',');

  const body = `
${nav(lang, rel, `${rel}${lang === 'ko' ? 'en/' : ''}ride/`, 'ride')}
<header class="hero yhero" id="top">
  <p class="kicker reveal">${t(lang, '스페셜 — 1인칭 시점', 'Special — first-person POV')}</p>
  <h1 class="reveal"><span class="grad">${t(lang, '캡슐 라이드', 'The Capsule Ride')}</span></h1>
  <p class="sub reveal">${t(lang,
    '롤러코스터의 맨 앞자리에서 시간을 통과하듯 — 스크롤할수록 기록 사이를 헤엄쳐 나아갑니다. 구간마다 뉴스, 영상, 기록이 큐레이션되어 기다립니다.',
    'Like the front seat of a rollercoaster through time — the further you scroll, the deeper you swim between the records. Every stretch curates its news, videos and times.')}</p>
  <p class="dim reveal">${t(lang, 'JS·모션 축소 환경에서는 정거장이 일반 목록으로 표시됩니다.', 'Without JS (or with reduced motion) the stations render as a plain list.')}</p>
</header>
<div class="ride" id="ride" data-total="${total}" data-years="${yearsAttr}">
  <div class="ride-cam">
    <div class="lane-lines" aria-hidden="true"></div>
    <div class="ride-track">
      ${stations.join('\n')}
    </div>
    <div class="ride-hud" aria-hidden="true">
      <div class="hud-bar"><span class="hud-fill"></span></div>
      <span class="hud-year"></span>
      <button type="button" class="hud-auto">▶ ${t(lang, '자동 주행', 'Auto-ride')}</button>
      <label class="hud-speed-wrap" title="${t(lang, '주행 속도', 'Ride speed')}">
        <span class="hud-speed-ico" aria-hidden="true">🐢</span>
        <input type="range" class="hud-speed" min="0.3" max="2.6" step="0.1" value="1" aria-label="${t(lang, '주행 속도', 'Ride speed')}">
        <span class="hud-speed-val">1.0×</span>
      </label>
    </div>
  </div>
</div>`;

  return page({
    lang, title, desc, rel,
    altRel: lang === 'ko' ? 'en/ride/' : 'ride/',
    canonicalPath: lang === 'ko' ? 'ride/' : 'en/ride/',
    jsonld: [
      { '@type': 'WebPage', name: title, url: `${SITE_BASE}/${lang === 'en' ? 'en/' : ''}ride/`, description: desc },
    ],
    body,
    extraCss: 'ride.css',
    extraJs: 'ride.js',
  });
}

/* ---------- 빌드 ---------- */
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'site/style.css'), path.join(DIST, 'assets/style.css'));
fs.copyFileSync(path.join(ROOT, 'site/app.js'), path.join(DIST, 'assets/app.js'));
fs.copyFileSync(path.join(ROOT, 'site/ride.css'), path.join(DIST, 'assets/ride.css'));
fs.copyFileSync(path.join(ROOT, 'site/ride.js'), path.join(DIST, 'assets/ride.js'));
fs.cpSync(path.join(ROOT, 'capsules'), path.join(DIST, 'archive'), { recursive: true });
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

const pages = [];
function emit(relPath, html) {
  const f = path.join(DIST, relPath, 'index.html');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
  pages.push(relPath ? relPath.replace(/\\/g, '/') + '/' : '');
}
emit('', indexPage('ko'));
emit('en', indexPage('en'));
for (const y of years) { emit(String(y), yearPage(y, 'ko')); emit(path.join('en', String(y)), yearPage(y, 'en')); }
for (const a of athletes) { emit(a.id, athletePage(a, 'ko')); emit(path.join('en', a.id), athletePage(a, 'en')); }
emit('ride', ridePage('ko'));
emit(path.join('en', 'ride'), ridePage('en'));

fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.map(p => `  <url><loc>${SITE_BASE}/${p}</loc><lastmod>${BUILD_DATE}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_BASE}/sitemap.xml\n`);
fs.writeFileSync(path.join(DIST, '404.html'),
  `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 — SWIM CAPSULE</title><link rel="stylesheet" href="/swim.capsule/assets/style.css"></head><body><main style="text-align:center;padding:20vh 1rem"><h1 style="font-size:3rem">🌊 404</h1><p>이 캡슐은 아직 봉인되지 않았어요. <a href="/swim.capsule/">홈으로</a></p></main></body></html>`);

console.log(`✅ built ${pages.length} pages → dist/ (base: ${SITE_BASE})`);
