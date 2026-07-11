# SWIM CAPSULE — 작업 가이드

김재이(Jaei Kim)·김지아(Jia Kim) 남매 수영선수의 기록을 영구 보관하는 타임캡슐 프로젝트.
목적: ① 기록 유실 방지(원본 보관) ② 시간순 히스토리 ③ 영문화(미국 대학 포트폴리오) ④ 사진첩 확장.

## 세션이 새로 시작되면 (이어하기)

1. `data/scrape-state.json` 읽기 — `pending_captures`(캡처 대기)와 `search_backlog`(조사 과제)가 남은 일 목록이다.
2. 수집 작업은 `.claude/skills/capsule-scrape/SKILL.md` 절차를 따른다. **항목 하나 완료할 때마다 상태 파일 갱신 + 커밋** (토큰 만료 대비).
3. 사이트 수정 후에는 반드시 `node scripts/build.mjs`로 빌드 확인.

## 불변 규칙

- `capsules/**/source.html` 은 원본 그대로 — 절대 수정 금지.
- 모든 기록은 `data/timeline.json`에 등록해야 사이트에 나온다 (스키마: 파일 상단 `$schema_note`).
- URL 중복 수집 금지 — `data/scrape-state.json`의 `captured_urls`가 기준.
- 유튜브는 다운로드하지 않고 경기 시작 초 `&t=<초>s` 링크만 기록.
- 확인 안 된 값은 추측하지 말고 `verified: false` / `"TBC"`로 표기.
- 이 원격 환경은 외부 사이트 직접 다운로드가 차단됨 — WebSearch로 내용 확인까지만 하고 원문 캡처는 `pending_captures`에 남겨 로컬 세션에서 처리.

## 빌드/배포

- 빌드: `node scripts/build.mjs` (의존성 없음, Node 20+). 출력 `dist/`(gitignore).
- 배포: main 푸시 → `.github/workflows/deploy.yml` → GitHub Pages.
- 페이지: `/`(ko), `/en/`, `/<연도>/`, `/en/<연도>/` + sitemap/robots/JSON-LD. 콘텐츠는 JS 없이 전부 HTML에 있어야 함(SEO).

## 알려진 미확인 사항

- 김지아 생년월일 2014-11-11은 추정치 (요청서의 2024-11-11은 오타로 보임) — 사용자 확인 필요.
- 2022 김재이 접영 3위 대회명, 2023 김지아 한국신기록 대회·기록, 소년체전 세부 타임 등은 `search_backlog` 참조.
