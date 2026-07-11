# 🌊 SWIM CAPSULE

**김재이 · 김지아 남매의 수영 타임캡슐** — 과천에서 어바인까지, 사라지지 않는 기록.
*The swimming time capsule of Jaei & Jia Kim — from Gwacheon, Korea to Irvine, California.*

두 선수의 대회 기록·신문 기사·유튜브 영상 링크·공식 기록을 **원본 그대로** 연도별 캡슐에 보관합니다.
원본 사이트가 사라져도 기록은 이 저장소에 남습니다. 한국어 기록은 해외 대학·코치가 참고할 수 있도록 영문으로도 함께 보관합니다.

**사이트**: https://kyj5482.github.io/swim.capsule/ (한국어) · https://kyj5482.github.io/swim.capsule/en/ (English)

## 구조

| 경로 | 역할 |
|---|---|
| `data/athletes.json` | 선수 프로필 (한/미 이름·소속·지역, USA Swimming ID) |
| `data/timeline.json` | 모든 기록 항목 — **사이트는 이 파일에서 생성됨** |
| `data/scrape-state.json` | 수집 상태 — 세션이 끊겨도 여기서부터 재개 |
| `capsules/<연도>/<slug>/` | 원본 보관: `record.md`(한) + `record.en.md`(영) + `source.html`(원문) + `media/`(사진·영상) |
| `.claude/skills/capsule-scrape/` | 기록 수집 스킬 — "2024년 상반기 기록 수집해줘"처럼 기간을 지정해 실행 |
| `scripts/build.mjs` | 정적 사이트 생성기 (Node 20+, 의존성 없음) |
| `site/` | 사이트 스타일·스크립트 |
| `.github/workflows/deploy.yml` | main 푸시 시 GitHub Pages 자동 배포 |

## 사용법

```bash
node scripts/build.mjs   # dist/ 생성 — 로컬 확인: npx serve dist
```

**기록 추가(자동)** — Claude Code에서: `2025년 미국 대회 기록을 수집해서 캡슐에 넣어줘`
→ `capsule-scrape` 스킬이 뉴스·대한수영연맹·유튜브·USA Swimming Data Hub를 기간 기준·중복 없이 수집합니다.

**사진·영상 추가(수동)** — `capsules/<연도>/<이벤트>/media/`에 파일을 넣고,
`data/timeline.json` 해당 이벤트의 `media` 배열에 경로를 추가 → 커밋하면 사이트에 표시됩니다.

## 최초 1회 설정 (GitHub Pages)

저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정해야 첫 배포가 됩니다.

## SEO

정적 HTML 전체 출력(JS 불필요), 한/영 `hreflang`, `sitemap.xml`, `robots.txt`,
JSON-LD 구조화 데이터(Person·SportsEvent·BreadcrumbList) 적용 — 구글·AI 검색 모두 색인 가능합니다.

## ⚠️ 확인 필요

- 김지아 생년월일: 요청서에 2024-11-11로 기재되어 있으나 경력과 모순되어 **2014-11-11로 추정** 기재 (`data/athletes.json`).
- `verified: false`·"TBC" 표시 항목은 원본 캡처로 보완 예정 — `data/scrape-state.json`의 `search_backlog` 참조.
